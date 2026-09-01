export const config = {
  n8nWebhookUrl: process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ?? "",
  n8nChatWebhookUrl: process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL ?? "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseBucket: process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? "plant-photos",
} as const;

export const hasSupabase = () =>
  config.supabaseUrl.trim() !== "" && config.supabaseAnonKey.trim() !== "";
