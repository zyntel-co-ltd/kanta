-- ENG-80: hospital settings fields and facility logo storage

alter table hospitals
  add column if not exists logo_url text,
  add column if not exists address text,
  add column if not exists phone text;

insert into storage.buckets (id, name, public)
values ('facility-logos', 'facility-logos', true)
on conflict (id) do update set public = excluded.public;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read facility logos'
  ) then
    create policy "Public read facility logos"
      on storage.objects
      for select
      to public
      using (bucket_id = 'facility-logos');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated manage facility logos'
  ) then
    create policy "Authenticated manage facility logos"
      on storage.objects
      for all
      to authenticated
      using (bucket_id = 'facility-logos')
      with check (bucket_id = 'facility-logos');
  end if;
end $$;
