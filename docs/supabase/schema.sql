-- PhytoScan Supabase schema
-- Run in the Supabase SQL editor, then create the public "plant-photos" Storage bucket.

create extension if not exists "pgcrypto";

-- Plant Passport: one row per scan.
create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  image_url text not null default '',
  name text,
  scientific_name text,
  confidence text,
  health_status text,
  diagnosis text,
  needs_water boolean default false,
  needs_medicine boolean default false,
  light_current text,
  light_recommendation text,
  care_watering text,
  care_soil text,
  toxicity text,
  environmental_impact text,
  fun_fact text,
  analysis_json jsonb,
  lat double precision,
  lng double precision,
  temp real,
  humidity real
);

-- Plant Doctor chat, one message per row, threaded by scan.
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.plants (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_scan_idx on public.chat_messages (scan_id, created_at);
create index if not exists plants_created_idx on public.plants (created_at desc);

-- Row Level Security: single-user app, allow anonymous read/write from the app.
alter table public.plants enable row level security;
alter table public.chat_messages enable row level security;

create policy "allow anon read plants" on public.plants for select using (true);
create policy "allow anon insert plants" on public.plants for insert with check (true);
create policy "allow anon read chat" on public.chat_messages for select using (true);
create policy "allow anon insert chat" on public.chat_messages for insert with check (true);

-- Storage bucket (create via dashboard or here):
-- insert into storage.buckets (id, name, public) values ('plant-photos', 'plant-photos', true)
--   on conflict (id) do nothing;
