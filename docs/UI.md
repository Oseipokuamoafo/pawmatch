# PawMatch — UI Engineering Standards

Every screen, page, and component must meet this bar. No exceptions.

## Project rules

- Always apply the design system (cream bg, terracotta accents, Georgia headings).
- API routes always include auth check + Zod validation.
- Prisma queries always filter out `deletedAt IS NOT NULL` records.
- Suggest PostGIS extension usage for any location/proximity queries.
- Reference the phase roadmap in CLAUDE.md when suggesting what to build next.
- Keep components small and composable — this is a consumer app, not an admin panel.

## Interactive background

Every full-page layout (`/login`, `/register`, `/dashboard`, `/browse`, `/matches`, onboarding steps) must have a living, animated background. Pick the one that fits the page mood:

- **Floating orbs** (default, warm): 4–6 large blurred circles in terracotta/sand/cream tones that drift slowly using `@keyframes` with `translate` and `scale`. Use `mix-blend-mode: multiply` and `opacity: 0.4–0.6` so they feel atmospheric, not garish.
- **Particle field** (browse/match pages): lightweight canvas-based dot field with ~60 particles that slowly drift and draw faint connection lines when within 120px of each other. Terracotta `rgba(201,75,42,0.15)` lines, sand dots.
- **Mesh gradient** (onboarding): CSS `radial-gradient` layered 3–4 times at different positions, animated with `background-position` keyframes to create a slow colour-shift breathing effect. Palette stays within cream/terracotta/sand.
- **Paw print scatter** (pet profile pages): subtle SVG paw prints scattered at random positions, low opacity (`0.04–0.07`), slowly rotating or fading in/out.

All backgrounds must:
- Be `position: fixed; inset: 0; z-index: 0; pointer-events: none` — never block interaction
- Respect `@media (prefers-reduced-motion: reduce)` — freeze all animations if set
- Never cause layout shift or affect scroll performance (use `will-change: transform` on animated elements)

## Hover effects

Every interactive element must have a purposeful hover state.

**Cards** (pet cards, match cards, kennel cards):
```css
transition: transform 0.2s ease, box-shadow 0.2s ease;
/* hover */
transform: translateY(-4px) scale(1.01);
box-shadow: 0 12px 32px rgba(201, 75, 42, 0.12);
```

**Buttons — primary (terracotta)**:
```css
transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
/* hover */
background: #B03E22;
transform: translateY(-1px);
box-shadow: 0 6px 20px rgba(201, 75, 42, 0.35);
/* active */
transform: translateY(0) scale(0.98);
```

**Buttons — ghost/outline**:
```css
/* hover */
background: rgba(201, 75, 42, 0.06);
border-color: rgba(201, 75, 42, 0.4);
color: #C94B2A;
```

**Chip selectors**:
```css
transition: all 0.15s ease;
/* hover (unselected) */
border-color: #C94B2A;
color: #C94B2A;
background: rgba(201, 75, 42, 0.05);
```

**Navigation items**: 2px terracotta underline that slides in from left via `::after` pseudo-element with `scaleX(0) → scaleX(1)`. Color shifts to terracotta on hover.

**Pet/match cards — image area**: on hover, the image zooms slightly (`transform: scale(1.04)` with `transition: transform 0.4s ease` and `overflow: hidden` on the wrapper).

**Score rings and health bars**: on card hover, animate the ring stroke from 0 to its value using `stroke-dashoffset` transition. Health bars fill from left on mount/hover using `width` transition `0.6s ease-out`.

**Badges and pills**: `transform: scale(1.05)` on hover, `transition: transform 0.15s`.

## Micro-interactions and motion

- **Page transitions**: `framer-motion` `AnimatePresence` with subtle `y: 10 → 0, opacity: 0 → 1` on route change. 0.25s.
- **Match score reveal**: When a match card mounts, animate the score number counting up from 0 to its value over 0.8s using a custom `useCountUp` hook.
- **Live photo capture**: Viewfinder ring pulses (scale 1 → 1.05 → 1) at 1.5s intervals via CSS animation. Corner brackets animate in on mount with a draw effect.
- **Form inputs**: On focus, border color transitions from `border-secondary` to terracotta over 0.15s. Floating-label pattern — label floats up (`translateY(-20px) scale(0.85)`) when input has value.
- **Match request sent**: Heart icon does `scale(0) → scale(1.3) → scale(1)` pop on click; terracotta fill floods in.
- **Notifications / toasts**: Slide in from top-right with `translateX(100%) → translateX(0)`, auto-dismiss with a shrinking progress bar underneath.
- **Skeleton loaders**: Animated shimmer (`background-position` sweep left → right) in sand tones while data loads. Never show empty states without a skeleton.
- **COI warning banner**: When a flag fires, the banner drops in from above with `translateY(-100%) → translateY(0)` and a subtle shake (`@keyframes shake`) to draw attention.

## Specific components

**Browse feed** (`/browse`): Masonry or 2-column grid. Card lifts on hover. Pass — `translateX(-120%) rotate(-8deg)`. Match — `translateX(120%) rotate(8deg)`. Ghost outline remains briefly before next card slides up.

**Pedigree viewer**: Nodes glow with soft terracotta ring on hover (`box-shadow: 0 0 0 3px rgba(201,75,42,0.3)`). Connector lines draw themselves in on mount via SVG `stroke-dashoffset` animation. COI-flagged ancestors pulse amber.

**Onboarding steps**: Each step header is a full-bleed SVG illustration (bold colour blocks, no photography). Active step's illustration fades in with `opacity: 0 → 1` and `scale: 0.97 → 1`. Progress dots animate with a spring transition.

**Chat / messaging**: Messages bubble in from the bottom (`translateY(12px) → translateY(0)`) with staggered delay for consecutive messages. Typing indicator uses 3 dots with a wave animation.

## Implementation rules

- Use `framer-motion` for all JS-driven animations (`motion.div`, `AnimatePresence`, `useSpring`, `useMotionValue`).
- Use CSS `@keyframes` only for looping ambient effects (background orbs, pulse rings, shimmer).
- Never animate `width`, `height`, or `top/left` — always use `transform` and `opacity` for performance.
- Durations: micro (0.1–0.15s), standard (0.2–0.3s), expressive (0.4–0.6s), ambient (1.5s+).
- Every `transition` must specify exact properties — never `transition: all`.
- `will-change: transform` only on actively-animating elements — not globally.
- Test every animation mentally at 0.25× speed. If it looks broken slow, it's broken.
