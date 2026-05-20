import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMessageSchema } from "@/lib/validations/message";
import { encryptMessage, decryptMessage } from "@/lib/crypto";

type Ctx = { params: Promise<{ id: string }> };

/* ─── Authz: both participants of an ACCEPTED match can read/write ──── */

async function loadMatchForParticipant(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      status: true,
      initiatedById: true,
      receivedById: true,
    },
  });
  if (!match) return { error: "Not found", status: 404 as const };
  if (match.initiatedById !== userId && match.receivedById !== userId) {
    return { error: "Forbidden", status: 403 as const };
  }
  if (match.status !== "ACCEPTED") {
    return { error: "Match is not accepted yet", status: 409 as const };
  }
  return { ok: true as const, match };
}

/* ─── GET — list decrypted messages, mark inbound as read ───────────── */

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const check = await loadMatchForParticipant(id, session.user.id);
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const rows = await prisma.message.findMany({
    where: { matchId: id },
    orderBy: { createdAt: "asc" },
  });

  // Mark inbound as read in the background — don't block the response
  prisma.message
    .updateMany({
      where: {
        matchId: id,
        senderId: { not: session.user.id },
        isRead: false,
      },
      data: { isRead: true },
    })
    .catch(() => undefined);

  const messages = rows.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    isRead: m.isRead,
    createdAt: m.createdAt,
    content: safeDecrypt(m.encryptedContent, m.iv),
    isMine: m.senderId === session.user.id,
  }));

  return NextResponse.json({ messages });
}

/* ─── POST — encrypt + persist ──────────────────────────────────────── */

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const check = await loadMatchForParticipant(id, session.user.id);
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const { ciphertext, iv } = encryptMessage(parsed.data.content);
    const message = await prisma.message.create({
      data: {
        matchId: id,
        senderId: session.user.id,
        encryptedContent: ciphertext,
        iv,
      },
    });

    return NextResponse.json(
      {
        message: {
          id: message.id,
          senderId: message.senderId,
          isRead: message.isRead,
          createdAt: message.createdAt,
          content: parsed.data.content,
          isMine: true,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("ENCRYPTION_KEY")) {
      return NextResponse.json(
        { error: "Server misconfigured: encryption key not set" },
        { status: 500 }
      );
    }
    throw err;
  }
}

function safeDecrypt(ct: string, iv: string): string {
  try {
    return decryptMessage(ct, iv);
  } catch {
    return "[unable to decrypt]";
  }
}
