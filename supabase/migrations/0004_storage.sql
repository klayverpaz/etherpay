insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false);

create policy "attachments_owner_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and owner = auth.uid());

create policy "attachments_owner_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and owner = auth.uid());

create policy "attachments_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and owner = auth.uid());
