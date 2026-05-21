import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest";
import { screenVetApplication } from "@/lib/jobs/screen-vet";

/**
 * The Inngest function handler endpoint. Inngest's cloud (in prod) or
 * the local Dev Server (in dev) calls this URL to invoke registered
 * functions. Auto-detects the right mode from env.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [screenVetApplication],
});
