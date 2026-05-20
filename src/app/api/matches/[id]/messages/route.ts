import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMessageSchema } from "@/lib/validations/message";
import { encryptMessage, decryptMessage } from "@/lib/crypto";
import { detectScam } from "@/lib/scam-detection";
import { emitMessageNew } from "@/lib/socket-io";

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

/* ─── GET — list decrypted messages with scam annotations ───────────── */

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

  const messages = rows.map((m) => {
    const content = safeDecrypt(m.encryptedContent, m.iv);
    const scam = detectScam(content);
    // Show all matches (hard + soft) to both readers — only hard matches
    // are rejected at write-time, so anything persisted here is soft.
    return {
      id: m.id,
      senderId: m.senderId,
      isRead: m.isRead,
      createdAt: m.createdAt,
      content,
      isMine: m.senderId === session.user.id,
      scamWarnings: scam.matches.map((x) => ({
        severity: x.severity,
        reason: x.reason,
      })),
    };
  });

  return NextResponse.json({ messages });
}

/* ─── POST — scam-check, encrypt, persist, broadcast ─────────────────── */

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

  // Hard scam check — refuse the message before it touches the DB
  const scan = detectScam(parsed.data.content);
  if (scan.blocked) {
    const reasons = scan.matches
      .filter((m) => m.severity === "hard")
      .map((m) => m.reason);
    return NextResponse.json(
      {
        error:
          "This message looks unsafe and wasn't sent. PawMatch blocks payment-rail and crypto-wallet language to protect both sides.",
        reasons,
        blocked: true,
      },
      { status: 422 }
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

    // Ping listeners. Payload carries no decrypted content — clients
    // refetch the thread via GET above where auth + decryption happens.
    emitMessageNew({
      matchId: id,
      messageId: message.id,
      senderId: message.senderId,
      at: message.createdAt,
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
          scamWarnings: scan.matches.map((x) => ({
            severity: x.severity,
            reason: x.reason,
          })),
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
