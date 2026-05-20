import { z } from "zod";

export const contractTemplateEnum = z.enum([
  "STANDARD_BREEDING",
  "STUD_SERVICE",
  "PUPPY_PLACEMENT",
]);

export const createContractSchema = z.object({
  template: contractTemplateEnum,
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
