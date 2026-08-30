import { config } from "./config";
import { PlantAnalysisSchema, type ChatMessage, type PlantAnalysis } from "./types";

type ScanPayload = {
  imageUrl?: string;
  lat?: number | null;
  lng?: number | null;
};

type AnalyzeResponse = {
  analysis: PlantAnalysis;
  temp?: number | null;
  humidity?: number | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (v == null) return "";
  return String(v);
}

function asBoolean(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = asString(v).toLowerCase();
  return s === "true" || s === "yes" || s === "y" || s === "1";
}

function confidenceString(v: unknown): string {
  const s = asString(v);
  if (s === "") return "Unknown";
  if (s.includes("%")) return s.endsWith("%") ? s : `${s}%`;
  const n = Number(s);
  if (Number.isFinite(n)) {
    return `${Math.round(n >= 0 && n <= 1 ? n * 100 : n)}%`;
  }
  return s;
}

function enumMatch(v: unknown, allowed: [string, string, string]): string {
  const s = asString(v).toLowerCase();
  if (s === "") return allowed[0];
  const exact = allowed.find((a) => a.toLowerCase() === s);
  if (exact) return exact;
  const partial = allowed.find((a) => s.includes(a.toLowerCase()));
  return partial ?? allowed[0];
}

function statusString(v: unknown): "Healthy" | "Warning" | "Critical" {
  return enumMatch(v, ["Healthy", "Warning", "Critical"]) as
    | "Healthy"
    | "Warning"
    | "Critical";
}

function toxicityString(v: unknown): "Safe" | "Toxic for pets" {
  const s = asString(v).toLowerCase();
  if (s === "") return "Safe";
  if (s.includes("friendly") || s.includes("non-toxic") || s.includes("safe")) return "Safe";
  return "Toxic for pets";
}

function coerceAnalysis(input: unknown): PlantAnalysis {
  const o = isRecord(input) ? input : {};
  const id = isRecord(o.identification) ? o.identification : {};
  const ha = isRecord(o.health_assessment) ? o.health_assessment : {};
  const la = isRecord(o.light_analysis) ? o.light_analysis : {};
  const ci = isRecord(o.care_instructions) ? o.care_instructions : {};

  const name = asString(id.name) || "Unknown";
  const scientificName = asString(id.scientific_name) || name;

  return {
    identification: {
      name,
      scientific_name: scientificName,
      confidence: confidenceString(id.confidence),
    },
    health_assessment: {
      status: statusString(ha.status),
      diagnosis: asString(ha.diagnosis) || "No specific issue reported.",
      needs_water: asBoolean(ha.needs_water),
      needs_medicine: asBoolean(ha.needs_medicine),
    },
    light_analysis: {
      current_light: asString(la.current_light) || "No data",
      recommendation: asString(la.recommendation) || "No data",
    },
    care_instructions: {
      watering_frequency: asString(ci.watering_frequency) || "Not specified",
      soil_type: asString(ci.soil_type) || "Not specified",
      toxicity: toxicityString(ci.toxicity),
    },
    environmental_impact: asString(o.environmental_impact) || "Not specified",
    fun_fact: asString(o.fun_fact) || "No fun fact available.",
  };
}

export async function analyzePlant(
  payload: ScanPayload,
): Promise<AnalyzeResponse> {
  if (config.n8nWebhookUrl.trim() === "") {
    throw new Error(
      "Plant analysis is not configured. Set NEXT_PUBLIC_N8N_WEBHOOK_URL to enable scans.",
    );
  }

  const res = await fetch(config.n8nWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Analysis failed (${res.status})`);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    const text = await res.text().catch(() => "");
    throw new Error(
      text.trim()
        ? `Analysis service returned a non-JSON response: ${text.slice(0, 200)}`
        : "Analysis service returned an empty response. Check that the n8n workflow is active and returns the analysis JSON.",
    );
  }
  if (!isRecord(json)) {
    throw new Error("Unexpected response from analysis service");
  }

  const rawAnalysis: unknown = json.analysis ?? json;
  const parsed = PlantAnalysisSchema.safeParse(coerceAnalysis(rawAnalysis));
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(
      `Analysis response did not match the expected schema (${issues})`,
    );
  }

  return {
    analysis: parsed.data,
    temp: typeof json.temp === "number" ? json.temp : null,
    humidity: typeof json.humidity === "number" ? json.humidity : null,
  };
}

export async function sendPlantDoctorMessage(
  scanId: string,
  imageUrl: string,
  history: ChatMessage[],
  message: string,
): Promise<string> {
  if (config.n8nChatWebhookUrl.trim() === "") {
    throw new Error(
      "Plant Doctor chat is not configured. Set NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL to enable chat.",
    );
  }

  const res = await fetch(config.n8nChatWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scanId,
      imageUrl,
      message,
      history: history.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) throw new Error(`Chat failed (${res.status})`);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    const text = await res.text().catch(() => "");
    throw new Error(
      text.trim()
        ? `Chat service returned a non-JSON response: ${text.slice(0, 200)}`
        : "Chat service returned an empty response. Check that the n8n chat workflow is active and returns text.",
    );
  }
  const record = (typeof json === "object" && json !== null ? json : {}) as Record<
    string,
    unknown
  >;
  const reply =
    typeof json === "string"
      ? json
      : typeof record.reply === "string"
        ? record.reply
        : typeof record.content === "string"
          ? record.content
          : "";
  if (typeof reply !== "string" || reply.trim() === "") {
    throw new Error("Empty chat response");
  }
  return reply;
}
