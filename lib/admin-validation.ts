import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().email().max(254).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(128),
});
