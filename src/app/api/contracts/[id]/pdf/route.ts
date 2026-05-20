import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  renderContractPdf,
  type ContractTemplate,
} from "@/lib/contracts";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/contracts/[id]/pdf
 *
 * Streams the PDF for a contract. Only the two match participants can
 * download. Regenerates on every hit (cheap; pdf-lib is fast) so any
 * field edits made via PATCH propagate immediately to the download.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Unauthorized", 401);
  }

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      match: {
        include: {
          petA: true,
          petB: true,
          initiatedBy: { select: { id: true, name: true, email: true } },
          receivedBy: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  if (!contract) return jsonError("Not found", 404);
  if (
    contract.match.initiatedById !== session.user.id &&
    contract.match.receivedById !== session.user.id
  ) {
    return jsonError("Forbidden", 403);
  }

  const bytes = await renderContractPdf(
    {
      template: contract.templateType as ContractTemplate,
      match: contract.match,
      petA: contract.match.petA,
      petB: contract.match.petB,
      ownerA: contract.match.initiatedBy,
      ownerB: contract.match.receivedBy,
    },
    contract.content
  );

  const filename = `pawmatch-contract-${contract.id.slice(0, 8)}.pdf`;
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
