"use client";

import Image from "next/image";

const DARK = "#1C1008";
const CREAM = "#F5EFE6";
const TERRA = "#C94B2A";

const MATCHES = [
  {
    name: "Apollo",
    score: 87,
    src: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=300&h=300&fit=crop&crop=face",
  },
  {
    name: "Luna",
    score: 92,
    src: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop&crop=face",
  },
  {
    name: "Bruno",
    score: 79,
    src: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=220&h=220&fit=crop&crop=face",
  },
  {
    name: "Mochi",
    score: 84,
    src: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop&crop=face",
  },
];

export function MatchCardsRow() {
  return (
    <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
      {MATCHES.map((m) => (
        <div
          key={m.name}
          className="relative flex w-[140px] flex-col items-center rounded-2xl p-3 transition-transform duration-200 hover:-translate-y-1"
          style={{
            background: "rgba(245,239,230, 0.06)",
            border: "1px solid rgba(232,213,183, 0.18)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="relative h-20 w-20 overflow-hidden rounded-full">
            <Image src={m.src} alt={m.name} fill sizes="80px" className="object-cover" />
          </div>
          <p
            className="mt-2 leading-none"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontSize: 18,
              fontWeight: 900,
              color: CREAM,
            }}
          >
            {m.name}
          </p>
          <div
            className="mt-2 flex h-9 w-9 items-center justify-center rounded-full"
            style={{
              background: DARK,
              border: `1.5px solid ${TERRA}`,
              color: TERRA,
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontSize: 13,
              fontWeight: 900,
            }}
          >
            {m.score}
          </div>
        </div>
      ))}
    </div>
  );
}
