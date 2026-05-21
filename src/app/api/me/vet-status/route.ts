import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/me/vet-status
 *
 * Lightweight polling endpoint for the vet-application pending dashboard.
 * Returns just the fields the takeover UI needs to render its progress
 * indicator + decide whether to refresh the page. Never exposes the AI
 * verdict's reason/evidence — that's admin-only signal.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      vetApplicationStatus: true,
      aiScreenStatus: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    role: user.role,
    vetApplicationStatus: user.vetApplicationStatus,
    aiScreenStatus: user.aiScreenStatus,
  });
}
