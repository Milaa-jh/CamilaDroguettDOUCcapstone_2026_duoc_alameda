-- ============================================================
-- EduVault Modular — Bloques de material (ej.: "1.1 Hablemos de Big Data")
-- Ejecutar UNA VEZ en el SQL Editor de Supabase.
-- Se puede volver a ejecutar sin problema (no duplica nada).
--
-- Estructura: Unidad -> Material (bloque con nombre libre) -> Archivos (apuntes, textos, PDF...)
-- ============================================================

-- 1) Tabla de bloques de material
create table if not exists public.material_groups (
  id uuid primary key default uuid_generate_v4(),
  unit_id uuid not null references public.units(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_material_groups_unit_id on public.material_groups(unit_id);

drop trigger if exists set_updated_at on public.material_groups;
create trigger set_updated_at before update on public.material_groups
  for each row execute procedure public.set_updated_at();

-- 2) Cada archivo pertenece a un bloque
alter table public.materials
  add column if not exists group_id uuid references public.material_groups(id) on delete cascade;
create index if not exists idx_materials_group_id on public.materials(group_id);

-- 3) Seguridad: cada estudiante solo ve y modifica sus propios bloques
alter table public.material_groups enable row level security;

drop policy if exists "material_groups_select_own" on public.material_groups;
create policy "material_groups_select_own" on public.material_groups
  for select using (
    exists (
      select 1 from public.units u
      join public.subjects s on s.id = u.subject_id
      where u.id = material_groups.unit_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "material_groups_insert_own" on public.material_groups;
create policy "material_groups_insert_own" on public.material_groups
  for insert with check (
    exists (
      select 1 from public.units u
      join public.subjects s on s.id = u.subject_id
      where u.id = material_groups.unit_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "material_groups_update_own" on public.material_groups;
create policy "material_groups_update_own" on public.material_groups
  for update using (
    exists (
      select 1 from public.units u
      join public.subjects s on s.id = u.subject_id
      where u.id = material_groups.unit_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "material_groups_delete_own" on public.material_groups;
create policy "material_groups_delete_own" on public.material_groups
  for delete using (
    exists (
      select 1 from public.units u
      join public.subjects s on s.id = u.subject_id
      where u.id = material_groups.unit_id and s.user_id = auth.uid()
    )
  );

-- 4) Migrar el material que ya existe: por cada unidad con archivos sueltos
--    se crea un bloque "Material general" y se mueven ahí.
with new_groups as (
  insert into public.material_groups (unit_id, name)
  select distinct unit_id, 'Material general'
  from public.materials
  where group_id is null
  returning id, unit_id
)
update public.materials m
set group_id = g.id
from new_groups g
where m.unit_id = g.unit_id
  and m.group_id is null;
