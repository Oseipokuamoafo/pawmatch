import { Resend } from "resend";

/**
 * Branded email helper. Lazily constructs a Resend client; if the API key is
 * missing or a placeholder we skip the send and log a notice so dev flows
 * don't fall over.
 */

const FROM = "PawMatch <noreply@pawmatch.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3142";

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith("re_your_") || key.startsWith("placeholder")) {
    return null;
  }
  return new Resend(key);
}

export async function sendVerificationApproved(opts: {
  to: string;
  name: string | null;
}) {
  const resend = getClient();
  const subject = "You're a verified breeder on PawMatch";
  const html = brandedTemplate({
    eyebrow: "Approved",
    headline: "You're verified.",
    body: `<p>Hi ${escape(opts.name ?? "there")},</p>
      <p>Your breeder credentials are confirmed. Your profile now carries the
      <strong style="color:#1D9E75">Verified Breeder</strong> badge across PawMatch,
      and every pet you list inherits that trust signal.</p>
      <p>Owners looking for responsible matches see you first.</p>`,
    ctaLabel: "Open your dashboard",
    ctaHref: `${APP_URL}/dashboard`,
  });
  await safeSend({ to: opts.to, subject, html });
}

export async function sendMatchRequestReceived(opts: {
  to: string;
  recipientName: string | null;
  initiatorPetName: string;
  recipientPetName: string;
  score: number;
  matchId: string;
}) {
  const subject = `Someone wants to match with ${opts.recipientPetName}!`;
  const html = brandedTemplate({
    eyebrow: "Match request",
    headline: `${escape(opts.initiatorPetName)} → ${escape(opts.recipientPetName)}`,
    body: `<p>Hi ${escape(opts.recipientName ?? "there")},</p>
      <p>You have a new match request from <strong>${escape(opts.initiatorPetName)}</strong>.</p>
      <p style="font-family:Georgia,serif;font-size:42px;font-weight:900;color:#C94B2A;margin:18px 0 0">
        ${opts.score}
        <span style="font-family:-apple-system;font-size:13px;font-weight:600;color:#3D2A1A">/100 compatibility</span>
      </p>
      <p>Tap below to review the score breakdown — traits, health, COI, proximity —
      and accept or decline.</p>`,
    ctaLabel: "Review request",
    ctaHref: `${APP_URL}/matches?tab=received`,
  });
  await safeSend({ to: opts.to, subject, html });
}

export async function sendMatchAccepted(opts: {
  to: string;
  initiatorName: string | null;
  initiatorPetName: string;
  recipientPetName: string;
  matchId: string;
}) {
  const subject = `Your match with ${opts.recipientPetName} is on!`;
  const html = brandedTemplate({
    eyebrow: "Match accepted",
    headline: `It's a match.`,
    body: `<p>Hi ${escape(opts.initiatorName ?? "there")},</p>
      <p><strong>${escape(opts.recipientPetName)}</strong>'s owner accepted your request
      for <strong>${escape(opts.initiatorPetName)}</strong>. You can now start an
      encrypted conversation to coordinate next steps.</p>`,
    ctaLabel: "Open chat",
    ctaHref: `${APP_URL}/messages/${opts.matchId}`,
  });
  await safeSend({ to: opts.to, subject, html });
}

export async function sendReportThresholdAlert(opts: {
  to: string;
  targetLabel: string;
  reason: string;
  reportCount: number;
}) {
  const subject = `[Trust] ${opts.targetLabel} has ${opts.reportCount} open reports`;
  const html = brandedTemplate({
    eyebrow: "Trust · threshold reached",
    headline: `Review ${escape(opts.targetLabel)}.`,
    body: `<p>This target has crossed the <strong>${opts.reportCount}</strong>-report
      threshold and needs human review.</p>
      <p>Latest reported reason: <strong>${escape(opts.reason)}</strong>.</p>`,
    ctaLabel: "Open report queue",
    ctaHref: `${APP_URL}/admin/reports`,
  });
  await safeSend({ to: opts.to, subject, html });
}

export async function sendVerificationRejected(opts: {
  to: string;
  name: string | null;
  notes?: string | null;
}) {
  const resend = getClient();
  const subject = "An update on your PawMatch breeder application";
  const reason = opts.notes?.trim()
    ? `<div style="margin:24px 0;padding:16px 18px;border-radius:14px;background:#FDF5F1;border:1px solid rgba(201,75,42,0.15);color:#3D2A1A">
         <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;color:#C94B2A">Reviewer notes</p>
         <p style="margin:0;line-height:1.6">${escape(opts.notes!.trim())}</p>
       </div>`
    : "";
  const html = brandedTemplate({
    eyebrow: "Not approved",
    headline: "We need a bit more.",
    body: `<p>Hi ${escape(opts.name ?? "there")},</p>
      <p>Your application wasn't approved this time. You're welcome to reapply
      once the items below are addressed.</p>
      ${reason}
      <p>Common reasons include missing kennel-club or AKC documents, expired
      vet references, or photos we couldn't verify.</p>`,
    ctaLabel: "Reapply now",
    ctaHref: `${APP_URL}/dashboard/verify`,
  });
  await safeSend({ to: opts.to, subject, html });

  // (silence the unused 'resend' var lint when API key is missing)
  void resend;
}

/* ─── Vet network ────────────────────────────────────────────────────── */

export async function sendVetApplicationApproved(opts: {
  to: string;
  name: string | null;
  practiceName: string | null;
}) {
  const subject = "You're a verified vet on PawMatch";
  const html = brandedTemplate({
    eyebrow: "Approved",
    headline: "Welcome to the vet network.",
    body: `<p>Hi Dr. ${escape(opts.name ?? "there")},</p>
      <p>Your veterinary license has been verified${
        opts.practiceName ? ` for ${escape(opts.practiceName)}` : ""
      }. Your account now carries the VET role — owners can request your
      signature on their pets&apos; health records, and your co-signature
      is what graduates a self-reported record to verified.</p>
      <p>Head to your dashboard to see incoming verification requests.</p>`,
    ctaLabel: "Open vet dashboard",
    ctaHref: `${APP_URL}/dashboard`,
  });
  await safeSend({ to: opts.to, subject, html });
}

export async function sendVetApplicationRejected(opts: {
  to: string;
  name: string | null;
  notes?: string | null;
}) {
  const subject = "An update on your PawMatch vet application";
  const reason = opts.notes?.trim()
    ? `<div style="margin:24px 0;padding:16px 18px;border-radius:14px;background:#FDF5F1;border:1px solid rgba(201,75,42,0.15);color:#3D2A1A">
         <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;color:#C94B2A">Reviewer notes</p>
         <p style="margin:0;line-height:1.6">${escape(opts.notes!.trim())}</p>
       </div>`
    : "";
  const html = brandedTemplate({
    eyebrow: "Not approved",
    headline: "We can't verify your license yet.",
    body: `<p>Hi ${escape(opts.name ?? "there")},</p>
      <p>Your vet application wasn't approved this time. You can update your
      practice details from your account settings and request another review.</p>
      ${reason}`,
    ctaLabel: "Update details",
    ctaHref: `${APP_URL}/dashboard`,
  });
  await safeSend({ to: opts.to, subject, html });
}

/* ─── Vet co-sign flow ──────────────────────────────────────────────── */

export async function sendVetCosignRequested(opts: {
  to: string;
  vetName: string | null;
  ownerName: string | null;
  petName: string;
  recordTitle: string;
  recordType: string;
}) {
  const subject = `Co-sign request: ${opts.petName}'s ${opts.recordTitle}`;
  const html = brandedTemplate({
    eyebrow: "Co-sign request",
    headline: `${escape(opts.ownerName ?? "An owner")} needs your signature.`,
    body: `<p>Hi Dr. ${escape(opts.vetName ?? "there")},</p>
      <p><strong>${escape(opts.ownerName ?? "An owner")}</strong> asked you to
      co-sign a <strong>${escape(opts.recordType.toLowerCase())}</strong>
      record for their pet <strong>${escape(opts.petName)}</strong>:</p>
      <p style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#1C1008;margin:18px 0 4px">
        ${escape(opts.recordTitle)}
      </p>
      <p style="margin:0;color:#3D2A1A">Open your vet inbox to review the
      record, sign it, or decline with a note.</p>`,
    ctaLabel: "Open vet inbox",
    ctaHref: `${APP_URL}/dashboard/vet`,
  });
  await safeSend({ to: opts.to, subject, html });
}

export async function sendVetCosignSigned(opts: {
  to: string;
  ownerName: string | null;
  vetName: string | null;
  practiceName: string | null;
  petName: string;
  recordTitle: string;
  petId: string;
}) {
  const subject = `Dr. ${opts.vetName ?? "your vet"} signed ${opts.petName}'s record`;
  const html = brandedTemplate({
    eyebrow: "Record verified",
    headline: `${escape(opts.recordTitle)} is now verified.`,
    body: `<p>Hi ${escape(opts.ownerName ?? "there")},</p>
      <p>Dr. <strong>${escape(opts.vetName ?? "your vet")}</strong>${
        opts.practiceName
          ? ` of <strong>${escape(opts.practiceName)}</strong>`
          : ""
      } co-signed <strong>${escape(opts.petName)}</strong>'s record
      <em>${escape(opts.recordTitle)}</em>. It now carries the verified badge
      across PawMatch — matches see a stronger health score and a real vet
      attached to the record.</p>`,
    ctaLabel: "See the record",
    ctaHref: `${APP_URL}/dashboard/pets/${opts.petId}/health`,
  });
  await safeSend({ to: opts.to, subject, html });
}

export async function sendVetCosignDeclined(opts: {
  to: string;
  ownerName: string | null;
  vetName: string | null;
  petName: string;
  recordTitle: string;
  notes?: string | null;
  petId: string;
}) {
  const subject = `Co-sign declined for ${opts.petName}'s ${opts.recordTitle}`;
  const reason = opts.notes?.trim()
    ? `<div style="margin:24px 0;padding:16px 18px;border-radius:14px;background:#FDF5F1;border:1px solid rgba(201,75,42,0.15);color:#3D2A1A">
         <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;color:#C94B2A">Vet notes</p>
         <p style="margin:0;line-height:1.6">${escape(opts.notes!.trim())}</p>
       </div>`
    : "";
  const html = brandedTemplate({
    eyebrow: "Co-sign declined",
    headline: `Dr. ${escape(opts.vetName ?? "your vet")} couldn't sign this record.`,
    body: `<p>Hi ${escape(opts.ownerName ?? "there")},</p>
      <p>The co-sign request for <strong>${escape(opts.petName)}</strong>'s
      record <em>${escape(opts.recordTitle)}</em> was declined. You can pick
      another vet or upload additional documentation and try again.</p>
      ${reason}`,
    ctaLabel: "Update record",
    ctaHref: `${APP_URL}/dashboard/pets/${opts.petId}/health`,
  });
  await safeSend({ to: opts.to, subject, html });
}

/* ─── Internals ──────────────────────────────────────────────────────── */

async function safeSend({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getClient();
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not configured — skipping "${subject}" to ${to}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("[email] Resend send failed:", err);
  }
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function brandedTemplate(opts: {
  eyebrow: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#F5EFE6;font-family:-apple-system,'Helvetica Neue',sans-serif;color:#1C1008">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE6;padding:24px 16px">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(28,16,8,0.08)">
          <tr><td style="background:#C94B2A;padding:24px 28px">
            <p style="margin:0;font-family:Georgia,serif;font-weight:900;font-size:24px;color:#FFFFFF;letter-spacing:-0.4px">PawMatch</p>
          </td></tr>
          <tr><td style="padding:32px 32px 28px">
            <p style="margin:0;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;color:#C94B2A">${opts.eyebrow}</p>
            <h1 style="margin:14px 0 0;font-family:Georgia,serif;font-weight:900;font-size:32px;line-height:1.1;color:#1C1008">${opts.headline}</h1>
            <div style="margin-top:18px;font-size:15px;line-height:1.7;color:#3D2A1A">${opts.body}</div>
            <p style="margin:28px 0 0">
              <a href="${opts.ctaHref}" style="display:inline-block;background:#C94B2A;color:#FFFFFF;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:9999px;font-size:14px">${opts.ctaLabel}</a>
            </p>
          </td></tr>
          <tr><td style="padding:16px 32px 28px;border-top:1px solid #E8D5B7">
            <p style="margin:0;font-size:11px;color:#3D2A1A;letter-spacing:0.5px">PawMatch · responsible breeding, verified by people who love animals.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
