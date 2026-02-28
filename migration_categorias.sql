-- ============================================================
-- MÓDULO B: Categorías jerárquicas en base de datos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Tabla de categorías con estructura de árbol
create table if not exists public.categorias (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  -- null user_id = categoría del sistema (no se pueden eliminar)
  parent_id   uuid references public.categorias(id) on delete cascade,
  nivel       int not null check (nivel between 1 and 4),
  nombre      text not null,
  icono       text default '📦',
  color       text default '#64748b',
  orden       int default 0,
  activa      boolean default true,
  es_sistema  boolean default false,
  created_at  timestamptz default now()
);

-- Índices para performance en queries jerárquicas
create index if not exists categorias_parent_idx   on public.categorias(parent_id);
create index if not exists categorias_user_idx     on public.categorias(user_id);
create index if not exists categorias_nivel_idx    on public.categorias(nivel);

-- RLS
alter table public.categorias enable row level security;

-- Los usuarios ven sus propias categorías + las del sistema
create policy "user sees own and system categories"
  on public.categorias for select
  using (user_id = auth.uid() or user_id is null);

create policy "user inserts own categories"
  on public.categorias for insert
  with check (user_id = auth.uid());

create policy "user updates own categories"
  on public.categorias for update
  using (user_id = auth.uid() and es_sistema = false);

create policy "user deletes own categories"
  on public.categorias for delete
  using (user_id = auth.uid() and es_sistema = false);

-- ============================================================
-- SEED: Insertar categorías del sistema (del CSV actual)
-- Nivel 1 primero, luego niveles inferiores con parent_id
-- ============================================================

-- Nivel 1
insert into public.categorias (nivel, nombre, icono, color, es_sistema, orden) values
  (1, 'Fijos',           '📌', '#1e40af', true, 1),
  (1, 'Variables',       '🛒', '#059669', true, 2),
  (1, 'Extraordinarios', '⚡', '#d97706', true, 3),
  (1, 'Imprevistos',     '🚨', '#dc2626', true, 4)
on conflict do nothing;

-- Helper para obtener el id de un nivel 1
-- Usamos una función temporal para el seed
do $$
declare
  id_fijos           uuid;
  id_variables       uuid;
  id_extraordinarios uuid;
  id_imprevistos     uuid;
  -- nivel 2
  id_servicios       uuid;
  id_alim_basica     uuid;
  id_higiene         uuid;
  id_permisibles     uuid;
  id_mejoras         uuid;
  id_energia_ext     uuid;
  id_otros_ext       uuid;
  id_emergencias     uuid;
begin
  select id into id_fijos           from public.categorias where nombre='Fijos'           and nivel=1 and es_sistema=true limit 1;
  select id into id_variables       from public.categorias where nombre='Variables'       and nivel=1 and es_sistema=true limit 1;
  select id into id_extraordinarios from public.categorias where nombre='Extraordinarios' and nivel=1 and es_sistema=true limit 1;
  select id into id_imprevistos     from public.categorias where nombre='Imprevistos'     and nivel=1 and es_sistema=true limit 1;

  -- Nivel 2 bajo Fijos
  insert into public.categorias (nivel, parent_id, nombre, es_sistema) values
    (2, id_fijos, 'Servicios Domiciliarios', true)
  on conflict do nothing returning id into id_servicios;
  if id_servicios is null then
    select id into id_servicios from public.categorias where nombre='Servicios Domiciliarios' and parent_id=id_fijos limit 1;
  end if;

  -- Nivel 3 bajo Servicios
  insert into public.categorias (nivel, parent_id, nombre, es_sistema) values
    (3, id_servicios, 'Energía Eléctrica', true),
    (3, id_servicios, 'Comunicaciones',    true),
    (3, id_servicios, 'Administración',    true)
  on conflict do nothing;

  -- Nivel 2 bajo Variables
  insert into public.categorias (nivel, parent_id, nombre, es_sistema) values
    (2, id_variables, 'Alimentación Básica',      true),
    (2, id_variables, 'Higiene y Limpieza',        true),
    (2, id_variables, 'Permisibles y Ocasionales', true)
  on conflict do nothing;

  select id into id_alim_basica   from public.categorias where nombre='Alimentación Básica'      and parent_id=id_variables limit 1;
  select id into id_higiene       from public.categorias where nombre='Higiene y Limpieza'        and parent_id=id_variables limit 1;
  select id into id_permisibles   from public.categorias where nombre='Permisibles y Ocasionales' and parent_id=id_variables limit 1;

  -- Nivel 3 bajo Alimentación Básica
  insert into public.categorias (nivel, parent_id, nombre, es_sistema) values
    (3, id_alim_basica, 'Proteínas Animales - Carnes Rojas', true),
    (3, id_alim_basica, 'Proteínas Animales - Cerdo',        true),
    (3, id_alim_basica, 'Proteínas Animales - Aves',         true),
    (3, id_alim_basica, 'Proteínas Animales - Otros',        true),
    (3, id_alim_basica, 'Fiambrería y Embutidos',            true),
    (3, id_alim_basica, 'Frutas',                            true),
    (3, id_alim_basica, 'Verduras',                          true),
    (3, id_alim_basica, 'Almacén - Conservas',               true),
    (3, id_alim_basica, 'Almacén - Bebidas',                 true),
    (3, id_alim_basica, 'Almacén - Otros',                   true),
    (3, id_alim_basica, 'Productos Dietéticos',              true),
    (3, id_alim_basica, 'Suplementos',                       true)
  on conflict do nothing;

  -- Nivel 3 bajo Higiene
  insert into public.categorias (nivel, parent_id, nombre, es_sistema) values
    (3, id_higiene, 'Limpieza del Hogar',  true),
    (3, id_higiene, 'Higiene Personal',    true)
  on conflict do nothing;

  -- Nivel 3 bajo Permisibles
  insert into public.categorias (nivel, parent_id, nombre, es_sistema) values
    (3, id_permisibles, 'Golosinas y Dulces',   true),
    (3, id_permisibles, 'Helados',               true),
    (3, id_permisibles, 'Panificados Especiales',true),
    (3, id_permisibles, 'Snacks y Picadas',      true)
  on conflict do nothing;

  -- Nivel 2 bajo Extraordinarios
  insert into public.categorias (nivel, parent_id, nombre, es_sistema) values
    (2, id_extraordinarios, 'Mejoras y Mantenimiento', true),
    (2, id_extraordinarios, 'Energía y Combustibles',  true),
    (2, id_extraordinarios, 'Otros Extraordinarios',   true)
  on conflict do nothing;

  select id into id_mejoras    from public.categorias where nombre='Mejoras y Mantenimiento' and parent_id=id_extraordinarios limit 1;
  select id into id_energia_ext from public.categorias where nombre='Energía y Combustibles'  and parent_id=id_extraordinarios limit 1;

  -- Nivel 3 bajo Mejoras
  insert into public.categorias (nivel, parent_id, nombre, es_sistema) values
    (3, id_mejoras, 'Reparaciones y Construcción',  true),
    (3, id_mejoras, 'Electricidad e Instalaciones', true),
    (3, id_mejoras, 'Otras Mejoras',                true)
  on conflict do nothing;

  -- Nivel 3 bajo Energía Extraordinarios
  insert into public.categorias (nivel, parent_id, nombre, es_sistema) values
    (3, id_energia_ext, 'Combustibles Gaseosos', true),
    (3, id_energia_ext, 'Combustibles Sólidos',  true),
    (3, id_energia_ext, 'Combustibles Líquidos', true)
  on conflict do nothing;

  -- Nivel 2 bajo Imprevistos
  insert into public.categorias (nivel, parent_id, nombre, es_sistema) values
    (2, id_imprevistos, 'Emergencias', true)
  on conflict do nothing;

end $$;

-- Verificar resultado
select nivel, nombre, es_sistema from public.categorias order by nivel, nombre;
