import { z } from "zod";

export const PlantAnalysisSchema = z.object({
  identification: z.object({
    name: z.string(),
    scientific_name: z.string(),
    confidence: z.string(),
  }),
  health_assessment: z.object({
    status: z.enum(["Healthy", "Warning", "Critical"]),
    diagnosis: z.string(),
    needs_water: z.boolean(),
    needs_medicine: z.boolean(),
  }),
  light_analysis: z.object({
    current_light: z.string(),
    recommendation: z.string(),
  }),
  care_instructions: z.object({
    watering_frequency: z.string(),
    soil_type: z.string(),
    toxicity: z.enum(["Safe", "Toxic for pets"]),
  }),
  environmental_impact: z.string(),
  fun_fact: z.string(),
});

export type PlantAnalysis = z.infer<typeof PlantAnalysisSchema>;

export type ScanState = "idle" | "uploading" | "analyzing" | "result";

export type ScanResult = {
  id: string;
  imageUrl: string;
  analysis: PlantAnalysis;
  temp?: number | null;
  humidity?: number | null;
  lat?: number | null;
  lng?: number | null;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  scanId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};
