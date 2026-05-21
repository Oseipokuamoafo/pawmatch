import Stripe from "stripe";

/**
 * Lazily-constructed Stripe client. Throws on first use if the secret
 * key isn't configured — call sites should catch and surface a clear
 * "Stripe not configured" error instead of bubbling the stack trace.
 *
 * Constructed lazily (rather than at module load) so the rest of the
 * app boots even without STRIPE_SECRET_KEY set — important for the
 * dev experience where billing is opt-in.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY not configured. Set it in .env.local to enable billing.",
    );
  }
  _stripe = new Stripe(key, {
    // The Stripe SDK pins this internally; we don't need to override.
    // Leaving the option implicit means our integration always matches
    // the SDK's tested surface.
    typescript: true,
  });
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
