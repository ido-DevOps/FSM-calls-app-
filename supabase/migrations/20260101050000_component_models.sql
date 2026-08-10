-- ============================================================================
-- Solaris FSM — Component model catalog
--
-- A simple (category, model) catalog for the Add Item dropdown — Model Type
-- (e.g. optimizer, inverter, panel, battery, fan) narrows the Model list to
-- just that category. New rows are added on the fly via the "+ Add Model"
-- action, so the list grows as new part types show up.
-- ============================================================================

create table public.component_models (
  id           uuid primary key default gen_random_uuid(),
  category     text not null,
  model_name   text not null,
  created_at   timestamptz not null default now(),
  unique (category, model_name)
);

comment on table public.component_models is
  'Category/model catalog used to populate the Add Item dropdowns.';

create index idx_component_models_category on public.component_models (category);

alter table public.component_models enable row level security;

create policy "Component models are viewable by any authenticated user"
  on public.component_models for select
  to authenticated
  using (true);

create policy "Admins and warehouse managers can manage component models"
  on public.component_models for all
  to authenticated
  using (public.current_user_role() in ('admin', 'warehouse_manager'))
  with check (public.current_user_role() in ('admin', 'warehouse_manager'));

grant select, insert, update, delete on public.component_models to authenticated;
