import { z } from "zod";

export const patientSchema = z.object({
  patientId: z.string().min(1).optional(),
  name: z.string().min(1),
  sex: z.enum(["M", "F", "Other"]).optional(),
  birthDate: z.string().min(1).optional(), // ISO string 권장
  visitDate: z.string().min(1).optional(),
});

export const evaluationSchema = z.object({
  chiefComplaint: z.string().min(1),
  history: z.string().optional(),
  painScaleNRS: z.number().min(0).max(10).optional(),
  observation: z.string().optional(),
  palpation: z.string().optional(),
  rom: z.string().optional(),
  mmt: z.string().optional(),
  specialTests: z.string().optional(),
  functionalLimitations: z.string().optional(),
});

export const planSchema = z.object({
  goalsShortTerm: z.string().optional(),
  goalsLongTerm: z.string().optional(),
  interventions: z.string().optional(),
  homeExerciseProgram: z.string().optional(),
  frequencyDuration: z.string().optional(),
  precautions: z.string().optional(),
});

export const soapGenerateRequestSchema = z.object({
  locale: z.enum(["ko", "en"]).default("ko").optional(),
  patient: patientSchema,
  evaluation: evaluationSchema,
  plan: planSchema.optional(),
  therapistNotes: z.string().optional(),
});

export type SoapGenerateRequest = z.infer<typeof soapGenerateRequestSchema>;

export const soapNoteSchema = z.object({
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
  warnings: z.array(z.string()).default([]),
});

export type SoapNote = z.infer<typeof soapNoteSchema>;

