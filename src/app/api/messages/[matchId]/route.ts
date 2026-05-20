import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptMessage } from "@/lib/crypto";
import { detectScam } from "@/lib/scam-detection";

type Ctx = { params: Promise<{ matchId: string }> };

/**
 * GET /api/messages/[matchId]?before=<messageId>&limit=50
 *
 * Returns up to `limit` messages (default 50, max 100) ordered by
 * createdAt ascending. When `before` is supplied, only messages older
 * than that message are returned — used for back-pagination as the
 * user scrolls up.
 */
export async function GET(req: Request, ctx: Ctx) {
  const { matchId } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, status: true, initiatedById: true, receivedById: true },
  });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (
    match.initiatedById !== session.user.id &&
    match.receivedById !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (match.status !== "ACCEPTED") {
    return NextResponse.json(
      { error: "Match is not accepted yet" },
      { status: 409 }
    );
  }

  const url = new URL(req.url);
  const before = url.searchParams.get("before") ?? undefined;
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("limit") ?? 50))
  );

  // Resolve `before` to a cursor timestamp for a stable comparison
  let cursorAt: Date | undefined;
  if (before) {
    const cursorMsg = await prisma.message.findUnique({
      where: { id: before },
      select: { id: true, matchId: true, createdAt: true },
    });
    if (cursorMsg && cursorMsg.matchId === matchId) {
      cursorAt = cursorMsg.createdAt;
    }
  }

  // Fetch newest N records older than cursor, then flip to ascending for UI
  const rows = await prisma.message.findMany({
    where: {
      matchId,
      ...(cursorAt ? { createdAt: { lt: cursorAt } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  rows.reverse();

  // Mark inbound as read (background)
  prisma.message
    .updateMany({
      where: {
        matchId,
        senderId: { not: session.user.id },
        isRead: false,
      },
      data: { isRead: true },
    })
    .catch(() => undefined);

  const messages = rows.map((m) => {
    const content = safeDecrypt(m.encryptedContent, m.iv);
    const scan = detectScam(content);
    return {
      id: m.id,
      matchId: m.matchId,
      senderId: m.senderId,
      content,
      isRead: m.isRead,
      createdAt: m.createdAt.toISOString(),
      flagged: content.startsWith("[FLAGGED] ") || scan.matches.length > 0,
      scamWarnings: scan.matches.map((s) => ({
        severity: s.severity,
        reason: s.reason,
      })),
    };
  });

  // hasMore: did we hit the limit? If yes, there could be older messages.
  const hasMore = rows.length === limit;

  return NextResponse.json({ messages, hasMore });
}

function safeDecrypt(ct: string, iv: string): string {
  try {
    return decryptMessage(ct, iv);
  } catch {
    return "[unable to decrypt]";
  }
}
