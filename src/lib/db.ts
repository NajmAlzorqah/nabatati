import { deletePlantImage, getSupabase } from "./supabase";
import { statusString, toxicityString } from "./analysis";
import { randomId } from "./utils";
import type { ChatMessage, PlantAnalysis, ScanResult } from "./types";

const LS_SCANS_KEY = "phytoscan-scans";
const LS_CHAT_PREFIX = "phytoscan-chat-";

type ScanInsert = Omit<ScanResult, "id" | "createdAt"> & { id: string; createdAt: string };

export async function saveScan(result: ScanResult): Promise<void> {
  const db = getSupabase();
  if (db) {
    const a = result.analysis;
    const { error } = await db.from("plants").insert({
      id: result.id,
      image_url: result.imageUrl,
      name: a.identification.name,
      scientific_name: a.identification.scientific_name,
      confidence: a.identification.confidence,
      health_status: a.health_assessment.status,
      diagnosis: a.health_assessment.diagnosis,
      needs_water: a.health_assessment.needs_water,
      needs_medicine: a.health_assessment.needs_medicine,
      light_current: a.light_analysis.current_light,
      light_recommendation: a.light_analysis.recommendation,
      care_watering: a.care_instructions.watering_frequency,
      care_soil: a.care_instructions.soil_type,
      toxicity: a.care_instructions.toxicity,
      environmental_impact: a.environmental_impact,
      fun_fact: a.fun_fact,
      analysis_json: a,
      lat: result.lat ?? null,
      lng: result.lng ?? null,
      temp: result.temp ?? null,
      humidity: result.humidity ?? null,
      created_at: result.createdAt,
    });
    if (error) throw new Error(error.message);
    return;
  }
  // localStorage fallback for demo / unconfigured mode.
  const scans = readLS();
  const row: ScanInsert = {
    ...result,
    // include all mapped fields used by the passport UI
  } as ScanInsert;
  scans.unshift(row as unknown as ScanResult);
  localStorage.setItem(LS_SCANS_KEY, JSON.stringify(scans.slice(0, 50)));
}

export async function getRecentScans(limit = 10): Promise<ScanResult[]> {
  const db = getSupabase();
  if (db) {
    const { data, error } = await db
      .from("plants")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => toScanResult(row));
  }
  return readLS().slice(0, limit);
}

export async function deleteScan(scanId: string): Promise<void> {
  const db = getSupabase();
  if (db) {
    // chat_messages cascade via the plants FK (ON DELETE CASCADE); explicitly
    // remove the stored image too.
    await deletePlantImage(scanId);
    const { error } = await db.from("plants").delete().eq("id", scanId);
    if (error) throw new Error(error.message);
    return;
  }
  // localStorage fallback for demo / unconfigured mode.
  const scans = readLS().filter((s) => s.id !== scanId);
  localStorage.setItem(LS_SCANS_KEY, JSON.stringify(scans));
  localStorage.removeItem(LS_CHAT_PREFIX + scanId);
}

export async function saveChatMessage(
  scanId: string,
  role: "user" | "assistant",
  content: string,
): Promise<void> {
  const db = getSupabase();
  if (db) {
    const { error } = await db
      .from("chat_messages")
      .insert({ scan_id: scanId, role, content });
    if (error) throw new Error(error.message);
    return;
  }
  const key = LS_CHAT_PREFIX + scanId;
  const msgs: ChatMessage[] = JSON.parse(localStorage.getItem(key) ?? "[]");
  msgs.push({
    id: randomId(),
    scanId,
    role,
    content,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(key, JSON.stringify(msgs));
}

export async function getChatMessages(scanId: string): Promise<ChatMessage[]> {
  const db = getSupabase();
  if (db) {
    const { data, error } = await db
      .from("chat_messages")
      .select("*")
      .eq("scan_id", scanId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      scanId: row.scan_id,
      role: row.role as ChatMessage["role"],
      content: row.content,
      createdAt: row.created_at,
    }));
  }
  const key = LS_CHAT_PREFIX + scanId;
  return JSON.parse(localStorage.getItem(key) ?? "[]");
}

function readLS(): ScanResult[] {
  try {
    return JSON.parse(localStorage.getItem(LS_SCANS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

type PlantRow = {
  id: string;
  image_url: string | null;
  name: string | null;
  scientific_name: string | null;
  confidence: string | null;
  health_status: string | null;
  diagnosis: string | null;
  needs_water: boolean | null;
  needs_medicine: boolean | null;
  light_current: string | null;
  light_recommendation: string | null;
  care_watering: string | null;
  care_soil: string | null;
  toxicity: string | null;
  environmental_impact: string | null;
  fun_fact: string | null;
  analysis_json: PlantAnalysis | null;
  temp: number | null;
  humidity: number | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

function toScanResult(row: PlantRow): ScanResult {
  // analysis_json may be missing or partially populated for old/malformed
  // rows; treat it as a sloppy object the callers fall back through.
  const a = (row.analysis_json ?? {}) as Partial<PlantAnalysis>;
  return {
    id: row.id,
    imageUrl: row.image_url ?? "",
    analysis: {
      identification: {
        name: row.name ?? a.identification?.name ?? "نبات",
        scientific_name: row.scientific_name ?? a.identification?.scientific_name ?? "",
        confidence: row.confidence ?? a.identification?.confidence ?? "",
      },
      health_assessment: {
        status: statusString(
          row.health_status ?? a.health_assessment?.status ?? "صحي",
        ),
        diagnosis: row.diagnosis ?? a.health_assessment?.diagnosis ?? "",
        needs_water: row.needs_water ?? a.health_assessment?.needs_water ?? false,
        needs_medicine:
          row.needs_medicine ?? a.health_assessment?.needs_medicine ?? false,
      },
      light_analysis: {
        current_light: row.light_current ?? a.light_analysis?.current_light ?? "",
        recommendation:
          row.light_recommendation ?? a.light_analysis?.recommendation ?? "",
      },
      care_instructions: {
        watering_frequency: row.care_watering ?? a.care_instructions?.watering_frequency ?? "",
        soil_type: row.care_soil ?? a.care_instructions?.soil_type ?? "",
        toxicity: toxicityString(
          row.toxicity ?? a.care_instructions?.toxicity ?? "آمن للحيوانات الأليفة",
        ),
      },
      environmental_impact:
        row.environmental_impact ?? a.environmental_impact ?? "",
      fun_fact: row.fun_fact ?? a.fun_fact ?? "",
    },
    temp: row.temp ?? null,
    humidity: row.humidity ?? null,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    createdAt: row.created_at,
  };
}
