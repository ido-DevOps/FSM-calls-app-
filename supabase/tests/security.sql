-- ============================================================================
-- Solaris FSM — security regression suite
--
-- Run against a freshly reset local database:
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security.sql
--
-- Every check raises an exception on failure, so with ON_ERROR_STOP=1 psql
-- exits non-zero and CI fails. Each test documents the real vulnerability it
-- locks down — see migration 20260101060000_security_hardening.sql.
--
-- Everything runs inside transactions that roll back, so the seed data is
-- left untouched.
-- ============================================================================

\set ON_ERROR_STOP on
\set ALEX   '11111111-1111-1111-1111-111111111103'
\set JORDAN '11111111-1111-1111-1111-111111111104'

\echo '== security regression suite =='

-- ---------------------------------------------------------------------------
-- 1. A technician must not be able to promote themselves.
--    profiles.role is the sole input to current_user_role(), which gates every
--    write policy in the database.
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111103","role":"authenticated"}';
  do $$
  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'FAIL(1): a technician was able to change their own role';
  exception
    when insufficient_privilege then
      raise notice 'ok  1: self-promotion blocked';
    when others then
      if sqlerrm like 'FAIL(1)%' then raise; end if;
      raise notice 'ok  1: self-promotion blocked (%)', sqlerrm;
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- 2. ...but editing your own name must still work.
--    Guards against over-correcting test 1 into a broken profile screen.
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111103","role":"authenticated"}';
  do $$
  begin
    update public.profiles set full_name = 'Alex R.' where id = auth.uid();
    if not found then
      raise exception 'FAIL(2): technician could not update their own name';
    end if;
    raise notice 'ok  2: self name edit allowed';
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- 3. anon must not be able to execute the swap RPC at all.
--    EXECUTE defaults to PUBLIC on every new function, so this needs an
--    explicit REVOKE — the grant to `authenticated` does not exclude anon.
-- ---------------------------------------------------------------------------
--    NOTE: assert the GRANT directly, not just the behaviour. An earlier
--    version of this test only tried the call and treated any error as a
--    pass — which silently passed even with EXECUTE granted to anon, because
--    the function's own `auth.uid() is null` guard raised first. That is
--    defence in depth working, but it is NOT what this test is for.
do $$
declare v_can boolean;
begin
  select has_function_privilege(
           'anon',
           'public.log_component_replacement(uuid,uuid,text,uuid)',
           'EXECUTE')
    into v_can;
  if v_can then
    raise exception
      'FAIL(3): anon holds EXECUTE on log_component_replacement (needs REVOKE from public AND anon)';
  end if;
  raise notice 'ok  3: anon does not hold EXECUTE on the RPC';
end $$;

--    Same for PUBLIC, which is where the default grant actually comes from.
do $$
begin
  if has_function_privilege(
       'public',
       'public.log_component_replacement(uuid,uuid,text,uuid)',
       'EXECUTE') then
    raise exception 'FAIL(3b): PUBLIC still holds EXECUTE on the RPC';
  end if;
  raise notice 'ok  3b: PUBLIC does not hold EXECUTE on the RPC';
end $$;

--    And the column-level grant that stops role self-promotion (test 1's
--    structural counterpart — asserted directly so it cannot false-pass).
do $$
begin
  if has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE') then
    raise exception
      'FAIL(3c): authenticated can UPDATE profiles.role — role escalation is open';
  end if;
  if not has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE') then
    raise exception 'FAIL(3c): authenticated cannot UPDATE profiles.full_name';
  end if;
  raise notice 'ok  3c: profiles.role not writable, full_name is';
end $$;

-- ---------------------------------------------------------------------------
-- 4. A technician must not log a swap against someone else's call.
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111103","role":"authenticated"}';
  do $$
  declare v_call uuid;
  begin
    select id into v_call from public.service_calls
     where assigned_technician_id = '11111111-1111-1111-1111-111111111104' limit 1;
    if v_call is null then
      raise exception 'FAIL(4): fixture missing - no call assigned to Jordan';
    end if;
    perform public.log_component_replacement(
      v_call, 'a0000000-0000-0000-0000-000000000001'::uuid, 'INV-OPT-0055',
      '11111111-1111-1111-1111-111111111103'::uuid);
    raise exception 'FAIL(4): logged a swap against another technician''s call';
  exception
    when others then
      if sqlerrm like 'FAIL(4)%' then raise; end if;
      raise notice 'ok  4: cross-technician swap blocked';
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- 5. The happy path must still work, and installing must clear the owner.
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111103","role":"authenticated"}';
  do $$
  declare v_call uuid; v_status public.item_status; v_owner uuid;
  begin
    select id into v_call from public.service_calls
     where assigned_technician_id = '11111111-1111-1111-1111-111111111103'
       and status in ('open','in_progress','pending_parts') limit 1;
    if v_call is null then
      raise exception 'FAIL(5): fixture missing - no active call for Alex';
    end if;

    perform public.log_component_replacement(
      v_call, 'a0000000-0000-0000-0000-000000000001'::uuid, 'INV-OPT-0055',
      '11111111-1111-1111-1111-111111111103'::uuid);

    select status, current_owner_id into v_status, v_owner
      from public.inventory_items where id = 'a0000000-0000-0000-0000-000000000001';

    if v_status <> 'installed' then
      raise exception 'FAIL(5): new item status is %, expected installed', v_status;
    end if;
    if v_owner is not null then
      raise exception 'FAIL(5): installed item still has an owner (%)', v_owner;
    end if;
    raise notice 'ok  5: legitimate swap works and clears the owner';
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- 6. A mistyped "old serial" must not seize unrelated warehouse stock.
--    INV-BAT-7702 is a Powerwall sitting in_warehouse.
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111103","role":"authenticated"}';
  do $$
  declare v_call uuid; v_status public.item_status;
  begin
    select id into v_call from public.service_calls
     where assigned_technician_id = '11111111-1111-1111-1111-111111111103'
       and status in ('open','in_progress','pending_parts') limit 1;

    perform public.log_component_replacement(
      v_call, 'a0000000-0000-0000-0000-000000000002'::uuid, 'INV-BAT-7702',
      '11111111-1111-1111-1111-111111111103'::uuid);

    select status into v_status
      from public.inventory_items where serial_number = 'INV-BAT-7702';

    if v_status <> 'in_warehouse' then
      raise exception
        'FAIL(6): warehouse stock was seized by a mistyped serial (now %)', v_status;
    end if;
    raise notice 'ok  6: mistyped serial cannot seize warehouse stock';
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- 7. A user must not insert a replacement row attributed to someone else,
--    which would bypass every validation in the RPC.
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111103","role":"authenticated"}';
  do $$
  begin
    insert into public.component_replacements (call_id, old_item_serial, new_item_id, technician_id)
    values ((select id from public.service_calls limit 1), 'FAKE',
            'a0000000-0000-0000-0000-000000000001',
            '11111111-1111-1111-1111-111111111104');
    raise exception 'FAIL(7): inserted a replacement attributed to another technician';
  exception
    when insufficient_privilege then
      raise notice 'ok  7: cross-attributed insert blocked';
    when others then
      if sqlerrm like 'FAIL(7)%' then raise; end if;
      raise notice 'ok  7: cross-attributed insert blocked';
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- 8. Signup must not be able to choose its own role.
--    raw_user_meta_data is written verbatim from the client's signUp payload.
-- ---------------------------------------------------------------------------
begin;
  do $$
  declare v_role public.user_role;
  begin
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000',
            '99999999-9999-9999-9999-999999999999', 'authenticated', 'authenticated',
            'ci-escalation-probe@test.invalid', crypt('x', gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Probe","role":"admin"}',
            now(), now(), '', '', '', '');

    select role into v_role from public.profiles
     where id = '99999999-9999-9999-9999-999999999999';

    if v_role <> 'technician' then
      raise exception
        'FAIL(8): client-supplied role was honoured at signup (got %)', v_role;
    end if;
    raise notice 'ok  8: signup cannot choose its own role';
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- 9. An unrecognised role string must not break account creation.
-- ---------------------------------------------------------------------------
begin;
  do $$
  declare v_role public.user_role;
  begin
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000',
            '99999999-9999-9999-9999-999999999998', 'authenticated', 'authenticated',
            'ci-badrole-probe@test.invalid', crypt('x', gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"],"role":"NOT_A_ROLE"}',
            '{"full_name":"Probe"}', now(), now(), '', '', '', '');

    select role into v_role from public.profiles
     where id = '99999999-9999-9999-9999-999999999998';

    if v_role <> 'technician' then
      raise exception 'FAIL(9): unexpected role % for a bad role string', v_role;
    end if;
    raise notice 'ok  9: bad role string falls back to technician';
  end $$;
rollback;

-- ---------------------------------------------------------------------------
-- 10. The Add Item catalog must be seeded, or the whole flow is unusable.
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  select count(*) into n from public.component_models;
  if n = 0 then
    raise exception 'FAIL(10): component_models is empty - Add Item dropdowns will be blank';
  end if;
  raise notice 'ok 10: component_models seeded (% rows)', n;
end $$;

\echo '== all security checks passed =='
