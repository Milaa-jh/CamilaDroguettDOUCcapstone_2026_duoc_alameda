-- EduVault Modular — Color de etiqueta para el material de estudio
-- Ejecutar UNA VEZ en el SQL Editor de Supabase.
-- La columna es opcional: si un material no tiene color, la app usa uno automático según su tipo.

alter table public.materials
  add column if not exists color text;
