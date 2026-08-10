-- ============================================================================
-- Solaris FSM — Realtime for the admin dispatch overview
--
-- Supabase's `supabase_realtime` publication is empty by default; a table
-- has to be added explicitly before postgres_changes subscriptions on it
-- will fire.
-- ============================================================================

alter publication supabase_realtime add table public.service_calls;
