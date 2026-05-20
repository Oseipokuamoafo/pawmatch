import { z } from "zod";

export const createMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message can't be empty")
    .max(2000, "Message is too long (2000 char max)"),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
