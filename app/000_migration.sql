-- ============================================================
-- MIGRACIÓN COMPLETA — Módulos: Config + Recurrentes + Widget
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── MÓDULO A: CONFIGURACIÓN ────────────────────────────────

create table if not exists public.user_settings (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  theme           text default 'system',      -- 'light' | 'dark' | 'system'
  language        text default 'es',          -- 'es' | 'en'
  currency        text default 'ARS',
  currency_symbol text default '$',
  date_format     text default 'DD/MM/YYYY',  -- 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  custom_categories jsonb default '[]'::jsonb, -- categorías personalizadas del usuario
  updated_at      timestamptz default now()
);

alter table public.user_settings enable row level security;

create policy "user sees own settings"
  on public.user_settings for select using (auth.uid() = user_id);
create policy "user inserts own settings"
  on public.user_settings for insert with check (auth.uid() = user_id);
create policy "user updates own settings"
  on public.user_settings for update using (auth.uid() = user_id);

-- ─── MÓDULO B: GASTOS RECURRENTES ───────────────────────────

create table if not exists public.recurring_expenses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  -- categoría (mismo esquema que gastos)
  n1             text not null,
  n2             text not null,
  n3             text not null,
  n4             text not null,
  monto          numeric not null,
  unidad         text default 'unidad',
  observaciones  text,
  -- recurrencia
  frecuencia     text not null check (frecuencia in ('diaria','semanal','quincenal','mensual','custom')),
  intervalo_dias int,               -- solo para frecuencia='custom'
  dia_del_mes    int,               -- 1-28, para frecuencia='mensual'
  dia_semana     int,               -- 0=dom..6=sab, para frecuencia='semanal'
  fecha_inicio   date not null,
  fecha_fin      date,              -- null = sin fin
  -- estado
  activo         boolean default true,
  ultimo_proceso date,              -- última fecha en que se generó un gasto
  -- metadata
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table public.recurring_expenses enable row level security;

create policy "user sees own recurring"
  on public.recurring_expenses for select using (auth.uid() = user_id);
create policy "user inserts own recurring"
  on public.recurring_expenses for insert with check (auth.uid() = user_id);
create policy "user updates own recurring"
  on public.recurring_expenses for update using (auth.uid() = user_id);
create policy "user deletes own recurring"
  on public.recurring_expenses for delete using (auth.uid() = user_id);

-- FK en gastos para vincular con recurrente (columna opcional)
alter table public.gastos
  add column if not exists recurring_id uuid references public.recurring_expenses(id) on delete set null;

-- ─── MÓDULO B: NOTIFICACIONES INTERNAS ──────────────────────

create table if not exists public.notificaciones (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  tipo       text default 'recurrente',
  mensaje    text not null,
  leida      boolean default false,
  data       jsonb,                -- datos extra (ej: id del gasto generado)
  created_at timestamptz default now()
);

alter table public.notificaciones enable row level security;

create policy "user sees own notifications"
  on public.notificaciones for select using (auth.uid() = user_id);
create policy "user updates own notifications"
  on public.notificaciones for update using (auth.uid() = user_id);

-- ─── EDGE FUNCTION: proceso de recurrentes ──────────────────
-- INSTRUCCIONES:
-- 1. Ir a Supabase Dashboard → Edge Functions → New Function → nombre: "process-recurring"
-- 2. Pegar el código del archivo: supabase/functions/process-recurring/index.ts
-- 3. Luego habilitar pg_cron en Extensions y ejecutar:

-- Verificar que pg_cron esté habilitado:
-- create extension if not exists pg_cron;

-- Programar ejecución diaria a las 03:00 UTC (00:00 Argentina):
-- select cron.schedule(
--   'process-recurring-expenses',
--   '5 3 * * *',
--   $$select net.http_post(
--     url := 'https://TU_PROJECT_ID.supabase.co/functions/v1/process-recurring',
--     headers := '{"Authorization": "Bearer TU_ANON_KEY"}'::jsonb
--   )$$
-- );
