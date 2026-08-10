-- ============================================================================
-- Solaris FSM — Security hardening
--
-- Closes three privilege-escalation holes and tightens the component-swap RPC.
-- Each section notes the concrete attack it prevents.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Role escalation via self-update of profiles.role
--
-- "Users can update their own profile" is column-blind, and `profiles.role` is
-- the sole input to current_user_role(), which gates every write policy in the
-- database. Any technician could run
--     update profiles set role = 'admin' where id = auth.uid()
-- and hold full admin rights on the next request.
--
-- RLS WITH CHECK cannot express "this column did not change", so the fix is a
-- column-level grant: users may edit their own name and phone, nothing else.
-- The "Admins can manage all profiles" policy still lets admins change roles.
-- ---------------------------------------------------------------------------

revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;


-- ---------------------------------------------------------------------------
-- 2. Role escalation at signup via client-supplied metadata
--
-- handle_new_user() read the role from raw_user_meta_data, which is populated
-- verbatim from the client's own signUp({ options: { data } }) payload. With
-- signup enabled and email confirmation off, anyone holding the public anon
-- key could self-register as an admin:
--     supabase.auth.signUp({ email, password,
--                            options: { data: { role: 'admin' } } })
--
-- raw_app_meta_data is not writable from the client SDK, so the role is read
-- from there instead and defaults to the least-privileged role. (seed.sql sets
-- it there for the four test accounts.)
--
-- Also hardened: an unrecognised role string used to raise 22P02 inside an
-- AFTER INSERT trigger, rolling back the auth.users insert and surfacing as an
-- opaque "Database error saving new user"; and a pre-existing profiles row
-- broke signup the same way.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.user_role;
begin
  begin
    v_role := coalesce(
      (new.raw_app_meta_data ->> 'role')::public.user_role,
      'technician'
    );
  exception
    when invalid_text_representation then
      v_role := 'technician';
  end;

  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', v_role)
  on conflict (id) do nothing;

  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- 3. log_component_replacement — four separate problems
--
-- (a) Postgres grants EXECUTE to PUBLIC by default on every new function, so
--     the explicit grant to `authenticated` did not exclude `anon`. The
--     function was reachable with only the public anon key.
--
-- (b) The guard `if p_technician_id <> auth.uid()` does NOT raise for an
--     unauthenticated caller: auth.uid() is NULL, `x <> NULL` is NULL, and
--     PL/pgSQL treats a NULL condition as false. Combined with (a) and
--     SECURITY DEFINER, that meant inventory writes with RLS fully bypassed.
--     `is distinct from` is NULL-safe; `<>` must never be used in a guard.
--
-- (c) Nothing tied p_call_id to the caller, so a technician could log a swap
--     against another technician's call.
--
-- (d) The old-item UPDATE was unscoped. The serial is free text typed by the
--     technician, so a typo matching any other item in the system — including
--     stock sitting in the warehouse — silently flipped that item to
--     'defective_returned' and reassigned ownership. Real stock would vanish
--     from the dispatch pool and phantom returns would appear.
--
-- Also: 'installed' items no longer keep a current_owner_id, so an installed
-- part stops rendering as "With Alex Rivera" in the warehouse list.
-- ---------------------------------------------------------------------------

create or replace function public.log_component_replacement(
  p_call_id uuid,
  p_new_item_id uuid,
  p_old_item_serial text,
  p_technician_id uuid
)
returns public.component_replacements
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_replacement public.component_replacements;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_technician_id is distinct from auth.uid() then
    raise exception 'p_technician_id must match the authenticated user';
  end if;

  if p_old_item_serial is null or length(trim(p_old_item_serial)) = 0 then
    raise exception 'old_item_serial is required';
  end if;

  -- The call must be an active one assigned to this technician.
  perform 1
  from public.service_calls
  where id = p_call_id
    and assigned_technician_id = p_technician_id
    and status in ('open', 'in_progress', 'pending_parts');

  if not found then
    raise exception 'This call is not an active call assigned to you';
  end if;

  -- The new component leaves the technician's van and goes into service.
  update public.inventory_items
  set status = 'installed',
      current_owner_id = null
  where id = p_new_item_id
    and status = 'with_technician'
    and current_owner_id = p_technician_id;

  if not found then
    raise exception 'Component % is not currently checked out to this technician', p_new_item_id;
  end if;

  -- If the defective part is a known, previously-tracked item, it comes
  -- back to the technician for return to the warehouse. Untracked/legacy
  -- serials are still recorded on the replacement row below, just without
  -- an inventory_items match. Scoped so a mistyped serial can't seize an
  -- unrelated item — only something plausibly in the field can come back.
  update public.inventory_items
  set status = 'defective_returned',
      current_owner_id = p_technician_id
  where serial_number = p_old_item_serial
    and status in ('installed', 'with_technician');

  insert into public.component_replacements (call_id, old_item_serial, new_item_id, technician_id)
  values (p_call_id, p_old_item_serial, p_new_item_id, p_technician_id)
  returning * into v_replacement;

  return v_replacement;
end;
$$;

revoke execute on function public.log_component_replacement(uuid, uuid, text, uuid) from public;
revoke execute on function public.log_component_replacement(uuid, uuid, text, uuid) from anon;
grant  execute on function public.log_component_replacement(uuid, uuid, text, uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- 4. current_user_role() relied on the default EXECUTE grant to PUBLIC.
--
-- It works today, but a routine `revoke execute on all functions in schema
-- public from public` hardening pass would break every write policy in the
-- database at once, with every mutation failing as a permission error. Make
-- the grant explicit so that can't happen. Also pins pg_temp last in the
-- search_path (Postgres searches pg_temp first otherwise, which lets a caller
-- shadow an unqualified relation name inside a SECURITY DEFINER body).
-- ---------------------------------------------------------------------------

create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_user_role() to authenticated;


-- ---------------------------------------------------------------------------
-- 5. component_replacements INSERT was `with check (true)`
--
-- Any authenticated user could insert a replacement row directly — any call,
-- any technician, any serial — bypassing every validation in the RPC above.
-- Because technicians cannot write inventory_items directly, that produced
-- exactly the half-updated state the RPC exists to prevent: a swap record with
-- no matching inventory movement.
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can log component replacements" on public.component_replacements;

create policy "Users can only log replacements as themselves"
  on public.component_replacements for insert
  to authenticated
  with check (technician_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 6. call_photos INSERT was `with check (true)`
--
-- image_url is unconstrained text rendered straight into an <Image>, so any
-- authenticated user could attach an arbitrary external URL to any call,
-- including calls assigned to someone else. Scope inserts to the technician
-- actually assigned to the call (managers keep full access via their own
-- policy).
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can upload call photos" on public.call_photos;

create policy "Technicians can upload photos to their own calls"
  on public.call_photos for insert
  to authenticated
  with check (
    public.current_user_role() in ('admin', 'warehouse_manager')
    or exists (
      select 1
      from public.service_calls sc
      where sc.id = call_photos.call_id
        and sc.assigned_technician_id = auth.uid()
    )
  );
