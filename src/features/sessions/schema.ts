import { z } from "zod";

export const sessionBundleInputSchema = z.object({
  patientId: z.string().uuid(),

  session: z
    .object({
      startedAt: z.string().datetime().optional(),
      endedAt: z.string().datetime().nullable().optional(),
      location: z.string().nullable().optional(),
      status: z.string().nullable().optional(),
      sessionNo: z.number().int().min(1).nullable().optional(),
    })
    .optional(),

  soap: z
    .object({
      subjective: z.string().nullable().optional(),
      adlLimitations: z.string().nullable().optional(),
      assessment: z.string().nullable().optional(),
      plan: z.string().nullable().optional(),
      aiGeneratedNote: z.string().nullable().optional(),
      aiModel: z.string().nullable().optional(),
      aiPromptVersion: z.string().nullable().optional(),
      isFinal: z.boolean().optional(),
    })
    .optional(),

  assessment: z
    .object({
      enabled: z.boolean().default(true).optional(),
      assessedAt: z.string().datetime().optional(),

      rom: z.string().nullable().optional(),
      mmt: z.string().nullable().optional(),
      specialTests: z.string().nullable().optional(),

      painVasMm: z.number().int().min(0).max(100).nullable().optional(),
      painNrs: z.number().int().min(0).max(10).nullable().optional(),

      breathingScore: z.number().int().min(0).max(10).nullable().optional(),
      breathingNotes: z.string().nullable().optional(),
      centeringScore: z.number().int().min(0).max(10).nullable().optional(),
      centeringNotes: z.string().nullable().optional(),
      ribcagePlacementScore: z.number().int().min(0).max(10).nullable().optional(),
      ribcagePlacementNotes: z.string().nullable().optional(),
      shoulderGirdleOrgScore: z.number().int().min(0).max(10).nullable().optional(),
      shoulderGirdleOrgNotes: z.string().nullable().optional(),
      headNeckPlacementScore: z.number().int().min(0).max(10).nullable().optional(),
      headNeckPlacementNotes: z.string().nullable().optional(),

      extra: z.record(z.string(), z.any()).optional(),
    })
    .optional(),
});

export type SessionBundleInput = z.infer<typeof sessionBundleInputSchema>;

