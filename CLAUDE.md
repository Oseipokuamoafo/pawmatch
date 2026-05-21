# PawMatch — Project Bible

## What it is

Responsible pet breeding matchmaking platform. Think Hinge meets PetMD.
Owners create verified pet profiles, upload medical/genetic data, and get
algorithmically matched based on traits, health scores, and genetic diversity.

Core differentiator: **trust**. Live photo required, health records marked
verified vs self-reported, matching engine flags dangerous pairings
automatically.

---

## Product vision — three pillars

1. **PawMatch** — Breeding matchmaking (core, building now)
2. **PawServices** — Pet service marketplace (Phase 3)
3. **PawSocial** — Pet influencer profiles (Phase 3)

---

## Go-to-market strategy — B2B2C

Primary entry point is B2B. Sell to organizations first, reach consumers
through them.

**Target B2B customers**
- Kennel clubs and breed registries (AKC is the anchor enterprise target)
- Licensed professional breeders (5+ pets, kennel management needs)
- Veterinary practices (vet verification network, patient acquisition)
- Pet service businesses (groomers, trainers, boarders)

Consumer audience (B2C) reached downstream through B2B partners.

**Why B2B first**
- Faster revenue, larger contract sizes
- Built-in trust and distribution
- AKC white-label deal alone = **$10k–50k/yr**
- Breeders bring their clients onto the platform
- Vets bring their patients onto the platform

---

## Tech stack

- Next.js 14 App Router, TypeScript, Tailwind CSS v4
- Prisma ORM + PostgreSQL
- NextAuth v5 (JWT, Google + credentials)
- Cloudinary (photos + health docs; docs stored private)
- Resend (email)
- Socket.io (real-time chat) on a custom Next + Node server
- Zod (validation)
- Zustand + React Query (state)
- React Native + Expo (Phase 3 mobile)

---

## Design system

```
Background:   #FDF8F2  (cream)
Primary:      #C94B2A  (terracotta)
Dark:         #1C1008
Sand:         #E8D5B7
Sage:         #7A9E7E
```

- **Headings:** Playfair Display + Georgia serif (`var(--font-playfair)`)
- **Body:** Inter / system-ui (`var(--font-inter)`)
- Tailwind v4 via `@theme` directive
- Utilities: `.btn-primary`, `.btn-secondary`, `.card`, `.chip`, `.eyebrow`, `.card-hover`
- Mobile-first, phone-bezel mockup aesthetic
- Each onboarding step gets its own full-bleed illustrated SVG header
- Frontend engineering standards live in [`docs/UI.md`](docs/UI.md)

---

## Folder structure

```
src/
  app/             Next.js App Router pages + API routes
  components/     Reusable UI components
  lib/             Utilities (scoring, geo, contracts, encryption)
  hooks/           Custom React hooks
  types/           TypeScript types
  server.ts        Custom Next + Socket.io server entry
prisma/
  schema.prisma    All 15 models
  seed.ts          Breed seed data
docs/
  UI.md            Frontend engineering standards
```

---

## Database models

15 total:

`User`, `Account`, `Session`, `VerificationToken`, `Pet`, `PetPhoto`,
`PetHealth`, `PetTrait`, `BreedingGoal`, `Match`, `Message`, `Contract`,
`Breed`, `Report`, `VerificationRequest`.

## Enums

| Enum | Values |
|---|---|
| `Role` | `OWNER` · `BREEDER` · `ADMIN` |
| `Species` | `DOG` · `CAT` |
| `Sex` | `MALE` · `FEMALE` |
| `HealthRecordType` | `VACCINE` · `DNA` · `VET_VISIT` · `CERTIFICATE` |
| `TraitSource` | `SELF_REPORTED` · `DNA_VERIFIED` |
| `MatchStatus` | `PENDING` · `ACCEPTED` · `REJECTED` · `EXPIRED` |
| `ReportStatus` | `OPEN` · `REVIEWED` · `RESOLVED` · `DISMISSED` |
| `VerificationStatus` | `PENDING` · `APPROVED` · `REJECTED` |

---

## API conventions

- All routes at `src/app/api/[resource]/route.ts`
- **Auth check first** on every route: `const session = await auth(); if (!session) return 401`
- Zod validation on all inputs
- Return `{ error: string }` with proper status codes on failure
- Ownership checks: verify the caller owns the resource before mutating

---

## Matching algorithm (`scoreMatch`)

Weighted 0–100:

| Weight | Component |
|---|---|
| 35% | Trait compatibility |
| 30% | Health / genetic safety |
| 20% | Genetic diversity (COI) |
| 10% | Proximity (Haversine) |
| 5%  | Owner preferences |

**Auto-flags that cap score at 30**: `SHARED_RECESSIVE_GENE`, `HIGH_COI`
(> 12.5%), `PET_UNDERAGE`, `UNVERIFIED_HEALTH`.

Implementation: `src/lib/scoring.ts` (with `src/lib/scoring.test.ts` unit
tests). Stub COI engine in `src/lib/coi.ts` — drops in real Wright path
coefficients once pedigree data exists.

---

## Encryption + privacy

- **Messages**: AES-256-GCM encrypted at rest using `ENCRYPTION_KEY` env var. Decryption happens only at the API boundary; nothing decrypted ever crosses the socket.
- **Health docs**: stored in Cloudinary private/authenticated folders (`pawmatch/health/<userId>`).
- **Location**: stored as rounded `lat/lng` (2 decimal places, never exact addresses).

## Live photo verification

- `getUserMedia` (rear camera preferred)
- Canvas snapshot → JPEG blob → Cloudinary upload
- Gallery photos blocked until live photo captured
- No gallery uploads accepted as live-photo substitute

---

## Build history

### Session 1 — Foundation
- Project scaffold: Next.js 14 App Router + TypeScript + Tailwind v4
- Prisma schema: 15 models, 8 enums, FK indexes
- `.env.example` + `.env.local` with generated secrets
- NextAuth v5 (Google + credentials, JWT, custom session including `id`, `role`, `isVerified`)
- Sign in + sign up pages with Zod validation, type augmentation
- Pet profile 3-step creation flow (basic info → photos → breeding goals)
- API: GET/POST `/api/pets`, GET/PATCH/DELETE `/api/pets/[id]`
- Cloudinary upload via `/api/upload` (server-side, no public env vars)
- `PetCard`, dashboard grid + empty state
- `LivePhotoCapture` + `/api/pets/[id]/live-photo` + `LiveVerifiedBadge`
- Gallery photos blocked until live capture
- Marketing landing page: hero + trust promises + match-card preview
- Tailwind v4 design system via `@theme`

### Session 2 — Dashboard upgrade
- Stats row, filter chips, pet cards with health-score rings
- Top matches panel, activity feed
- Slide-up Add Pet modal hosting the reusable `PetWizard`
- Toast notification system
- CLAUDE.md drafted

### Session 3 — Phase 1 + Phase 2 implementation
**Phase 1 leftovers**
- Health records grouped page (`/dashboard/pets/[id]/health`) with per-type sections
- DNA import (`<DNAImport>` + `/api/pets/[id]/dna-import`) auto-detecting Embark + Wisdom Panel exports; creates DNA-verified `PetTrait` rows including `coiEstimate`
- Breeder verification flow: `/dashboard/verify` submission + status card, `/admin/verifications` admin queue with React Query optimistic mutations, Resend approval/rejection emails
- Community report system: `<ReportButton>` modal, `/api/reports` POST with per-reporter dedupe, 3-report threshold admin alert email, `/admin/reports` triage queue

**Phase 2 — matchmaking**
- PostGIS scaffolded (Postgres-version note in `prisma/migrations/add_postgis.sql`)
- Breed seed data: 15 dogs + 8 cats with realistic `averageCOI`, sex-specific min breeding age, common recessive markers
- `lib/geo.ts` Haversine helper + raw-SQL `findUsersWithinRadius`
- `lib/scoring.ts` rewritten: typed `MatchResult` with breakdown JSON, `batchScoreMatches`, unit tests (`scoring.test.ts`) via `node:test` + `tsx`
- `/browse` discover feed: pet switcher, filter bar (distance / health / verified / breed search), sort, infinite scroll, in-session skip, `MatchCard` with color-coded score pill
- Match request system: POST/PATCH `/api/matches` storing breakdown JSON, dedupe with idempotent re-request, recipient-only accept/reject, Resend emails for both directions
- `/matches` page with two tabs (received / sent), `MatchRequestCard` with score-breakdown bar chart accordion + accept/reject + message CTA on accepted
- Breeding contract PDFs: 3 templates (`STANDARD_BREEDING` / `STUD_SERVICE` / `PUPPY_PLACEMENT`) generated via pdf-lib, streamed inline from `/api/contracts/[id]/pdf`; `<ContractActions>` lives inside accepted match cards

**Phase 2 — real-time chat**
- Custom Next + Socket.io server at `src/server.ts` (boots via `tsx`)
- **Socket auth** via `getToken({ req, secret })` on every connection — unauthenticated sockets disconnected before handlers run
- Events: `join_match`, `leave_match`, `send_message`, `typing`, `mark_read` (in); `message_received`, `message_flagged`, `typing_indicator`, `messages_read`, `joined_match`, `send_error` (out)
- Socket-driven writes: server scam-checks → encrypts → persists → broadcasts decrypted `MessageWire` to room
- Scam detection (`lib/scam-detection.ts`): hard rules (Western Union / wire transfer / crypto wallet) refuse with `send_error`; soft rules (off-platform contact, urgency, URLs, payment apps, phones) prefix `[FLAGGED]` and emit `message_flagged`
- REST history at `/api/messages/[matchId]` with `?before=` back-pagination
- `useChat` hook: socket lifecycle, optimistic send with ack, throttled typing, mark-read, load-older
- `/messages` list with search + unread badges + last-message preview
- `/messages/[matchId]` chat view: both-pets header with score pill, terracotta own bubbles + sand other bubbles, **read receipts (◌ → ✓ → ✓✓)**, animated 3-dot typing indicator, flagged-message banners + per-bubble pills, Enter-to-send composer with reconnecting state, `Live ●` / `Reconnecting ●` chip

---

## CRITICAL RULE — do not touch completed work

DO NOT modify, refactor, redesign, or touch anything listed in the build
history above without explicit permission from Gerald.

This includes: schema, auth, pet CRUD, live photo flow, dashboard UI, landing
page, design tokens, upload API, scoring engine, browse feed, match request
flow, contracts, messages, the chat socket protocol.

If you think something in a completed area needs changing, **ask first** and
explain why. Never change it silently.

New features must integrate with existing code, not replace it.

---

## Phase 1 status

- [x] Project scaffold + Prisma schema
- [x] NextAuth v5 (Google + credentials)
- [x] Pet profile CRUD + Cloudinary uploads
- [x] Live photo verification
- [x] Marketing landing page
- [x] Upgraded dashboard UI
- [x] Health records + DNA import
- [x] Breeder verification badge queue
- [x] Report/flag system

## Phase 2 status

- [x] PostGIS scaffolded + breed seed data (extension declared in schema;
  raw SQL in `prisma/migrations/add_postgis.sql`. Activate after upgrading
  Postgres to 17 — current Homebrew build is for PG17/18. Haversine
  fallback in `lib/geo.ts` works in the meantime.)
- [x] Scoring engine (`src/lib/scoring.ts` + unit tests)
- [x] Browse feed + filters (`/browse`)
- [x] Match request system (`/matches`)
- [x] Real-time chat (Socket.io custom server with auth + typing + read receipts + scam detection)
- [x] Breeding contracts (`pdf-lib`, 3 templates, streamed PDF)
- [ ] Nav badges driven by real unread counts (currently per-page only)
- [ ] Cross-pet activity feed on the dashboard pulling matches + messages

## Phase 3 — planned

- Cross-breed trait predictor (Punnett square engine)
- Breed database (30+ breeds with full pedigree placeholders)
- Heat cycle tracking
- Vet checkup history
- React Native + Expo mobile app
- Push notifications (Firebase FCM)
- Stripe freemium monetization
- **PawServices** — pet service marketplace + booking
- **PawSocial** — pet influencer profiles

## Phase 4 — planned (AI + scale)

- **Claude API breeding assistant**
  - Gated behind Pro+ tier (**$19.99/mo**)
  - Context-aware: pulls the pet's full health profile, DNA results, breed data
  - Answers genetic questions, interprets DNA results, predicts litter outcomes
  - Uses Anthropic `/v1/messages` with pet profile injected as context
  - Built inside the app as a chat interface on the pet profile page
- Embark + Wisdom Panel API partnership (direct DNA import)
- Vet network direct verification
- International expansion: UK, Australia, EU
- White-label B2B: license platform to AKC, TICA, The Kennel Club UK ($10k–50k/yr per org)
- Data licensing: anonymized breed health trends to vet research + pet food companies
- Insurance partnerships: Lemonade, Nationwide referrals on new litters

---

## Full monetization model

### Short-term (0–12 months)
- **Freemium subscriptions**
  - Free: 3 match requests/month, 1 pet profile, basic browse
  - Pro ($9.99/mo or $79/yr): unlimited matches, priority placement, breed predictor, contracts, unlimited pets
- **Featured listings**: $4.99–$14.99 to boost a profile in search
- **Verification fast-track**: $4.99 for expedited breeder badge (vs 72hr standard queue)

### Medium-term (12–24 months)
- DNA test kit referrals (Embark + Wisdom Panel): $15–30/kit, target 5k kits/yr ⇒ **$75k–$150k**
- Breeding contract premium templates: $2.99/contract for advanced clauses
- Vet verification network: $29/mo per vet partner
- B2B kennel plans: $49/mo for licensed breeders managing 5+ pets

### Long-term (24+ months)
- AI breeding advisor (Claude API): Pro+ tier $19.99/mo
- White-label B2B: $10k–50k/yr per kennel club or registry
- Insurance referral fees: Lemonade, Nationwide on new litter policies
- Data licensing (anonymized, aggregate): vet research + pet food companies
- International expansion: UK, Australia, EU

---

## Market context

- Pet care industry: **$150B+** globally, 6.1% CAGR
- Pet breeding management software: **$11.2B** segment, 8.4% CAGR — severely underdeveloped
- Designer / mixed-breed segment fastest growing → served by cross-breed predictor
- **55% of pet owners** concerned about unethical breeding → trust + verification = commercial advantage
- Embark DNA tests: $99–199 each, **4.5M+ pets tested** → proves breeders pay for genetic tools
- Competitors (PuppyFind, Greenfield Puppies, AKC Marketplace): classifieds-style, **no matching intelligence, no genetic tools, no in-app communication**
- No dominant consumer app combines medical records + genetic science + social matching today

---

## Autonomy and creative freedom — new features only

Claude Code has full creative and engineering autonomy on **NEW features only**.

### Design freedom (new features only)
- Use design judgment to improve any new UI — don't just follow specs literally
- Add microinteractions, transitions, hover states, and animations where they improve UX
- Add illustrations, empty states, loading skeletons, and error states proactively
- Suggest and implement UI patterns that fit the product even if not explicitly requested
- The design system is a foundation, not a cage — extend it thoughtfully on new work
- Frontend engineering standards (animated backgrounds, hover specs, motion rules) live in [`docs/UI.md`](docs/UI.md) and are mandatory for new UI

### Engineering freedom (new features only)
- Add helper utilities, custom hooks, and abstractions when they reduce repetition
- Add input sanitization, rate limiting, and security improvements proactively
- Optimize queries and add indexes when N+1 patterns surface
- Add typed Zod schemas at every external boundary (API in, file uploads, third-party payloads)
- Write small focused unit tests for non-trivial pure logic (`tsx --test 'src/**/*.test.ts'`)
- Prefer composition over duplication — extract a component when a pattern repeats 3+ times
- Add error boundaries and structured logging on new code paths
- Use feature flags (`process.env.NEXT_PUBLIC_FEATURE_*`) when shipping experimental UI
- Add `not-found.tsx` / `error.tsx` for new route trees
- Reach for existing primitives first (`<Toast>`, `<MatchCard>`, `<ScoreRing>`, `<VerificationBadge>`, `<FloatingInput>`) before building new ones

### Always-on guardrails (apply everywhere — including new features)
- Auth + ownership checks before any mutation
- Zod validation on every API input
- Never log secrets, session tokens, or decrypted message content
- Round any `lat`/`lng` to 2 decimal places before storage
- No raw SQL string concatenation — use `prisma.$queryRaw` template literals
- TypeScript strict mode — no `any` without a comment explaining why

---

## Repo + branch hygiene

- **Default branch**: `main` (auto-deployed to origin: https://github.com/Oseipokuamoafo/pawmatch)
- One slice per commit; commit message starts with an imperative verb
- Every PR-equivalent commit must:
  1. Build clean (`npm run build`)
  2. Pass type-check (`npx tsc --noEmit`)
  3. Pass tests (`npm test`)
- `.env*` is gitignored — secrets only ever live in `.env.local`
- Generated Prisma client in `src/generated/prisma/` is gitignored; regenerate with `npx prisma generate`

## Useful local commands

```bash
npm run dev      # custom Next + Socket.io server via tsx
npm run build    # next build
npm run start    # production custom server
npm run lint     # eslint
npm run seed     # idempotent breed seed
npm test         # node:test runner via tsx

npx prisma db push          # apply schema changes
npx prisma migrate dev      # create + apply tracked migration
npx prisma generate         # regenerate client into src/generated/prisma
```
