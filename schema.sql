-- democrat.ai — Supabase schema
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run.

create extension if not exists citext;

-- ---------------------------------------------------------------- profiles
create table if not exists profiles (
  id          uuid primary key references auth.users on delete cascade,
  handle      citext unique,
  name        text,
  bio         text,
  role        text,
  location    text,
  link        text,
  photo_url   text,
  ballot      jsonb  not null default '{}'::jsonb,
  goal        numeric not null default 0,
  donate_link text,
  created_at  timestamptz not null default now(),
  constraint handle_format check (handle is null or handle ~ '^[a-z0-9_]{2,20}$')
);

-- ---------------------------------------------------------------- content
create table if not exists posts (
  id         uuid primary key default gen_random_uuid(),
  author     uuid not null references profiles on delete cascade,
  text       text not null check (char_length(text) between 1 and 280),
  created_at timestamptz not null default now()
);
create index if not exists posts_author_idx on posts(author, created_at desc);

create table if not exists likes (
  post_id uuid not null references posts on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  primary key (post_id, user_id)
);

create table if not exists follows (
  follower uuid not null references profiles on delete cascade,
  followee uuid not null references profiles on delete cascade,
  primary key (follower, followee),
  check (follower <> followee)
);

create table if not exists issues (
  id         uuid primary key default gen_random_uuid(),
  author     uuid not null references profiles on delete cascade,
  title      text not null,
  stance     text not null check (stance in ('Support','Oppose')),
  created_at timestamptz not null default now()
);

create table if not exists endorsements (
  id         uuid primary key default gen_random_uuid(),
  author     uuid not null references profiles on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id     uuid primary key default gen_random_uuid(),
  author uuid not null references profiles on delete cascade,
  title  text not null,
  date   date not null,
  place  text
);

create table if not exists rsvps (
  event_id uuid not null references events on delete cascade,
  user_id  uuid not null references profiles on delete cascade,
  primary key (event_id, user_id)
);

create table if not exists polls (
  id         uuid primary key default gen_random_uuid(),
  author     uuid not null references profiles on delete cascade,
  question   text not null,
  created_at timestamptz not null default now()
);

create table if not exists poll_options (
  id      uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls on delete cascade,
  text    text not null,
  ord     int  not null default 0
);

create table if not exists poll_votes (
  poll_id   uuid not null references polls on delete cascade,
  option_id uuid not null references poll_options on delete cascade,
  user_id   uuid not null references profiles on delete cascade,
  primary key (poll_id, user_id)          -- one vote per person per poll
);

create table if not exists gifts (
  id         uuid primary key default gen_random_uuid(),
  author     uuid not null references profiles on delete cascade,
  amount     numeric not null check (amount > 0),
  created_at timestamptz not null default now()
);

-- shares are logged by anyone, signed in or not — this is the virality metric
create table if not exists shares (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------- create a profile on signup
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- ---------------------------------------------------------------- row level security
alter table profiles     enable row level security;
alter table posts        enable row level security;
alter table likes        enable row level security;
alter table follows      enable row level security;
alter table issues       enable row level security;
alter table endorsements enable row level security;
alter table events       enable row level security;
alter table rsvps        enable row level security;
alter table polls        enable row level security;
alter table poll_options enable row level security;
alter table poll_votes   enable row level security;
alter table gifts        enable row level security;
alter table shares       enable row level security;

-- everything is publicly readable: profiles are meant to be shared
do $$
declare t text;
begin
  foreach t in array array['profiles','posts','likes','follows','issues','endorsements',
                           'events','rsvps','polls','poll_options','poll_votes','shares']
  loop
    execute format('drop policy if exists read_all on %I', t);
    execute format('create policy read_all on %I for select using (true)', t);
  end loop;
end $$;

-- gifts are private to the person who logged them
drop policy if exists gifts_own on gifts;
create policy gifts_own on gifts for select using (auth.uid() = author);

-- you may only write your own rows
drop policy if exists profiles_write on profiles;
create policy profiles_write on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array['posts','issues','endorsements','events','polls','gifts']
  loop
    execute format('drop policy if exists own_insert on %I', t);
    execute format('drop policy if exists own_delete on %I', t);
    execute format('create policy own_insert on %I for insert with check (auth.uid() = author)', t);
    execute format('create policy own_delete on %I for delete using (auth.uid() = author)', t);
  end loop;
end $$;

-- poll options belong to the poll owner
drop policy if exists options_write on poll_options;
create policy options_write on poll_options for insert
  with check (exists (select 1 from polls p where p.id = poll_id and p.author = auth.uid()));

-- anyone signed in may like, follow, rsvp and vote — as themselves
do $$
declare t text;
begin
  foreach t in array array['likes','follows','rsvps','poll_votes']
  loop
    execute format('drop policy if exists self_insert on %I', t);
    execute format('drop policy if exists self_delete on %I', t);
  end loop;
end $$;

create policy self_insert on likes      for insert with check (auth.uid() = user_id);
create policy self_delete on likes      for delete using      (auth.uid() = user_id);
create policy self_insert on follows    for insert with check (auth.uid() = follower);
create policy self_delete on follows    for delete using      (auth.uid() = follower);
create policy self_insert on rsvps      for insert with check (auth.uid() = user_id);
create policy self_delete on rsvps      for delete using      (auth.uid() = user_id);
create policy self_insert on poll_votes for insert with check (auth.uid() = user_id);

-- anyone at all may log a share
drop policy if exists share_any on shares;
create policy share_any on shares for insert with check (true);

-- ---------------------------------------------------------------- avatars
insert into storage.buckets (id, name, public)
values ('avatars','avatars',true) on conflict (id) do nothing;

drop policy if exists avatars_read   on storage.objects;
drop policy if exists avatars_write  on storage.objects;
drop policy if exists avatars_update on storage.objects;

create policy avatars_read on storage.objects for select
  using (bucket_id = 'avatars');
create policy avatars_write on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
