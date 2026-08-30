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
  if (s === "") return "غير معروف";
  if (s.includes("%")) return s.endsWith("%") ? s : `${s}%`;
  const n = Number(s);
  if (Number.isFinite(n)) {
    return `${Math.round(n >= 0 && n <= 1 ? n * 100 : n)}%`;
  }
  return s;
}

const STATUS_ALIASES: Record<string, string> = {
  healthy: "صحي",
  "صحي": "صحي",
  سليم: "صحي",
  جيدة: "صحي",
  warning: "إنذار",
  إنذار: "إنذار",
  تحذير: "إنذار",
  متوسط: "إنذار",
  critical: "حرج",
  حرج: "حرج",
  حرجة: "حرج",
  خطير: "حرج",
};

const SAFE_TOXICITY_TOKENS = [
  "safe",
  "friendly",
  "non-toxic",
  "nontoxic",
  "غير سام",
  "آمن",
  "لطيف",
];

export function statusString(
  v: unknown,
): PlantAnalysis["health_assessment"]["status"] {
  const s = asString(v).toLowerCase();
  if (s === "") return "صحي";
  const exact = STATUS_ALIASES[s];
  if (exact) return exact as PlantAnalysis["health_assessment"]["status"];
  for (const [key, value] of Object.entries(STATUS_ALIASES)) {
    if (s.includes(key)) return value as PlantAnalysis["health_assessment"]["status"];
  }
  return "صحي";
}

export function toxicityString(
  v: unknown,
): PlantAnalysis["care_instructions"]["toxicity"] {
  const s = asString(v).toLowerCase();
  if (s === "") return "آمن للحيوانات الأليفة";
  if (SAFE_TOXICITY_TOKENS.some((t) => s.includes(t))) {
    return "آمن للحيوانات الأليفة";
  }
  return "سام للحيوانات الأليفة";
}

function coerceAnalysis(input: unknown): PlantAnalysis {
  const o = isRecord(input) ? input : {};
  const id = isRecord(o.identification) ? o.identification : {};
  const ha = isRecord(o.health_assessment) ? o.health_assessment : {};
  const la = isRecord(o.light_analysis) ? o.light_analysis : {};
  const ci = isRecord(o.care_instructions) ? o.care_instructions : {};

  const name = asString(id.name) || "غير معروف";
  const scientificName = asString(id.scientific_name) || name;

  return {
    identification: {
      name,
      scientific_name: scientificName,
      confidence: confidenceString(id.confidence),
    },
    health_assessment: {
      status: statusString(ha.status),
      diagnosis: asString(ha.diagnosis) || "لا توجد مشكلة محدّدة.",
      needs_water: asBoolean(ha.needs_water),
      needs_medicine: asBoolean(ha.needs_medicine),
    },
    light_analysis: {
      current_light: asString(la.current_light) || "لا توجد بيانات",
      recommendation: asString(la.recommendation) || "لا توجد بيانات",
    },
    care_instructions: {
      watering_frequency: asString(ci.watering_frequency) || "غير محدّد",
      soil_type: asString(ci.soil_type) || "غير محدّد",
      toxicity: toxicityString(ci.toxicity),
    },
    environmental_impact: asString(o.environmental_impact) || "غير محدّد",
    fun_fact: asString(o.fun_fact) || "لا توجد معلومة طريفة حاليًا.",
  };
}

export async function analyzePlant(
  payload: ScanPayload,
): Promise<AnalyzeResponse> {
  if (config.n8nWebhookUrl.trim() === "") {
    throw new Error(
      "تحليل النبات غير مُهيّأ. عيّن NEXT_PUBLIC_N8N_WEBHOOK_URL لتفعيل الفحص.",
    );
  }

  const res = await fetch(config.n8nWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`تعذّر التحليل (${res.status})`);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    const text = await res.text().catch(() => "");
    throw new Error(
      text.trim()
        ? `أعادت خدمة التحليل استجابة غير JSON: ${text.slice(0, 200)}`
        : "أعادت خدمة التحليل استجابة فارغة. تأكّد من أن سير عمل n8n مفعّل ويعيد JSON التحليل.",
    );
  }
  if (!isRecord(json)) {
    throw new Error("استجابة غير متوقّعة من خدمة التحليل");
  }

  const rawAnalysis: unknown = json.analysis ?? json;
  const parsed = PlantAnalysisSchema.safeParse(coerceAnalysis(rawAnalysis));
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(
      `استجابة التحليل لا تطابق البنية المتوقّعة (${issues})`,
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
      "محادثة الطبيب النباتي غير مُهيّأة. عيّن NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL لتفعيل المحادثة.",
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

  if (!res.ok) throw new Error(`تعذّرت المحادثة (${res.status})`);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    const text = await res.text().catch(() => "");
    throw new Error(
      text.trim()
        ? `أعادت خدمة المحادثة استجابة غير JSON: ${text.slice(0, 200)}`
        : "أعادت خدمة المحادثة استجابة فارغة. تأكّد من أن سير عمل المحادثة مفعّل ويعيد نصًا.",
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
    throw new Error("استجابة المحادثة فارغة");
  }
  return reply;
}
