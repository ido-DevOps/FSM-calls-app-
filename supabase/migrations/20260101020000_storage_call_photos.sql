-- ============================================================================
-- Solaris FSM — Storage bucket for call photos
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('call-photos', 'call-photos', true)
on conflict (id) do nothing;

-- Path convention: {call_id}/{photo_type}-{timestamp}.jpg
create policy "Call photos are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'call-photos');

create policy "Authenticated users can upload call photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'call-photos');

create policy "Admins and warehouse managers can manage call photo files"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'call-photos' and public.current_user_role() in ('admin', 'warehouse_manager'))
  with check (bucket_id = 'call-photos' and public.current_user_role() in ('admin', 'warehouse_manager'));
