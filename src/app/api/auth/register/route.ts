import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { signUpSchema } from "@/lib/validations/auth";
import { sendVetApplicationReceived } from "@/lib/email";
import { inngest } from "@/lib/inngest";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, password, role, vetApplication } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // role=VET on sign-up is an *intent* — we store the user with a
  // placeholder role of OWNER until approval (auto or admin) flips them
  // to the real VET role. This keeps schema constraints clean (User.role
  // is the *effective* role; vetApplicationStatus tells the truth about
  // intent) and lets us reuse the existing approval flow unchanged.
  const persistedRole = role === "VET" ? "OWNER" : role;

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      role: persistedRole,
      // If the user supplied a vet application — either picked role=VET,
      // or ticked the OWNER/BREEDER add-on — persist the license metadata
      // and mark vetApplicationStatus=PENDING. AI auto-screen kicks off
      // below; admin can also act manually via /admin/vets.
      ...(vetApplication
        ? {
            vetApplicationStatus: "PENDING",
            vetLicenseNumber: vetApplication.licenseNumber,
            vetLicenseState: vetApplication.licenseState,
            vetPracticeName: vetApplication.practiceName,
            vetPracticeAddress: vetApplication.practiceAddress,
            vetPracticePhone: vetApplication.practicePhone,
            aiScreenStatus: "PENDING",
          }
        : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      vetApplicationStatus: true,
    },
  });

  // Dispatch the AI auto-screen via Inngest (step-level retries +
  // observability, replaces the previous fire-and-forget Promise).
  // The submission email stays inline — it's a short fire-and-forget
  // we can tolerate, and migrating every email to the queue is a
  // larger refactor we'll do separately. High-confidence matches
  // auto-promote the user to VET without waiting on a human admin.
  if (vetApplication) {
    void sendVetApplicationReceived({
      to: user.email,
      name: user.name,
      practiceName: vetApplication.practiceName,
      licenseState: vetApplication.licenseState,
    }).catch((err) => {
      console.error("[register] vet application email failed:", err);
    });
    await inngest.send({
      name: "vet/application.submitted",
      data: {
        userId: user.id,
        name,
        licenseNumber: vetApplication.licenseNumber,
        licenseState: vetApplication.licenseState,
        practiceName: vetApplication.practiceName,
        practiceAddress: vetApplication.practiceAddress,
      },
    });
  }

  return NextResponse.json({ user }, { status: 201 });
}
