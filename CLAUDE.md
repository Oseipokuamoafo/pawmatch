# PawMatch — Project Bible

## What it is

The **vet-verified compliance and verification layer for responsible pet
breeding**. A regulated network of state-board-verified veterinarians
co-sign health records; owners upload medical/genetic data; an AI screen
auto-verifies vet licenses against state boards; an in-product engine
flags dangerous pairings (shared recessives, high COI, underage) before
matches happen.

Core differentiator: **trust as infrastructure**. Live photo verification,
records distinguished as vet-co-signed vs self-reported, an AI license
auto-screen that gates the vet network, and matching that informs (never
prescribes) breeding decisions.

**Positioning note (post-investor research, 2026-05):** the project is
not "Tinder for breeding" or "Hinge meets PetMD." That framing primes
sophisticated capital to compare against consumer-marketplace economics
(Wag! at $69M market cap is the cautionary tale) and triggers welfare-
politics filters with no offsetting TAM. The fundable framing is
operationally-grounded: vet-side regulated network + proprietary
co-signed-records dataset + compliance tooling for breeders. The
consumer match feed is a distribution channel, not the main act.

---

## Product vision — focus, then expand

1. **PawMatch — trust infrastructure for responsible breeding** (core,
   building now). The vet network + co-signed records + AI-screened
   compatibility flagging. Everything before $5M ARR funnels into this.
2. **PawServices** — deferred. Rover exited to Blackstone at $2.3B in
   November 2023; this is not a category to enter from scratch without
   a clear wedge. Revisit after the core network is liquid.
3. **PawSocial** — deferred. "Pet influencer" is a content business with
   different unit economics, not a natural extension of a trust network.

---

## Go-to-market strategy — vets first, not kennel clubs

Primary wedge is **veterinary practices**, not AKC. The trust signal we
sell only becomes real once licensed vets are co-signing records, and
vets are the only stakeholder with the regulatory authority to make that
signal credible. They're also an order of magnitude more accessible than
AKC and align with how Embark, Wisdom Panel, and the pet-insurance
underwriters already distribute (~30,000 U.S. small-animal practices).

**Sequencing (post-research):**

1. **Vet practices first** — sell as a compliance + verification SaaS
   add-on ($99–299/mo per practice) plus per-record co-sign transaction
   fees. Goal pre-raise: 1 named practice running the inbox + signing
   records with measurable usage data.
2. **DNA-test partnership second** — close one LOI with Embark or
   Wisdom Panel for affiliate referrals before raising. Highest-ROI BD
   action; doubles as defense against either company building a
   matching feature.
3. **Welfare-org endorsement third** — preempt the puppy-mill /
   advocacy critique with a Humane Society, ASPCA, AVMA, or comparable
   endorsement of the trust mechanisms before TechCrunch comments
   discover us.
4. **Breeders fourth** — once vets are signing, breeders have a
   reason to be on the platform that doesn't depend on consumer
   liquidity.
5. **Kennel clubs / AKC only with an LOI** — AKC already runs AKC
   Marketplace at 1.4M buyers/year on Salesforce + SAP + Sage X3. They
   partner with established operational vendors (SpotOn, Allivet), not
   white-label trust-stack startups. Realistic AKC outcomes are
   competition or acquisition, not partnership. **The "$10k-50k/yr per
   AKC partnership" line is removed from external materials** —
   reinstate only when a signed LOI exists.

**Consumer audience** reached through the vet+breeder network and
organic search; consumer Pro+ is a side revenue stream, not the
headline.

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
- React Native + Expo — **deferred** until >$5M ARR. Mobile is a
  distribution channel, not a feature; web + email + Twilio SMS covers
  ~95% of the experience until we have the revenue to justify a second
  codebase. Listed for awareness; not active in the roadmap.

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

## Investor pitch — one paragraph

Use this language (or close variants) in any external materials. The
old "Hinge meets PetMD" / "Tinder for breeding" framing is retired.

> PawMatch is the verification and compliance layer for responsible pet
> breeding — a regulated network of state-board-verified veterinarians
> who co-sign health records, enforced by an AI screen that checks every
> vet's license against their state board automatically, and used by
> breeders, kennel clubs, and pet owners to prevent dangerous pairings
> and produce audit-ready breeding documentation. The U.S. pet industry
> is $158B and growing 4% annually (APPA 2026), but the trust
> infrastructure under it is dominated by 1990s classifieds with no
> oversight. We sell to vet practices ($99–299/mo SaaS), to breeders
> (transaction fees on co-signed records), and to insurers and DNA-test
> partners (referrals). We're at **[N] vets, [M] signed records,
> [P] vet-practice pilots** today, growing [X]% MoM.

The bracketed numbers MUST be real before this paragraph leaves the
team. Specifically the pitch is not investable without:
1. At least one named vet-practice case study with measurable usage.
2. A signed LOI with Embark or Wisdom Panel for DNA-test referrals.
3. (Ideally) a quote or endorsement from a welfare org or veterinary
   association.

### Legal / liability flags to address before raising

- **Breeding-contract PDFs**: current generator (`pdf-lib`, 3 templates)
  is at risk of unauthorized-practice-of-law claims in some U.S.
  states. Either commission attorney review of every template OR
  reposition as "starting point for your attorney" with hard
  disclaimers on download. Until fixed, this is not a revenue line.
- **Matching engine hard caps** (score capped at 30 on SHARED_RECESSIVE
  / HIGH_COI / PET_UNDERAGE / UNVERIFIED_HEALTH): excellent UX, but
  implies a clinical recommendation. Reframe as **informational, not
  advisory** in UI copy and legal disclaimers. Otherwise we carry
  liability when a flagged-OK pairing produces an unhealthy litter.

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
- [x] Nav badges driven by real unread counts (shared `useCounts` hook
  against `/api/counts`, terracotta pill on Matches + Messages, 30s
  refetch + window-focus refresh, ring-matched to the nav background
  in both themes)
- [x] Cross-pet activity feed on the dashboard pulling matches + messages
  (`message.received` / `message.flagged` event variants; messages
  decrypted at the server boundary, flagged ones surface with a
  terracotta-tinted preview)
- [x] Vet network — slice 1: `VET` role + `VetApplicationStatus` enum +
  license fields on `User`; sign-up form carries an optional
  `vetApplication` block; admin queue at `/admin/vets` (approve →
  role becomes VET + email; reject → email with notes); `AdminNavMenu`
  groups Verify queue + Vet queue + Reports under one disclosure.
- [x] Vet network — slice 2: co-sign flow. Owner picks a vet on each
  unverified health record via `<RequestCosignDialog>` (searchable
  picker hits `/api/vet/search`); request stored in
  `PetHealth.requestedVetId`. Vet's inbox lives at `/dashboard/vet`,
  surfaces `requestedAt`-ordered records with sign/decline actions
  via `/api/health/[recordId]/cosign`. Sign flips `isVerified`,
  populates `verifiedByVetId` + `verifiedAt`, and clears the request;
  decline preserves the record + sends the owner an email with vet's
  notes. `HealthRecordCard` shows "Verified by Dr. X · Practice" on
  signed records and an "Awaiting Dr. Y" pill on pending. TopNav
  surfaces a "Vet inbox" badge for VET users driven by
  `counts.vetPendingCosigns`.
- [x] Vet network — slice 3: trust signals. `/dashboard` redirects VET
  users to their inbox. New public directory at `/vets` (searchable
  by state + name + practice) and per-vet profile at `/vets/[id]`
  (signature count, breakdown by record type, top breeds signed —
  PHI-free aggregates). "Verified by Dr. X" on `HealthRecordCard`
  links to the vet's profile; the cosign picker exposes a "Profile →"
  affordance per row.
- [x] Vet network — slice 4: AI auto-screen. Sign-ups with a vet
  application kick off `screenVetApplication()` (`src/lib/vet-screening.ts`)
  in the background — Claude (`claude-haiku-4-5` by default, swap to
  `claude-sonnet-4-6` via `VET_SCREEN_MODEL` if reliability slips)
  uses the `web_search_20250305` server tool to cross-reference the
  applicant's license against the issuing state's veterinary board.
  Returns a JSON verdict ({status, confidence, reason, evidence[]})
  constrained by `output_config.format`; rubric is cached on the
  system-prompt prefix so we only pay full input cost on the first
  applicant. `runScreenAndPersist` writes the verdict onto User
  (`aiScreen*` fields) and **auto-approves** anything with
  `status="match"` AND `confidence ≥ VET_SCREEN_AUTO_APPROVE_MIN`
  (default 0.85) — sends the approval email + flips role to VET +
  records `aiAutoApprovedAt`. Anything else routes to the admin
  queue with the AI's evidence rendered inline (color-coded chip,
  confidence %, source list with quotes) and an "AI recommends
  approval" ring on the Approve button when applicable. Admins can
  re-run via `POST /api/admin/vets/[userId]/screen`. Auto-approval
  is the SLA mechanism that delivers sub-24h verification for the
  majority of legitimate applications without sacrificing the human
  audit trail on edge cases.

## Phase 3 — planned

- Cross-breed trait predictor (Punnett square engine)
- Breed database (30+ breeds with full pedigree placeholders)
- Heat cycle tracking
- Vet checkup history
- [x] **Stripe + Pro+ tier ($19.99/mo)** — `Subscription` model 1:1
  with User mirroring Stripe's status enum verbatim;
  `stripeCustomerId` cached on User for fast lookups before the
  first sub exists. `lib/billing.ts:hasProPlusAccess(userId)` is
  the single source of truth for entitlement — reads from the DB,
  never Stripe directly. `/api/billing/checkout` lazily creates the
  Stripe Customer (idempotent) + opens a Checkout Session;
  `/api/billing/portal` opens the Customer Portal for cancel/card/
  invoices. `/api/billing/webhook` is the only writer of
  `Subscription` rows — raw-body signature verification with
  `STRIPE_WEBHOOK_SECRET`, idempotent upsert keyed on
  `stripeSubscriptionId`, handles `customer.subscription.{created,
  updated,deleted}` + logs `invoice.payment_failed`. Public
  `/pricing` page with Free vs Pro+ table; `/dashboard/billing`
  post-checkout landing with portal entry; profile dropdown gets
  a "Billing & plan" entry. Assistant gate flipped from env-flag
  to `hasProPlusAccess` (dev override via
  `FEATURE_BREEDING_ASSISTANT=on` documented). Tests cover the
  entitlement matrix (active/trialing/canceled/past-due/paused/
  incomplete + cancel-at-period-end + boundary cases). Dev flow:
  `stripe listen --forward-to localhost:3142/api/billing/webhook`.
- ~~React Native + Expo mobile app~~ — **deferred** until >$5M ARR.
  Mobile is a distribution channel, not a wedge.
- ~~Push notifications (Firebase FCM)~~ — deferred with mobile.
- ~~**PawServices** — pet service marketplace + booking~~ —
  **deferred indefinitely**. Rover exited to Blackstone at $2.3B in
  November 2023 and dominates this category. Entering it from scratch
  without a clear differentiator is not fundable.
- ~~**PawSocial** — pet influencer profiles~~ — **deferred
  indefinitely**. Different unit economics (content business);
  not a natural extension of the trust network.

## Phase 4 — planned (the next investable slices)

- [x] **Claude API breeding assistant** — shipped. Gated behind Pro+
  ($19.99/mo) via Stripe; context-aware (pet health profile + DNA +
  breed + heat cycles + goals); Sonnet 4.6 with adaptive thinking and
  cached system prompt. Demoted from the headline of the pitch —
  it's a feature, not a moat (Anthropic API access is commoditized).
- **DNA-test affiliate partnership (Embark or Wisdom Panel)** —
  **highest-priority pre-raise BD action**. Close one LOI before
  fundraising. $5–30/test referred, plus a defensive against either
  company shipping a matching feature themselves.
- **Vet practice management software integration** (Provet, Vetspire,
  ezyVet, Modern Animal hooks). Lets us sell to vets without asking
  them to leave their existing PMS. The actual wedge into the vet
  channel.
- **Insurance referral partnerships** (Lemonade Pet — $500M+ pet
  portfolio in 2025; Trupanion — $1.2B premiums in 2025). Both have
  established referral programs and want trust-qualified leads.
- ~~**White-label B2B to AKC, TICA, Kennel Club UK at $10k-50k/yr**~~
  — **removed from the pitch**. AKC runs AKC Marketplace on
  Salesforce/SAP/Sage X3 and partners only with established
  operational vendors. Reinstate this line only when a signed LOI
  exists. Realistic outcome is competition or acquisition.
- ~~Data licensing to pet food companies~~ — deferred. A story,
  not a line item, until the co-signed-records dataset is large
  enough to be meaningfully proprietary.
- International expansion — deferred. U.S. focus until $5M ARR.

---

## Full monetization model — B2B revenue stack, not consumer Pro+

The model is reordered around what investors will actually fund: a
B2B-first revenue stack where consumer subscriptions are a side
stream, not the headline. Consumer marketplaces in pet verticals
ceiling at Wag!-style outcomes ($69M); vet-SaaS comparables (Modern
Animal at $100M ARR, Petfolk at Series C) sit an order of magnitude
higher.

### Tier 1 — vet-side B2B (the main act, 0–18 months)
- **Vet-practice SaaS**: $99–299/mo per practice for the co-sign inbox,
  compliance audit trail, vet-side analytics, and PMS integration
  (Provet, Vetspire, ezyVet hooks). Target 30k US small-animal
  practice TAM; $3M–30M reachable ARR.
- **Per-record co-sign transaction fee**: $5–15 per signed health
  record, split with the vet (we keep ~$3, vet keeps the rest).
  Realistic at $500k–5M ARR with 100–1,000 active vets.

### Tier 2 — partnership revenue (6–18 months)
- **DNA-test affiliate** (Embark or Wisdom Panel): $5–30/test referred.
  Close an LOI with one of the two **before raising** — highest-ROI
  pre-raise BD action and a defense against either company shipping a
  matching feature themselves. Wisdom Panel hit 5M pets tested by
  March 2025; Embark hasn't raised since its 2021 $700M post.
- **Insurance referrals** (Lemonade, Trupanion): $50–200/policy.
  Lemonade's pet portfolio exceeded $500M in 2025; Trupanion wrote
  $1.2B in premiums. Both have referral programs; both want trust-
  qualified leads.

### Tier 3 — consumer Pro+ (side stream)
- **Pro+ ($19.99/mo)**: Claude-powered breeding assistant + cross-breed
  predictor + priority placement + premium contract templates. Demoted
  from the headline. Stripe + Pro+ tier already wired (see Phase 3 in
  status section).

### Things explicitly cut from the pitch
- ~~AKC white-label at $10k–50k/yr~~ — fantasy without an LOI; AKC
  already runs AKC Marketplace at 1.4M buyers/year. Reinstate only
  when a signed contract exists.
- ~~Featured listings, verification fast-track ($4.99 boosts)~~ —
  classifieds-style monetization that anchors us against
  Greenfield/PuppyFind comps. Cut.
- ~~Breeding contract premium templates ($2.99 each)~~ — contract
  generation needs attorney signoff (unauthorized-practice-of-law
  exposure in some states). Either get formal attorney review on
  templates or position as "starting point for your attorney" with
  hard disclaimers. Until then, not a revenue line.
- ~~Data licensing to pet food companies~~ — a story, not a line item.
  Defer until the dataset is meaningfully large.

---

## Market context (corrected against 2026 sources)

The previous version of this section overstated TAM in ways that
wouldn't survive due diligence. Below are the numbers that hold up.

- **U.S. pet industry: $158B in 2025** (APPA, March 2026), projected
  ~4.4% growth in 2026 (about half driven by inflation). The "$150B
  globally" figure was a U.S./global conflation; don't reuse it.
- **U.S. dog & pet breeders industry: $4.0B in 2025, declining**
  (IBISWorld) — revenue down 1.4% in 2024 with a further 1.2% drop
  projected through 2025. This is a real headwind and must be
  acknowledged. The thesis is "modernize a declining trust-broken
  segment," not "ride a growing wave."
- **Pet DNA testing market: $431M in 2025 → $687M by 2030 at ~9.8%
  CAGR** (Mordor Intelligence). This is the actually-growing adjacent
  category and the right one to partner with.
- **Pet tech VC: $346M raised across 37 rounds in 2025** (+103% YoY,
  small base; Tracxn). Pet + vet-related total ~$660M globally,
  roughly flat with 2024. Capital is available; the bar has risen.
- ~~"$11.2B pet breeding management software at 8.4% CAGR"~~ —
  **removed**. Not supported by any source surfaced in the 2026
  research pass. The actual category leader, BreederCloudPro, charges
  $6.99/mo and serves ~17k users (~$1.4M ARR estimated). Breeder-
  management SaaS as a standalone category does not yet support the
  numbers previously claimed.
- ~~"55% of pet owners concerned about unethical breeding"~~ —
  **needs a source** before reuse. Qualitative direction is correct
  (USDA documented 800+ violations at licensed dealers in 2024;
  California continues to crack down on the puppy-mill pipeline) but
  the specific 55% figure couldn't be traced to a primary survey.
- **Embark hit ~$94M total raised at $700M post-money in 2021** and
  has not raised since. Mars/Wisdom Panel reported 5M pets tested by
  March 2025. Both numbers prove the DNA-test category but also show
  the category leader's funding momentum has cooled — relevant when
  pitching adjacent.
- **AKC Marketplace already exists** at 1.4M buyers/year on $25
  sign-up + $45/litter pricing. It is the entrenched incumbent we
  compete against on trust, not a future partner without an LOI.
- **Classifieds incumbents** (Greenfield Puppies, PuppyFind,
  NextDayPets) work because they refuse operational responsibility.
  Our explicit choice to take that responsibility on (vet co-signs,
  COI flagging, license auto-screen) is both the moat and the
  margin/liability risk — the pitch must address this directly, not
  hand-wave past it.

**Comp table for valuation conversations:**
- Right comps: Modern Animal ($46M Series D, $100M ARR), Petfolk
  ($36M Series C), Embark ($700M post-2021, no raise since), pet-
  insurance (Lemonade $500M+ pet portfolio, Trupanion $1.2B
  premiums).
- Wrong comps to invite: Tinder, Hinge, Bumble (consumer-dating
  economics PawMatch will never see) or Rover/Wag (consumer
  marketplace where Rover already exited and Wag sits at $69M).

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
