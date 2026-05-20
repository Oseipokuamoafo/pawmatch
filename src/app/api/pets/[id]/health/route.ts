import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cloudinary } from "@/lib/cloudinary";
import {
  createHealthRecordSchema,
  healthRecordTypeEnum,
} from "@/lib/validations/pet";

type Ctx = { params: Promise<{ id: string }> };

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

/* ─── GET /api/pets/[id]/health — list records ───────────────────────── */

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

  const records = await prisma.petHealth.findMany({
    where: { petId: id },
    orderBy: { recordDate: "desc" },
  });

  return NextResponse.json({ records });
}

/* ─── POST /api/pets/[id]/health — JSON OR multipart ─────────────────── */

export async function POST(req: Request, ctx: Ctx) {
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

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    return handleMultipart(req, id, session.user.id);
  }
  return handleJson(req, id);
}

/* ─── multipart path: upload file inline to Cloudinary ───────────────── */

async function handleMultipart(req: Request, petId: string, userId: string) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  // Validate text fields via the same Zod shape, then attach file URL after upload
  const baseFields = {
    type: form.get("type"),
    title: form.get("title"),
    recordDate: form.get("recordDate"),
    notes: form.get("notes") || undefined,
  };

  // Type may be one of the enum values
  const typeParse = healthRecordTypeEnum.safeParse(baseFields.type);
  if (!typeParse.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: { type: ["Invalid type"] } },
      { status: 400 }
    );
  }

  const parsed = createHealthRecordSchema.safeParse({
    type: typeParse.data,
    title: typeof baseFields.title === "string" ? baseFields.title : "",
    recordDate:
      typeof baseFields.recordDate === "string" ? baseFields.recordDate : "",
    notes:
      typeof baseFields.notes === "string" && baseFields.notes
        ? baseFields.notes
        : undefined,
    // fileUrl filled in after upload
    fileUrl: undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Optional file
  const file = form.get("file");
  let fileUrl: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 415 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large (max 10 MB)" },
        { status: 413 }
      );
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
      // `type: "authenticated"` keeps the asset out of the public delivery URL.
      // Folder convention isolates per user under the private health bucket.
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: `pawmatch/health/${userId}`,
        resource_type: "auto",
        type: "authenticated",
      });
      fileUrl = result.secure_url;
    } catch (err) {
      console.error("Cloudinary upload failed:", err);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  }

  const record = await prisma.petHealth.create({
    data: {
      petId,
      type: parsed.data.type,
      title: parsed.data.title,
      recordDate: new Date(parsed.data.recordDate),
      fileUrl,
      notes: parsed.data.notes || null,
      isVerified: false,
    },
  });

  return NextResponse.json({ record }, { status: 201 });
}

/* ─── JSON path: existing flow (upload-first via /api/upload) ────────── */

async function handleJson(req: Request, petId: string) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createHealthRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { type, title, recordDate, fileUrl, notes } = parsed.data;

  const record = await prisma.petHealth.create({
    data: {
      petId,
      type,
      title,
      recordDate: new Date(recordDate),
      fileUrl: fileUrl || null,
      notes: notes || null,
      isVerified: false,
    },
  });

  return NextResponse.json({ record }, { status: 201 });
}
