import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { auth } from "@/lib/auth";
import { seedDemoPetsForUser } from "@/lib/demo-seed";

/**
 * POST /api/demo/seed
 *
 * Creates the canonical demo pair (Luna GSD ♀ + Atlas APBT ♂) on the
 * currently signed-in user's account and returns a `predictUrl` they
 * can redirect to.
 *
 * Idempotent — if the user already has Luna + Atlas, returns the
 * existing ids (so refreshing the page or repeated clicks don't
 * duplicate pets).
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Sign in to add demo pets" },
      { status: 401 },
    );
  }

  try {
    const result = await seedDemoPetsForUser(session.user.id);
    return NextResponse.json(result);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { surface: "demo-seed", userId: session.user.id },
    });
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Couldn't seed the demo pets — try again in a moment",
      },
      { status: 500 },
    );
  }
}
