-- ============================================================================
-- Solaris FSM — Table privileges for the authenticated role
--
-- Row Level Security restricts *rows*, not operations — Postgres still
-- requires a base GRANT before a role can run SELECT/INSERT/UPDATE/DELETE
-- at all. Supabase's hosted dashboard bootstraps this automatically for
-- tables created through it; tables created by a plain migration (as ours
-- are) don't get it for free, so it has to be explicit.
-- ============================================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.profiles,
  public.inventory_items,
  public.service_calls,
  public.call_photos,
  public.component_replacements
to authenticated;

-- service_calls.call_number defaults from nextval() on this sequence — the
-- executing role needs USAGE on it too, or the insert itself fails.
grant usage, select on sequence public.service_calls_call_number_seq to authenticated;

-- So a table added by a future migration doesn't reintroduce this gap.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant usage, select on sequences to authenticated;
