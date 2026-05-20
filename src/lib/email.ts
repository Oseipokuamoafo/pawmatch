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
