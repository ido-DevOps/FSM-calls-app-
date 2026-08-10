-- ============================================================================
-- Solaris FSM — Component replacement RPC
--
-- Logging a swap touches three rows (the new item, the old item, and the
-- replacement record itself). Doing that as three separate client calls
-- risks a partial write if the app is killed or loses signal mid-flow, so
-- it's wrapped in a single transactional function instead.
-- ============================================================================

create or replace function public.log_component_replacement(
  p_call_id uuid,
  p_new_item_id uuid,
  p_old_item_serial text,
  p_technician_id uuid
)
returns public.component_replacements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_replacement public.component_replacements;
begin
  if p_technician_id <> auth.uid() then
    raise exception 'p_technician_id must match the authenticated user';
  end if;

  if p_old_item_serial is null or length(trim(p_old_item_serial)) = 0 then
    raise exception 'old_item_serial is required';
  end if;

  -- The new component leaves the technician's van and goes into service.
  update public.inventory_items
  set status = 'installed'
  where id = p_new_item_id
    and status = 'with_technician'
    and current_owner_id = p_technician_id;

  if not found then
    raise exception 'Component % is not currently checked out to this technician', p_new_item_id;
  end if;

  -- If the defective part is a known, previously-tracked item, it comes
  -- back to the technician for return to the warehouse. Untracked/legacy
  -- serials are still recorded on the replacement row below, just without
  -- an inventory_items match.
  update public.inventory_items
  set status = 'defective_returned', current_owner_id = p_technician_id
  where serial_number = p_old_item_serial;

  insert into public.component_replacements (call_id, old_item_serial, new_item_id, technician_id)
  values (p_call_id, p_old_item_serial, p_new_item_id, p_technician_id)
  returning * into v_replacement;

  return v_replacement;
end;
$$;

grant execute on function public.log_component_replacement(uuid, uuid, text, uuid) to authenticated;
