import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { Match, Pet, User } from "@/generated/prisma";

/* ─── Templates ──────────────────────────────────────────────────────── */

export type ContractTemplate =
  | "STANDARD_BREEDING"
  | "STUD_SERVICE"
  | "PUPPY_PLACEMENT";

export const CONTRACT_TEMPLATES: Record<
  ContractTemplate,
  { label: string; copy: string }
> = {
  STANDARD_BREEDING: {
    label: "Standard breeding agreement",
    copy: "Mutual breeding terms for a one-time pairing between two verified pets.",
  },
  STUD_SERVICE: {
    label: "Stud service contract",
    copy: "Stud fee, repeat-breed clause, and live-litter guarantee.",
  },
  PUPPY_PLACEMENT: {
    label: "Puppy / kitten placement",
    copy: "Pricing, health guarantees, and return-to-breeder clauses.",
  },
};

/* ─── Source content ─────────────────────────────────────────────────── */

export interface ContractContext {
  template: ContractTemplate;
  match: Match;
  petA: Pet;
  petB: Pet;
  ownerA: Pick<User, "id" | "name" | "email">;
  ownerB: Pick<User, "id" | "name" | "email">;
}

/**
 * Builds a plain-text contract body. Stored verbatim on Contract.content
 * for the audit trail; the PDF renderer below uses the same text.
 *
 * Reads like a lawyer-with-a-heart wrote it: short clauses, plain English,
 * placeholder-marked spots for hand-edits before signing.
 */
export function buildContractContent(ctx: ContractContext): string {
  const today = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const tpl = CONTRACT_TEMPLATES[ctx.template].label;
  const aLabel = `${ctx.petA.name} (${ctx.petA.breed}, ${ctx.petA.sex.toLowerCase()})`;
  const bLabel = `${ctx.petB.name} (${ctx.petB.breed}, ${ctx.petB.sex.toLowerCase()})`;
  const ownerAName = ctx.ownerA.name ?? ctx.ownerA.email;
  const ownerBName = ctx.ownerB.name ?? ctx.ownerB.email;

  const clauses = templateClauses(ctx.template);

  return [
    `PawMatch — ${tpl}`,
    "",
    `Effective date: ${today}`,
    `Match ID: ${ctx.match.id}`,
    "",
    `Party A: ${ownerAName} (owner of ${aLabel})`,
    `Party B: ${ownerBName} (owner of ${bLabel})`,
    "",
    "1. Purpose",
    "   Both parties agree to the breeding arrangement described below in",
    "   good faith, prioritising the welfare of the animals involved.",
    "",
    ...clauses.map((line, i) =>
      i === 0 ? `${line}` : line.startsWith(" ") ? line : `   ${line}`
    ),
    "",
    "8. Signatures",
    "   Both parties accept these terms by countersigning in-app on PawMatch.",
    "   This agreement is binding once both sides have signed.",
    "",
    "   ___________________________     ___________________________",
    `   ${ownerAName.padEnd(28)}    ${ownerBName}`,
    `   Date: ____________            Date: ____________`,
    "",
    "Notes",
    "   Edits or addenda may be agreed in writing and attached to this",
    "   document. Disputes will be mediated through PawMatch's trust team",
    "   in line with the community standards.",
  ].join("\n");
}

function templateClauses(template: ContractTemplate): string[] {
  switch (template) {
    case "STANDARD_BREEDING":
      return [
        "2. Pairing",
        "   The named pets above will be paired one time for the purpose of",
        "   producing a single litter. Any subsequent pairings require a new",
        "   agreement.",
        "",
        "3. Health and welfare",
        "   Each party warrants their pet is in good health, up to date on",
        "   vaccinations, and free of any communicable disease at the time of",
        "   pairing. Verified DNA records on file at PawMatch are deemed part",
        "   of this agreement.",
        "",
        "4. Costs",
        "   Stud / breeding fee: $____________",
        "   Splitting of vet costs (e.g. progesterone, ultrasounds): ________",
        "   Travel / boarding arrangements: ________________________________",
        "",
        "5. Litter division",
        "   Pick-of-litter / split / formula: _____________________________",
        "",
        "6. Failure to conceive",
        "   If no live birth occurs within ____ months, the parties may",
        "   repeat at no additional fee, or refund the breeding fee in full,",
        "   at the choice of the female's owner.",
        "",
        "7. Welfare commitment",
        "   Both parties commit to lifelong responsibility for the resulting",
        "   animals and agree not to surrender any to commercial resellers.",
      ];
    case "STUD_SERVICE":
      return [
        "2. Stud service",
        "   The stud (Party A) will be made available for ____ live breedings",
        "   within a window of ____ days from the date of first introduction.",
        "",
        "3. Stud fee",
        "   Fee: $____________ payable on confirmation of pregnancy.",
        "   A non-refundable booking deposit of $______ secures the dates.",
        "",
        "4. Live-litter guarantee",
        "   If fewer than ____ live puppies / kittens are produced, Party A",
        "   agrees to a repeat breeding at no additional fee at the next viable",
        "   cycle.",
        "",
        "5. Health representations",
        "   Party A warrants the stud is current on vaccinations and free of",
        "   communicable disease. Verified DNA records on file are part of",
        "   this agreement.",
        "",
        "6. Discretion and exclusivity",
        "   Party A reserves the right to refuse service if the receiving",
        "   pet appears unfit on the day. No exclusivity is implied.",
        "",
        "7. Naming and registration",
        "   Litter registration arrangements: ______________________________",
      ];
    case "PUPPY_PLACEMENT":
      return [
        "2. Placement",
        "   The breeder (Party A) places one ${animal} from the litter with",
        "   the buyer (Party B). Selection by: ________ on ________.",
        "",
        "3. Purchase price",
        "   Price: $____________ payable on pickup.",
        "   Non-refundable deposit: $______",
        "",
        "4. Health guarantee",
        "   Party A guarantees the animal is healthy at the time of placement",
        "   and provides initial vaccination and worming records. A 7-day vet",
        "   check by Party B is encouraged.",
        "",
        "5. Spay / neuter clause",
        "   Buyer agrees to spay / neuter by ____ months of age unless an",
        "   explicit breeding addendum is attached.",
        "",
        "6. Return-to-breeder",
        "   If Party B is ever unable to keep the animal, Party A has right",
        "   of first refusal at no charge. Re-homing through third parties or",
        "   commercial sellers is prohibited.",
        "",
        "7. Conditions of placement",
        "   Living arrangements / disclosures: _____________________________",
      ];
  }
}

/* ─── PDF renderer ───────────────────────────────────────────────────── */

const MARGIN_X = 56;
const MARGIN_Y = 72;
const TERRA = rgb(201 / 255, 75 / 255, 42 / 255);
const DARK = rgb(28 / 255, 16 / 255, 8 / 255);
const MUTED = rgb(0.36, 0.27, 0.18);

/**
 * Generate a branded PDF for the contract. Returns the raw bytes so callers
 * can stream as `application/pdf` or upload to Cloudinary.
 */
export async function renderContractPdf(
  ctx: ContractContext,
  content: string
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`PawMatch — ${CONTRACT_TEMPLATES[ctx.template].label}`);
  pdf.setAuthor("PawMatch");
  pdf.setCreator("PawMatch (pdf-lib)");

  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  const pageSize: [number, number] = [612, 792]; // US Letter
  let page = pdf.addPage(pageSize);
  let y = pageSize[1] - MARGIN_Y;

  // ── Header band ────────────────────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: pageSize[1] - 56,
    width: pageSize[0],
    height: 56,
    color: TERRA,
  });
  page.drawText("PawMatch", {
    x: MARGIN_X,
    y: pageSize[1] - 36,
    size: 22,
    font: serifBold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Breeding agreement", {
    x: pageSize[0] - MARGIN_X - 130,
    y: pageSize[1] - 30,
    size: 9,
    font: serif,
    color: rgb(1, 1, 1),
  });
  y = pageSize[1] - 90;

  // ── Body ──────────────────────────────────────────────────────────
  const lines = content.split("\n");
  const lineHeight = 13;
  const wrapWidth = pageSize[0] - MARGIN_X * 2;

  for (const raw of lines) {
    // New-page check
    if (y < MARGIN_Y) {
      page = pdf.addPage(pageSize);
      y = pageSize[1] - MARGIN_Y;
    }

    const { font, size, color, indent } = styleFor(raw, serif, serifBold, mono);
    const wrapped = wrapLines(raw.trimStart(), font, size, wrapWidth - indent);
    for (const w of wrapped) {
      if (y < MARGIN_Y) {
        page = pdf.addPage(pageSize);
        y = pageSize[1] - MARGIN_Y;
      }
      page.drawText(w, {
        x: MARGIN_X + indent,
        y,
        size,
        font,
        color,
      });
      y -= lineHeight;
    }
  }

  // ── Footer on every page ──────────────────────────────────────────
  // Two-line footer: page identifier on top, legal disclaimer below.
  // The disclaimer protects against unauthorized-practice-of-law
  // claims — these templates are starting points, not legal advice.
  const pageCount = pdf.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const p: PDFPage = pdf.getPage(i);
    p.drawText(
      `PawMatch · Match ${ctx.match.id.slice(0, 8)} · Page ${i + 1} of ${pageCount}`,
      {
        x: MARGIN_X,
        y: 44,
        size: 8,
        font: serif,
        color: MUTED,
      }
    );
    p.drawText(
      "Template only. Not legal advice. PawMatch is not a law firm. Have a licensed attorney in your jurisdiction review before signing.",
      {
        x: MARGIN_X,
        y: 30,
        size: 7,
        font: serif,
        color: MUTED,
      }
    );
  }

  return pdf.save();
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

function styleFor(
  line: string,
  serif: PDFFont,
  serifBold: PDFFont,
  mono: PDFFont
): { font: PDFFont; size: number; color: ReturnType<typeof rgb>; indent: number } {
  const stripped = line.trimStart();

  // Title (first non-indented line, contains em-dash)
  if (/^PawMatch — /.test(stripped)) {
    return { font: serifBold, size: 18, color: DARK, indent: 0 };
  }
  // Numbered section heading "1. Purpose"
  if (/^\d+\. [A-Z]/.test(stripped)) {
    return { font: serifBold, size: 12, color: TERRA, indent: 0 };
  }
  // Signature underscore lines + dotted blanks — render in monospace
  if (/_{6,}/.test(stripped) || /…+/.test(stripped)) {
    return { font: mono, size: 10, color: DARK, indent: line.length - stripped.length };
  }
  // Notes header, parties label
  if (/^(Notes|Party [AB]:|Effective date:|Match ID:)/.test(stripped)) {
    return { font: serifBold, size: 10, color: DARK, indent: 0 };
  }
  // Default body
  return {
    font: serif,
    size: 10.5,
    color: DARK,
    indent: line.length - stripped.length,
  };
}

function wrapLines(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  if (text.length === 0) return [""];
  const words = text.split(/\s+/);
  const out: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
      out.push(current);
      current = w;
    } else {
      current = next;
    }
  }
  if (current) out.push(current);
  return out;
}
