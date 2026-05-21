import { NextResponse } from "next/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasProPlusAccess } from "@/lib/billing";
import { summarizeHeat } from "@/lib/heat";
import {
  buildSystemPrompt,
  streamAssistantReply,
  MAX_THREAD_TURNS,
  MAX_USER_MESSAGE_CHARS,
  type ChatTurn,
  type PetContextInput,
} from "@/lib/breeding-assistant";

type Ctx = { params: Promise<{ id: string }> };

const sendSchema = z.object({
  message: z.string().min(1).max(MAX_USER_MESSAGE_CHARS),
});

/* ─── GET — load chat history ────────────────────────────────────────── */

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pet = await prisma.pet.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!pet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pet.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const chat = await prisma.breedingChat.findUnique({
    where: { petId: id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json({
    turnCount: chat?.turnCount ?? 0,
    maxTurns: MAX_THREAD_TURNS,
    messages:
      chat?.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })) ?? [],
  });
}

/* ─── DELETE — clear history ─────────────────────────────────────────── */

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pet = await prisma.pet.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!pet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pet.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.breedingChat.deleteMany({ where: { petId: id } });
  return NextResponse.json({ ok: true });
}

/* ─── POST — send a message, stream the reply ────────────────────────── */

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await hasProPlusAccess(session.user.id))) {
    return NextResponse.json(
      { error: "Breeding assistant is a Pro+ feature." },
      { status: 402 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Auth + ownership + load all the context in one round-trip
  const pet = await prisma.pet.findUnique({
    where: { id },
    include: {
      healthRecords: {
        orderBy: { recordDate: "desc" },
        select: {
          type: true,
          title: true,
          recordDate: true,
          isVerified: true,
          verifiedByVetId: true,
          notes: true,
        },
      },
      traits: { select: { traitName: true, traitValue: true, source: true } },
      breedingGoals: {
        select: {
          desiredTraits: true,
          preferredBreeds: true,
          maxCOI: true,
          notes: true,
        },
      },
      // Heat cycles only matter for FEMALE pets — but we still fetch
      // (cheap, indexed) so the system-prompt logic stays consistent.
      heatCycles: {
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          peakFertilityStart: true,
          peakFertilityEnd: true,
          notes: true,
        },
      },
    },
  });
  if (!pet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pet.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Look up the breed reference row (best-effort match by name)
  const breed = await prisma.breed.findFirst({
    where: { name: { equals: pet.breed, mode: "insensitive" } },
    select: {
      name: true,
      group: true,
      averageCOI: true,
      commonRecessiveGenes: true,
      lifespanMinYears: true,
      lifespanMaxYears: true,
      temperament: true,
    },
  });

  // Existing chat + thread limit enforcement
  const chat = await prisma.breedingChat.upsert({
    where: { petId: id },
    create: { petId: id },
    update: {},
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (chat.turnCount >= MAX_THREAD_TURNS) {
    return NextResponse.json(
      {
        error: `Thread limit reached (${MAX_THREAD_TURNS} turns). Clear the chat to start a new one.`,
      },
      { status: 429 },
    );
  }

  const history: ChatTurn[] = chat.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Summarize heat cycles only for FEMALE pets — saves a few cycles and
  // keeps the prompt builder's "this section applies" check unambiguous.
  const heatSummary =
    pet.sex === "FEMALE" && pet.heatCycles.length > 0
      ? summarizeHeat(pet.heatCycles, pet.species)
      : null;

  const petCtx: PetContextInput = {
    pet: {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      sex: pet.sex,
      dateOfBirth: pet.dateOfBirth,
      color: pet.color,
      weight: pet.weight,
      bio: pet.bio,
    },
    healthRecords: pet.healthRecords,
    traits: pet.traits,
    breedingGoals: pet.breedingGoals,
    breed,
    heatCycles: pet.heatCycles,
    heatSummary,
  };

  const systemPrompt = buildSystemPrompt(petCtx);

  let stream;
  try {
    stream = await streamAssistantReply({
      systemPrompt,
      history,
      userMessage: parsed.data.message,
    });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { surface: "breeding-assistant", petId: id },
    });
    const message = err instanceof Error ? err.message : "Assistant failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Persist the user turn immediately so a dropped stream doesn't lose it.
  await prisma.breedingChatMessage.create({
    data: { chatId: chat.id, role: "user", content: parsed.data.message },
  });

  // After the stream completes, persist the assistant turn + bump usage.
  stream.done
    .then(async ({ text, inputTokens, outputTokens }) => {
      await prisma.$transaction([
        prisma.breedingChatMessage.create({
          data: { chatId: chat.id, role: "assistant", content: text },
        }),
        prisma.breedingChat.update({
          where: { id: chat.id },
          data: {
            turnCount: { increment: 1 },
            inputTokens: { increment: inputTokens },
            outputTokens: { increment: outputTokens },
          },
        }),
      ]);
    })
    .catch((err) => {
      console.error("[breeding-assistant] failed to persist reply:", err);
    });

  return new Response(stream.readableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
