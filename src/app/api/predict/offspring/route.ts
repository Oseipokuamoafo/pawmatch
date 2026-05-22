import { NextResponse } from "next/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { streamOffspringProfile } from "@/lib/offspring-profile";
import { checkRateLimit, POLICIES, rateLimitHeaders } from "@/lib/rate-limit";

/**
 * POST /api/predict/offspring
 *
 * Streams a holistic offspring-profile prediction (coat, size,
 * temperament, training, health considerations) for the pair {petAId,
 * petBId}. Requires the caller to own petA (matching the existing
 * /predict route's ownership check).
 *
 * Returns a streaming text/plain response that the client renders
 * progressively. Final usage isn't returned in the body — it lands in
 * Sentry/logs via the `done` promise.
 */

const schema = z.object({
  petAId: z.string().min(1),
  petBId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = checkRateLimit(
    `predict-offspring:${session.user.id}`,
    POLICIES.AI_HEAVY,
  );
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: "Too many requests. Try again later.",
        retryAfterSeconds: Math.ceil(limit.retryAfterMs / 1000),
      },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { petAId, petBId } = parsed.data;
  if (petAId === petBId) {
    return NextResponse.json(
      { error: "Pick two different pets" },
      { status: 400 },
    );
  }

  const [petA, petB] = await Promise.all([
    prisma.pet.findUnique({
      where: { id: petAId },
      include: { traits: true, owner: { select: { id: true } } },
    }),
    prisma.pet.findUnique({
      where: { id: petBId },
      include: { traits: true, owner: { select: { id: true } } },
    }),
  ]);
  if (!petA || !petB) {
    return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  }
  if (petA.ownerId !== session.user.id) {
    return NextResponse.json(
      { error: "You can only predict crosses involving a pet you own" },
      { status: 403 },
    );
  }

  // Best-effort breed reference lookup for both pets.
  const [breedA, breedB] = await Promise.all([
    prisma.breed.findFirst({
      where: { name: { equals: petA.breed, mode: "insensitive" } },
      select: {
        name: true,
        group: true,
        averageCOI: true,
        commonRecessiveGenes: true,
        lifespanMinYears: true,
        lifespanMaxYears: true,
        temperament: true,
        weightKgMin: true,
        weightKgMax: true,
      },
    }),
    prisma.breed.findFirst({
      where: { name: { equals: petB.breed, mode: "insensitive" } },
      select: {
        name: true,
        group: true,
        averageCOI: true,
        commonRecessiveGenes: true,
        lifespanMinYears: true,
        lifespanMaxYears: true,
        temperament: true,
        weightKgMin: true,
        weightKgMax: true,
      },
    }),
  ]);

  try {
    const stream = await streamOffspringProfile(
      {
        pet: {
          name: petA.name,
          breed: petA.breed,
          sex: petA.sex,
          dateOfBirth: petA.dateOfBirth,
          color: petA.color,
          weight: petA.weight,
        },
        traits: petA.traits,
        breed: breedA,
      },
      {
        pet: {
          name: petB.name,
          breed: petB.breed,
          sex: petB.sex,
          dateOfBirth: petB.dateOfBirth,
          color: petB.color,
          weight: petB.weight,
        },
        traits: petB.traits,
        breed: breedB,
      },
    );

    // Fire-and-forget usage logging once the stream completes.
    stream.done
      .then(({ inputTokens, outputTokens }) => {
        console.log(
          `[offspring-profile] tokens — in:${inputTokens} out:${outputTokens}`,
        );
      })
      .catch((err) =>
        Sentry.captureException(err, {
          tags: { surface: "offspring-profile", petAId, petBId },
        }),
      );

    return new Response(stream.readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { surface: "offspring-profile", petAId, petBId },
    });
    const message = err instanceof Error ? err.message : "Prediction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
