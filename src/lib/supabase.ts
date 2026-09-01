import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config, hasSupabase } from "./config";
import { dataUrlToBlob } from "./utils";

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
  const buffer = await dataUrlToBlob(base64);
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
  const filePath = `${scanId}.jpg`;
  await db.storage.from(config.supabaseBucket).remove([filePath]);
}
