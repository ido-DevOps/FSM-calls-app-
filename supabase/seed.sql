-- ============================================================================
-- Solaris FSM — Seed Data (local/dev only)
--
-- Creates 4 auth users (email + password, pre-confirmed), sample inventory,
-- and sample service calls so the app can be exercised against real data.
--
-- Run with:
--   supabase db reset        (re-applies migrations, then this file)
--   -- or, against an already-migrated database --
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Every seed user shares the password:  Password123!
--
-- Idempotent: every row uses a fixed id and ON CONFLICT DO NOTHING, so
-- re-running this file is safe.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Auth users  →  profiles rows are created automatically by the
-- on_auth_user_created trigger, using role/full_name from raw_user_meta_data.
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111101',
    'authenticated', 'authenticated',
    'admin@solarisfsm.test',
    crypt('Password123!', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Priya Nair","role":"admin"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111102',
    'authenticated', 'authenticated',
    'warehouse@solarisfsm.test',
    crypt('Password123!', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Marcus Webb","role":"warehouse_manager"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111103',
    'authenticated', 'authenticated',
    'technician@solarisfsm.test',
    crypt('Password123!', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Alex Rivera","role":"technician"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111104',
    'authenticated', 'authenticated',
    'technician2@solarisfsm.test',
    crypt('Password123!', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Jordan Lee","role":"technician"}',
    now(), now(), '', '', '', ''
  )
on conflict (id) do nothing;

-- Required alongside auth.users for email/password sign-in to work.
insert into auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111101', '11111111-1111-1111-1111-111111111101',
   '{"sub":"11111111-1111-1111-1111-111111111101","email":"admin@solarisfsm.test"}', 'email', now(), now(), now()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111102',
   '{"sub":"11111111-1111-1111-1111-111111111102","email":"warehouse@solarisfsm.test"}', 'email', now(), now(), now()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111103',
   '{"sub":"11111111-1111-1111-1111-111111111103","email":"technician@solarisfsm.test"}', 'email', now(), now(), now()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111104', '11111111-1111-1111-1111-111111111104',
   '{"sub":"11111111-1111-1111-1111-111111111104","email":"technician2@solarisfsm.test"}', 'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

-- ---------------------------------------------------------------------------
-- Inventory — a mix of stock owned by technicians (available to scan into a
-- swap), unassigned warehouse stock, and one already-installed / one
-- defective-returned item for variety.
-- ---------------------------------------------------------------------------

insert into public.inventory_items (id, serial_number, model_name, category, status, current_owner_id) values
  ('a0000000-0000-0000-0000-000000000001', 'INV-INV-2201', 'SolarEdge SE5000H Inverter',   'inverter',   'with_technician',   '11111111-1111-1111-1111-111111111103'),
  ('a0000000-0000-0000-0000-000000000002', 'INV-PAN-3410', 'JinkoSolar 410W Panel',         'panel',      'with_technician',   '11111111-1111-1111-1111-111111111103'),
  ('a0000000-0000-0000-0000-000000000003', 'INV-OPT-1180', 'SolarEdge P505 Optimizer',      'optimizer',  'installed',         '11111111-1111-1111-1111-111111111103'),
  ('a0000000-0000-0000-0000-000000000004', 'INV-BAT-7702', 'Tesla Powerwall 2',             'battery',    'in_warehouse',      null),
  ('a0000000-0000-0000-0000-000000000005', 'INV-INV-2202', 'SolarEdge SE7600H Inverter',    'inverter',   'in_warehouse',      null),
  ('a0000000-0000-0000-0000-000000000006', 'INV-PAN-3411', 'JinkoSolar 410W Panel',         'panel',      'with_technician',   '11111111-1111-1111-1111-111111111104'),
  ('a0000000-0000-0000-0000-000000000007', 'INV-OPT-0099', 'SolarEdge P404 Optimizer',      'optimizer',  'defective_returned','11111111-1111-1111-1111-111111111102')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Service calls — one per status for Alex Rivera (exercises the filter tabs),
-- plus one assigned to Jordan Lee (proves the list only shows *my* calls).
-- ---------------------------------------------------------------------------

insert into public.service_calls (
  id, call_number, customer_name, address, gps_lat, gps_lng,
  status, assigned_technician_id, work_description, created_at, closed_at
) values
  ('b0000000-0000-0000-0000-000000000001', 'SC-000001', 'Sarah Chen', '482 Ridgeview Dr, Austin, TX',
   30.3078, -97.7561, 'open', '11111111-1111-1111-1111-111111111103',
   'Panel output reading 15% below spec since last storm. Inspect for micro-cracks and loose MC4 connectors.',
   now() - interval '1 day', null),

  ('b0000000-0000-0000-0000-000000000002', 'SC-000002', 'David Okafor', '910 Lakeshore Ave, Austin, TX',
   30.2867, -97.7394, 'in_progress', '11111111-1111-1111-1111-111111111103',
   'Inverter fault code E-042 (isolation fault). Likely a failed ground-fault sensor; bring spare SE5000H.',
   now() - interval '3 days', null),

  ('b0000000-0000-0000-0000-000000000003', 'SC-000003', 'Linda Martinez', '227 Sunset Trail, Austin, TX',
   30.3200, -97.7100, 'pending_parts', '11111111-1111-1111-1111-111111111103',
   'Optimizer P505 unresponsive on string 2. Replacement ordered, awaiting warehouse pickup.',
   now() - interval '5 days', null),

  ('b0000000-0000-0000-0000-000000000004', 'SC-000004', 'Robert Kim', '65 Meadowbrook Ln, Austin, TX',
   30.2500, -97.7700, 'completed', '11111111-1111-1111-1111-111111111103',
   'Annual maintenance + optimizer swap on string 1. Customer reported intermittent dip in production.',
   now() - interval '10 days', now() - interval '9 days'),

  ('b0000000-0000-0000-0000-000000000005', 'SC-000005', 'Emma Watson', '18 Hilltop Ct, Austin, TX',
   30.3400, -97.7800, 'cancelled', '11111111-1111-1111-1111-111111111103',
   'Customer rescheduled directly with the office; no crew dispatched.',
   now() - interval '6 days', null),

  ('b0000000-0000-0000-0000-000000000006', 'SC-000006', 'Grace Park', '340 Cedar Hollow, Austin, TX',
   30.2950, -97.7250, 'open', '11111111-1111-1111-1111-111111111104',
   'New install follow-up: confirm production monitoring app is linked to customer account.',
   now() - interval '2 days', null)
on conflict (id) do nothing;

-- Bump the call_number sequence so app-created calls continue after SC-000006.
select setval('public.service_calls_call_number_seq', 100, false);

-- ---------------------------------------------------------------------------
-- Call photos — a couple of sample images on the completed call, so the
-- photos grid has something to render without uploading anything yet.
-- ---------------------------------------------------------------------------

insert into public.call_photos (id, call_id, photo_type, image_url, uploaded_at) values
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'before_repair',
   'https://picsum.photos/seed/solaris-before/800/600', now() - interval '9 days'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 'production_proof',
   'https://picsum.photos/seed/solaris-proof/800/600', now() - interval '9 days')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Component replacements — one historical swap tied to the completed call,
-- matching inventory_items 'a...0003' (SolarEdge P505) being 'installed'.
-- ---------------------------------------------------------------------------

insert into public.component_replacements (id, call_id, old_item_serial, new_item_id, technician_id, replaced_at) values
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'INV-OPT-0055',
   'a0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111103', now() - interval '9 days')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Test accounts
-- ---------------------------------------------------------------------------
-- admin@solarisfsm.test         Password123!   (admin)
-- warehouse@solarisfsm.test     Password123!   (warehouse_manager)
-- technician@solarisfsm.test    Password123!   (technician — Alex Rivera, 5 calls)
-- technician2@solarisfsm.test   Password123!   (technician — Jordan Lee, 1 call)
