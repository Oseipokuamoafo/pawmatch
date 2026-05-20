# PawMatch — Claude Code Project Bible

## What This Is
PawMatch is a responsible pet breeding matchmaking platform — think Hinge meets PetMD.
Owners create verified profiles for their pets, upload medical and genetic data, and get
algorithmically matched with compatible mates based on desired traits, health scores, and
genetic diversity. Core differentiator: **trust**. Every profile requires a live photo,
health records are clearly marked verified vs. self-reported, and the matching engine
automatically flags dangerous pairings.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Node.js, Prisma ORM, PostgreSQL |
| Auth | NextAuth v5, JWT, bcrypt |
| Media | Cloudinary (photos + health docs — docs stored private) |
| Email | Resend |
| Real-time | Socket.io (messaging) |
| Validation | Zod (on every API route, no exceptions) |
| State | Zustand + React Query |
| Mobile (Phase 3) | React Native + Expo |

---

## Design System

```
Background:  #FDF8F2  (warm cream — premium lifestyle, not classifieds)
Primary:     #C94B2A  (terracotta)
Dark:        #1C1008
```

- **Headings:** Georgia serif
- **Body:** System sans-serif
- **Mobile-first** — design for 375px, then scale up
- Chip selectors for multi-select inputs (not checkboxes)
- Generous tap targets (min 44px)
- Each onboarding step has a full-bleed SVG illustrated header
- Phone bezel mockup aesthetic for marketing/preview screens

---

## Folder Structure

```
pawmatch/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx
│   │   ├── pets/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── matches/page.tsx
│   │   └── messages/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── pets/route.ts
│   │   ├── pets/[id]/route.ts
│   │   ├── matches/route.ts
│   │   ├── messages/route.ts
│   │   └── verify/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/               — reusable primitives (Button, Card, Badge, Chip, Modal)
│   ├── pets/             — PetCard, PetForm, LivePhotoCapture, HealthBadge
│   ├── matches/          — MatchCard, ScoreRing, FlagBanner
│   └── messages/         — ChatThread, MessageBubble
├── lib/
│   ├── prisma.ts         — singleton Prisma client
│   ├── auth.ts           — NextAuth config
│   ├── cloudinary.ts     — upload helpers
│   ├── scoring.ts        — scoreMatch algorithm
│   ├── coi.ts            — COI calculation engine
│   └── validations/      — Zod schemas (one file per domain)
├── hooks/                — custom React hooks
├── store/                — Zustand stores
├── types/                — shared TypeScript interfaces
├── prisma/
│   └── schema.prisma
├── public/
│   └── illustrations/    — onboarding SVG headers
├── CLAUDE.md             — this file
└── .env.local
```

---

## Database Models (Prisma)

```prisma
// Key models — always include createdAt, updatedAt, and soft-delete deletedAt on every model

User           // breeder or pet owner, has verificationStatus
Session        // NextAuth sessions
Pet            // core entity — species, breed, DOB, sex, weight, location (ROUNDED lat/lng)
PetPhoto       // Cloudinary URLs, isLivePhoto flag
PetHealth      // health records, verified flag, Cloudinary doc URL (private)
PetTrait       // coat, size, temperament, energy level, etc.
BreedingGoal   // what the owner is looking for in a match
Match          // scored pairing between two pets, status enum
Message        // AES-256 encrypted at rest, tied to a Match
Contract       // breeding agreement PDF, DocuSign integration
Breed          // reference table, 30+ breeds seeded
Report         // user-generated flags/reports
VerificationRequest // breeder badge queue
```

**Critical data rules:**
- Location: **always store as rounded lat/lng** — never exact coordinates, never full address
- Messages: **AES-256 encrypted at rest** — decrypt only in the API layer, never expose raw in DB queries
- Live photos: must be captured via `getUserMedia()` — reject gallery uploads at the API level

---

## Auth (NextAuth v5)

```typescript
// lib/auth.ts conventions
// - JWT strategy (not database sessions)
// - Providers: Google + Credentials (email/password via bcrypt)
// - Session callback must include: userId, breederVerified, subscriptionTier
// - Protect all /dashboard/* and /api/* routes via middleware.ts
// - middleware.ts uses auth() from NextAuth v5 — not getServerSession
```

---

## Matching Algorithm (scoreMatch)

**Located in:** `lib/scoring.ts`

| Weight | Factor |
|---|---|
| 35% | Trait compatibility (desired traits vs. candidate traits) |
| 30% | Health/genetic safety (no shared recessive genes) |
| 20% | Genetic diversity (COI score delta) |
| 10% | Proximity (Haversine distance from rounded lat/lng) |
| 5%  | Owner preferences |

**Auto-flags that hard-cap score at 30:**
- Shared recessive disease gene
- COI > 12.5%
- Pet under minimum breeding age
- Unverified health records

**COI engine:** `lib/coi.ts` — Wright's path coefficient method, 5-generation pedigree

---

## API Route Conventions

Every API route must follow this pattern:

```typescript
// 1. Auth check first
const session = await auth();
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// 2. Zod validation on all inputs
const parsed = schema.safeParse(await req.json());
if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

// 3. Prisma query
// 4. Return typed response
```

---

## Environment Variables (.env.local)

```
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RESEND_API_KEY=
ENCRYPTION_KEY=          # AES-256 key for message encryption
```

---

## Build Roadmap

### ✅ Phase 1 — Foundation (Months 1–3)  — COMPLETE
- [x] Project scaffold + Prisma schema
- [x] NextAuth v5 (Google + credentials)
- [x] Pet profile CRUD + Cloudinary uploads
- [x] Live photo verification (getUserMedia, no gallery)
- [x] Health record + DNA import (Embark/Wisdom Panel JSON)
- [x] Breeder verification badge queue
- [x] Report/flag system

### Phase 2 — Matchmaking + Messaging (Months 4–7)
- [x] Browse/filter feed (PostGIS radius search still pending — current sort is by score only)
- [x] scoreMatch engine (lib/scoring.ts)
- [x] Match request system
- [ ] Real-time Socket.io chat with scam detection (chat works via polling; sockets + scam detection still pending)
- [ ] In-app breeding contract templates (pdf-lib + DocuSign)

### Phase 3 — Breed Explorer + Mobile (Months 8–12)
- [ ] Cross-breed trait predictor (Punnett square engine)
- [ ] Breed database seeded (30+ breeds)
- [ ] Heat cycle tracking
- [ ] React Native + Expo mobile app
- [ ] Firebase FCM push notifications
- [ ] Stripe freemium monetization

### Phase 4 — Scale + AI (Month 12+)
- [ ] Claude API breeding advisor (context-aware, pulls pet profile)
- [ ] Embark/Wisdom Panel API integration
- [ ] Vet network direct verification
- [ ] White-label B2B (AKC, TICA, Kennel Club UK)
- [ ] International expansion

---

## Current Status

> **Update this section at the end of every session.**

**Currently in:** Phase 1 — Foundation
**Last completed:** Live photo verification flow (getUserMedia capture, LiveVerifiedBadge, /api/pets/[id]/live-photo PATCH route)
**Working on next:** Health record + DNA import (Embark/Wisdom Panel JSON parser)
**Blockers:** None

---

## Coding Rules (Never Break These)

1. **TypeScript strict mode** — no `any`, no `as unknown`
2. **Zod on every API route** — validate before touching the DB
3. **Prisma singleton** — always import from `lib/prisma.ts`, never instantiate inline
4. **No exact coordinates** — always round lat/lng before storing
5. **No gallery uploads for live photos** — enforce at API level with a `isLiveCapture` flag
6. **Encrypt messages** — AES-256 in the API layer before writing to DB
7. **Match score hard-cap** — any auto-flag drops the score ceiling to 30, no exceptions
8. **Mobile-first CSS** — write base styles for 375px, use `md:` / `lg:` for larger screens
9. **No `useEffect` for data fetching** — use React Query (`useQuery`, `useMutation`)
10. **Soft deletes** — never hard-delete Users, Pets, or Matches — use `deletedAt` timestamp

---

## Key Business Context

- **Market:** $150B pet care industry, $11.2B breeding software segment, 8.4% CAGR
- **Monetization:** Freemium ($9.99/mo Pro), featured listings, DNA kit referrals (Embark/Wisdom Panel), vet network subscriptions, B2B kennel plans ($49/mo), white-label licensing
- **Differentiator:** Trust + verification. No competitor combines medical records + genetic science + social matching in a consumer app.
- **Target users:** Responsible breeders, kennel clubs, vet practices — B2B2C model
- **Key partners to build toward:** Embark DNA, Wisdom Panel, DocuSign, AKC/TICA

---

## Notes for Claude Code

- When generating components, always apply the design system (cream bg, terracotta accents, Georgia headings)
- When generating API routes, always include auth check + Zod validation
- When generating Prisma queries, always filter out `deletedAt IS NOT NULL` records
- Suggest PostGIS extension usage for any location/proximity queries
- Reference the phase roadmap when suggesting what to build next
- Keep components small and composable — this is a consumer app, not an admin panel

**UI engineering standards are mandatory** — see [`docs/UI.md`](docs/UI.md) for the full spec (animated backgrounds, hover patterns, micro-interactions, motion rules). Every full-page layout must have a living background; every interactive element must have a purposeful hover state.
