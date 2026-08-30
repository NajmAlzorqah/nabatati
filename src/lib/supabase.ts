import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config, hasSupabase } from "./config";

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  if (client === undefined) {
    client = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }
  return client;
}

export async function uploadPlantImage(
  base64: string,
  scanId: string,
): Promise<string> {
  const db = getSupabase();
  if (!db) throw new Error("Supabase is not configured");
  const filePath = `${scanId}.jpg`;
  const buffer = dataUrlToBlob(base64);
  const { error } = await db.storage
    .from(config.supabaseBucket)
    .upload(filePath, buffer, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);
  const { data } = db.storage.from(config.supabaseBucket).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function deletePlantImage(scanId: string): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  // Best-effort: a missing object should not block the row delete.
  const filePath = `${scanId}.jpg`;
  await db.storage.from(config.supabaseBucket).remove([filePath]);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
