import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(10).max(128),
  displayName: z.string().trim().min(2).max(80),
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).optional().nullable(),
  bio: z.string().trim().max(1000).optional().nullable(),
  preferredUiLanguage: z.enum(["en", "ur", "khw"]).optional(),
  dialect: z.string().trim().max(120).optional().nullable(),
  region: z.string().trim().max(120).optional().nullable(),
  district: z.string().trim().max(120).optional().nullable(),
  village: z.string().trim().max(120).optional().nullable(),
  languages: z.array(z.string().trim().max(80)).max(20).optional(),
  contributorType: z.string().trim().max(120).optional().nullable(),
  profileVisibility: z.record(z.boolean()).optional(),
  audioConsent: z.boolean().optional(),
  researchConsent: z.boolean().optional(),
  modelTrainingConsent: z.boolean().optional(),
  datasetLicense: z.string().trim().max(200).optional().nullable(),
});

export const contributionSchema = z.object({
  clientId: z.string().uuid(),
  type: z.enum(["WORD", "SENTENCE", "TRANSLATION", "PROVERB", "STORY", "VOICE"]),
  title: z.string().trim().max(200).optional().nullable(),
  originalText: z.string().max(20000).optional().nullable(),
  normalizedText: z.string().max(20000).optional().nullable(),
  transliteration: z.string().max(20000).optional().nullable(),
  englishTranslation: z.string().max(20000).optional().nullable(),
  urduTranslation: z.string().max(20000).optional().nullable(),
  dialect: z.string().trim().max(120).optional().nullable(),
  region: z.string().trim().max(120).optional().nullable(),
  sourceType: z.string().trim().max(120).optional().nullable(),
  sourceDescription: z.string().trim().max(2000).optional().nullable(),
  license: z.string().trim().max(200).optional().nullable(),
  aiAssisted: z.boolean().default(false),
  aiAssistanceDescription: z.string().trim().max(4000).optional().nullable(),
});
