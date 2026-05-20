import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dnaImportSchema } from "@/lib/validations/dna";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/pets/[id]/dna-import
 *
 * Accepts a normalized DNA payload (parsed client-side from Embark / Wisdom
 * Panel JSON). Creates:
 *   - One PetHealth record (type DNA, isVerified true) summarizing the test
 *   - PetTrait[] for each breed component, health marker, and trait
 *
 * Health markers are stored as traits so the scoring engine can find them
 * (it greps trait names for known recessive keys: HUU/DM/PRCD/MDR1/…).
 */
export async function POST(req: Request, ctx: Ctx) {
  const { id: petId } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    select: { ownerId: true, name: true },
  });
  if (!pet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pet.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = dnaImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (
    data.breedComposition.length === 0 &&
    data.healthMarkers.length === 0 &&
    data.traits.length === 0
  ) {
    return NextResponse.json(
      { error: "Nothing to import — the file has no breed, health, or trait data." },
      { status: 400 }
    );
  }

  // Build trait records — one per breed, marker, and explicit trait
  const breedTraits = data.breedComposition.map((b) => ({
    petId,
    traitName: `Breed: ${b.name}`,
    traitValue: `${b.percent.toFixed(1)}%`,
    source: "DNA_VERIFIED" as const,
  }));

  const markerTraits = data.healthMarkers.map((m) => ({
    petId,
    traitName: `${m.name} (health)`,
    traitValue: m.status,
    source: "DNA_VERIFIED" as const,
  }));

  const plainTraits = data.traits.map((t) => ({
    petId,
    traitName: t.name,
    traitValue: t.value,
    source: "DNA_VERIFIED" as const,
  }));

  const allTraits = [...breedTraits, ...markerTraits, ...plainTraits];

  // Compose a short, useful notes block on the PetHealth record
  const summaryLines: string[] = [];
  if (data.coi != null) summaryLines.push(`COI ${data.coi.toFixed(1)}%`);
  if (data.breedComposition.length > 0) {
    const top = data.breedComposition
      .slice()
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 3)
      .map((b) => `${b.name} ${Math.round(b.percent)}%`)
      .join(" · ");
    summaryLines.push(`Top breeds: ${top}`);
  }
  if (data.healthMarkers.length > 0) {
    const flagged = data.healthMarkers.filter(
      (m) => !/^clear|normal$/i.test(m.status.trim())
    );
    if (flagged.length > 0) {
      summaryLines.push(
        `${flagged.length} of ${data.healthMarkers.length} markers non-clear`
      );
    } else {
      summaryLines.push(`All ${data.healthMarkers.length} markers clear`);
    }
  }

  const recordDate = data.testedOn ? new Date(data.testedOn) : new Date();

  const [healthRecord, traitsResult] = await prisma.$transaction([
    prisma.petHealth.create({
      data: {
        petId,
        type: "DNA",
        title: `DNA Test — ${data.provider}`,
        recordDate,
        notes: summaryLines.join(" · ") || null,
        isVerified: true,
        verifiedBy: data.provider,
        verifiedAt: new Date(),
      },
    }),
    prisma.petTrait.createMany({
      data: allTraits,
      skipDuplicates: false,
    }),
  ]);

  return NextResponse.json(
    {
      summary: {
        provider: data.provider,
        breedCount: data.breedComposition.length,
        markerCount: data.healthMarkers.length,
        traitCount: data.traits.length,
        traitsCreated: traitsResult.count,
        coi: data.coi ?? null,
        healthRecordId: healthRecord.id,
      },
    },
    { status: 201 }
  );
}
