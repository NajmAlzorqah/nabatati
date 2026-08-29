import { config } from "./config";
import { PlantAnalysisSchema, type ChatMessage, type PlantAnalysis } from "./types";

type ScanPayload = {
  base64Image?: string;
  imageUrl?: string;
  lat?: number | null;
  lng?: number | null;
};

type AnalyzeResponse = {
  analysis: PlantAnalysis;
  temp?: number | null;
  humidity?: number | null;
};

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
  const data = json as AnalyzeResponse;

  if (!data || typeof data !== "object" || !("analysis" in data)) {
    // Some N8N setups return the analysis object directly.
    const parsed = PlantAnalysisSchema.safeParse(json);
    if (parsed.success) return { analysis: parsed.data };
    throw new Error("Unexpected response from analysis service");
  }

  const parsed = PlantAnalysisSchema.safeParse(data.analysis);
  if (!parsed.success) {
    throw new Error("Response did not match the expected analysis schema");
  }

  return { analysis: parsed.data, temp: data.temp ?? null, humidity: data.humidity ?? null };
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
