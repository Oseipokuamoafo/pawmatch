"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/toast/ToastProvider";

export function MatchActions({ matchId }: { matchId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [submitting, setSubmitting] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(status: "ACCEPTED" | "REJECTED") {
    setSubmitting(status === "ACCEPTED" ? "accept" : "reject");
    setError(null);
    const res = await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSubmitting(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not update match");
      toast.error("Couldn't update match", data.error ?? undefined);
      return;
    }
    if (status === "ACCEPTED") {
      toast.success("Match accepted", "You can now chat with the other owner.");
    } else {
      toast.info("Match declined");
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => update("ACCEPTED")}
          disabled={submitting !== null}
          className="btn-primary !px-4 !py-2 !text-sm"
        >
          {submitting === "accept" ? "Accepting…" : "Accept"}
        </button>
        <button
          type="button"
          onClick={() => update("REJECTED")}
          disabled={submitting !== null}
          className="rounded-full border border-sand bg-transparent px-4 py-2 text-sm font-medium text-dark-muted transition-colors hover:border-terracotta/40 hover:text-terracotta"
        >
          {submitting === "reject" ? "…" : "Decline"}
        </button>
      </div>
      {error && <p className="text-xs text-terracotta">{error}</p>}
    </div>
  );
}
