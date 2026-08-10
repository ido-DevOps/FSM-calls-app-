-- ============================================================================
-- Solaris FSM — Initial Schema
-- Field Service Management & Inventory for solar installation/maintenance
-- ============================================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

create type public.user_role as enum (
  'admin',
  'warehouse_manager',
  'technician'
);

create type public.call_status as enum (
  'open',
  'in_progress',
  'pending_parts',
  'completed',
  'cancelled'
);

create type public.item_status as enum (
  'in_warehouse',
  'with_technician',
  'installed',
  'defective_returned'
);

create type public.photo_type as enum (
  'before_repair',
  'defective_part',
  'new_part',
  'production_proof',
  'general'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- profiles: extends auth.users with app-specific role & info
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        public.user_role not null default 'technician',
  phone       text,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is 'Extends auth.users with app-specific roles and basic info.';

-- inventory_items: physical solar components tracked by serial number
create table public.inventory_items (
  id                uuid primary key default gen_random_uuid(),
  serial_number     text not null unique,
  model_name        text not null,
  category          text,
  status            public.item_status not null default 'in_warehouse',
  current_owner_id  uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now()
);

comment on table public.inventory_items is 'Tracks physical solar components by unique serial number.';

-- service_calls: field technician work orders
-- call_number is human-readable (e.g. SC-000123), backed by a sequence
create sequence public.service_calls_call_number_seq;

create table public.service_calls (
  id                       uuid primary key default gen_random_uuid(),
  call_number              text not null unique
                             default ('SC-' || lpad(nextval('public.service_calls_call_number_seq')::text, 6, '0')),
  customer_name            text not null,
  address                  text,
  gps_lat                  double precision,
  gps_lng                  double precision,
  status                   public.call_status not null default 'open',
  assigned_technician_id   uuid references public.profiles (id) on delete set null,
  work_description         text,
  created_at               timestamptz not null default now(),
  closed_at                timestamptz
);

alter sequence public.service_calls_call_number_seq owned by public.service_calls.call_number;

comment on table public.service_calls is 'Represents field technician work orders.';

-- call_photos: images uploaded per service call
create table public.call_photos (
  id           uuid primary key default gen_random_uuid(),
  call_id      uuid not null references public.service_calls (id) on delete cascade,
  photo_type   public.photo_type not null default 'general',
  image_url    text not null,
  uploaded_at  timestamptz not null default now()
);

comment on table public.call_photos is 'Stores image URLs uploaded per service call.';

-- component_replacements: defective part swapped for new part during a call
create table public.component_replacements (
  id               uuid primary key default gen_random_uuid(),
  call_id          uuid not null references public.service_calls (id) on delete cascade,
  old_item_serial  text,
  new_item_id      uuid references public.inventory_items (id) on delete set null,
  technician_id    uuid references public.profiles (id) on delete set null,
  replaced_at      timestamptz not null default now()
);

comment on table public.component_replacements is 'Records swap of defective part with new part during a service call.';

-- ============================================================================
-- INDEXES
-- ============================================================================

create index idx_inventory_items_serial_number on public.inventory_items (serial_number);
create index idx_inventory_items_current_owner_id on public.inventory_items (current_owner_id);
create index idx_inventory_items_status on public.inventory_items (status);

create index idx_service_calls_assigned_technician_id on public.service_calls (assigned_technician_id);
create index idx_service_calls_status on public.service_calls (status);
create index idx_service_calls_call_number on public.service_calls (call_number);

create index idx_call_photos_call_id on public.call_photos (call_id);

create index idx_component_replacements_call_id on public.component_replacements (call_id);
create index idx_component_replacements_new_item_id on public.component_replacements (new_item_id);
create index idx_component_replacements_technician_id on public.component_replacements (technician_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Returns the role of the currently authenticated user.
-- security definer + fixed search_path avoids RLS recursion on profiles
-- and prevents search_path hijacking.
create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Keeps auth.users and public.profiles in sync on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'technician')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.inventory_items enable row level security;
alter table public.service_calls enable row level security;
alter table public.call_photos enable row level security;
alter table public.component_replacements enable row level security;

-- ---- profiles -------------------------------------------------------------

create policy "Profiles are viewable by any authenticated user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Admins can manage all profiles"
  on public.profiles for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ---- inventory_items --------------------------------------------------------

create policy "Inventory is viewable by any authenticated user"
  on public.inventory_items for select
  to authenticated
  using (true);

create policy "Admins and warehouse managers can manage inventory"
  on public.inventory_items for all
  to authenticated
  using (public.current_user_role() in ('admin', 'warehouse_manager'))
  with check (public.current_user_role() in ('admin', 'warehouse_manager'));

-- ---- service_calls ----------------------------------------------------------

create policy "Service calls are viewable by any authenticated user"
  on public.service_calls for select
  to authenticated
  using (true);

create policy "Admins and warehouse managers can manage all service calls"
  on public.service_calls for all
  to authenticated
  using (public.current_user_role() in ('admin', 'warehouse_manager'))
  with check (public.current_user_role() in ('admin', 'warehouse_manager'));

create policy "Technicians can update their assigned service calls"
  on public.service_calls for update
  to authenticated
  using (assigned_technician_id = auth.uid())
  with check (assigned_technician_id = auth.uid());

-- ---- call_photos --------------------------------------------------------------

create policy "Call photos are viewable by any authenticated user"
  on public.call_photos for select
  to authenticated
  using (true);

create policy "Authenticated users can upload call photos"
  on public.call_photos for insert
  to authenticated
  with check (true);

create policy "Admins and warehouse managers can manage all call photos"
  on public.call_photos for all
  to authenticated
  using (public.current_user_role() in ('admin', 'warehouse_manager'))
  with check (public.current_user_role() in ('admin', 'warehouse_manager'));

-- ---- component_replacements -----------------------------------------------

create policy "Component replacements are viewable by any authenticated user"
  on public.component_replacements for select
  to authenticated
  using (true);

create policy "Authenticated users can log component replacements"
  on public.component_replacements for insert
  to authenticated
  with check (true);

create policy "Admins and warehouse managers can manage all component replacements"
  on public.component_replacements for all
  to authenticated
  using (public.current_user_role() in ('admin', 'warehouse_manager'))
  with check (public.current_user_role() in ('admin', 'warehouse_manager'));
