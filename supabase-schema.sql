-- Supabase
create table public.productos (
  id bigint generated always as identity primary key,
  nombre text not null,
  categoria text,
  cantidad integer not null default 0,
  precio numeric(10,2) default 0,
  minimo integer default 0,
  created_at timestamptz default now()
);
alter table public.productos enable row level security;
create policy "Acceso publico" on public.productos
  for all using (true) with check (true);
alter publication supabase_realtime add table public.productos;
