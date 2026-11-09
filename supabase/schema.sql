-- Revela: schema for one photographer/studio installation.
-- Run once in the Supabase SQL editor of the photographer's project. Then:
--   * Authentication > Providers > Email: turn OFF "Allow new users to sign up" and create the photographer's user by hand.
--   * The public gallery is served ONLY by the Next.js API (service role); the anon key can read nothing here.

create extension if not exists pgcrypto;

-- Studio identity (one row per photographer account).
create table if not exists public.studios (
  owner uuid primary key default auth.uid() references auth.users on delete cascade,
  name text not null default '',
  photographer_name text not null default '',
  logo_path text,
  cover_path text,
  accent text not null default '#a33a2a' check (accent ~ '^#[0-9a-fA-F]{6}$'),
  email text not null default '',
  phone text not null default '',
  instagram text not null default '',
  website text not null default '',
  city text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.galleries (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{8,80}$'),
  title text not null check (char_length(title) between 1 and 120),
  client_name text not null check (char_length(client_name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  event_date date,
  cover_photo_id uuid,
  status text not null default 'draft' check (status in ('draft', 'published')),
  has_password boolean not null default false,
  expires_at timestamptz,
  allow_download boolean not null default true,
  allow_favorites boolean not null default true,
  allow_selection boolean not null default false,
  selection_limit int check (selection_limit is null or selection_limit between 1 and 5000),
  presentation boolean not null default true,
  slide_seconds int not null default 6 check (slide_seconds between 3 and 15),
  music text check (music in ('ambiente', 'custom')),
  music_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists galleries_owner_idx on public.galleries (owner);

-- Password hashes live apart from galleries: RLS enabled with NO policies, so only the service role and
-- the security-definer functions below can touch them. The photographer's own session never reads a hash.
create table if not exists public.gallery_secrets (
  gallery_id uuid primary key references public.galleries on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries on delete cascade,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  position int not null default 0
);
create index if not exists albums_gallery_idx on public.albums (gallery_id);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries on delete cascade,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  album_id uuid references public.albums on delete set null,
  name text not null,
  width int not null check (width > 0),
  height int not null check (height > 0),
  bytes bigint not null check (bytes > 0),
  position int not null default 0,
  blur text check (char_length(blur) < 4000),
  -- "<owner>/<gallery>/<photo>" inside the private "galleries" bucket: original.<ext>, display.webp, thumb.webp
  storage_prefix text not null,
  original_ext text not null default 'jpg' check (original_ext in ('jpg', 'png', 'webp')),
  created_at timestamptz not null default now()
);
create index if not exists photos_gallery_idx on public.photos (gallery_id, position);

alter table public.galleries
  drop constraint if exists galleries_cover_fk,
  add constraint galleries_cover_fk foreign key (cover_photo_id) references public.photos on delete set null;

-- Written only by the server API (service role) on behalf of anonymous clients.
create table if not exists public.favorites (
  gallery_id uuid not null references public.galleries on delete cascade,
  photo_id uuid not null references public.photos on delete cascade,
  visitor_id text not null check (char_length(visitor_id) between 8 and 64),
  created_at timestamptz not null default now(),
  primary key (photo_id, visitor_id)
);
create index if not exists favorites_gallery_idx on public.favorites (gallery_id);

create table if not exists public.selections (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries on delete cascade,
  visitor_id text not null check (char_length(visitor_id) between 8 and 64),
  client_name text not null default '' check (char_length(client_name) <= 80),
  note text not null default '' check (char_length(note) <= 1000),
  photo_ids uuid[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'submitted')),
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (gallery_id, visitor_id)
);

create table if not exists public.gallery_events (
  id bigint generated always as identity primary key,
  gallery_id uuid not null references public.galleries on delete cascade,
  type text not null check (type in ('view', 'download')),
  photo_count int not null default 1 check (photo_count between 1 and 10000),
  created_at timestamptz not null default now()
);
create index if not exists gallery_events_gallery_idx on public.gallery_events (gallery_id, type);

-- Row level security: the photographer sees only their own rows. Anonymous visitors see nothing.
alter table public.studios enable row level security;
alter table public.galleries enable row level security;
alter table public.gallery_secrets enable row level security;
alter table public.albums enable row level security;
alter table public.photos enable row level security;
alter table public.favorites enable row level security;
alter table public.selections enable row level security;
alter table public.gallery_events enable row level security;

create or replace function public.owns_gallery(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from galleries where id = g and owner = auth.uid());
$$;

drop policy if exists studios_owner on public.studios;
create policy studios_owner on public.studios for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists galleries_owner on public.galleries;
create policy galleries_owner on public.galleries for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists albums_owner on public.albums;
create policy albums_owner on public.albums for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid() and public.owns_gallery(gallery_id));

drop policy if exists photos_owner on public.photos;
create policy photos_owner on public.photos for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid() and public.owns_gallery(gallery_id) and storage_prefix like auth.uid()::text || '/%');

drop policy if exists favorites_owner_read on public.favorites;
create policy favorites_owner_read on public.favorites for select to authenticated using (public.owns_gallery(gallery_id));

drop policy if exists selections_owner_read on public.selections;
create policy selections_owner_read on public.selections for select to authenticated using (public.owns_gallery(gallery_id));
drop policy if exists selections_owner_update on public.selections;
create policy selections_owner_update on public.selections for update to authenticated using (public.owns_gallery(gallery_id)) with check (public.owns_gallery(gallery_id));

drop policy if exists events_owner_read on public.gallery_events;
create policy events_owner_read on public.gallery_events for select to authenticated using (public.owns_gallery(gallery_id));

-- has_password is maintained only by set_gallery_password.
create or replace function public.protect_has_password() returns trigger
language plpgsql as $$
begin
  if current_setting('revela.setting_password', true) is distinct from 'on' then
    new.has_password := old.has_password;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists galleries_protect on public.galleries;
create trigger galleries_protect before update on public.galleries for each row execute function public.protect_has_password();

create or replace function public.set_gallery_password(p_gallery uuid, p_password text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from galleries where id = p_gallery and owner = auth.uid()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform set_config('revela.setting_password', 'on', true);
  if p_password is null or length(p_password) = 0 then
    delete from gallery_secrets where gallery_id = p_gallery;
    update galleries set has_password = false where id = p_gallery;
  else
    if length(p_password) < 4 or length(p_password) > 72 then
      raise exception 'password must be 4 to 72 characters' using errcode = '22023';
    end if;
    insert into gallery_secrets (gallery_id, password_hash) values (p_gallery, crypt(p_password, gen_salt('bf', 10)))
      on conflict (gallery_id) do update set password_hash = excluded.password_hash, updated_at = now();
    update galleries set has_password = true where id = p_gallery;
  end if;
end $$;
revoke all on function public.set_gallery_password(uuid, text) from public, anon;
grant execute on function public.set_gallery_password(uuid, text) to authenticated;

-- Called by the server API only. Returns the hash's fingerprint on success so unlock cookies die when the password changes.
create or replace function public.check_gallery_password(p_gallery uuid, p_password text) returns text
language sql stable security definer set search_path = public, extensions as $$
  select encode(digest(password_hash, 'sha256'), 'hex') from gallery_secrets
  where gallery_id = p_gallery and password_hash = crypt(p_password, password_hash);
$$;
create or replace function public.gallery_password_fingerprint(p_gallery uuid) returns text
language sql stable security definer set search_path = public, extensions as $$
  select encode(digest(password_hash, 'sha256'), 'hex') from gallery_secrets where gallery_id = p_gallery;
$$;
revoke all on function public.check_gallery_password(uuid, text) from public, anon, authenticated;
revoke all on function public.gallery_password_fingerprint(uuid) from public, anon, authenticated;
grant execute on function public.check_gallery_password(uuid, text) to service_role;
grant execute on function public.gallery_password_fingerprint(uuid) to service_role;

-- Storage: one PRIVATE bucket. Every object path starts with the owner's user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('galleries', 'galleries', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists galleries_owner_objects on storage.objects;
create policy galleries_owner_objects on storage.objects for all to authenticated
  using (bucket_id = 'galleries' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'galleries' and (storage.foldername(name))[1] = auth.uid()::text);
