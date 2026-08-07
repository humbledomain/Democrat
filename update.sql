-- democrat.ai — run this in Supabase: SQL Editor -> New snippet -> paste -> Run.
-- Safe to run more than once. Nothing is deleted.

-- 1. new profile fields
alter table profiles add column if not exists role     text;
alter table profiles add column if not exists location text;
alter table profiles add column if not exists link     text;

-- 2. let a signed-in person create their own profile row
drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles for insert with check (auth.uid() = id);

-- 3. give a profile row to anyone who signed up before the trigger existed
insert into profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- 4. posts can be longer now
alter table posts drop constraint if exists posts_text_check;
alter table posts add constraint posts_text_check check (char_length(text) between 1 and 1000);

-- 5. turn on live updates so everyone sees new posts, votes and events as they happen
do $$
declare t text;
begin
  foreach t in array array['posts','likes','follows','issues','endorsements','events','rsvps',
                           'polls','poll_options','poll_votes','profiles','shares']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- 6. comments on posts, and direct messages between people
create table if not exists comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts on delete cascade,
  author     uuid not null references profiles on delete cascade,
  text       text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on comments(post_id, created_at);

create table if not exists messages (
  id         uuid primary key default gen_random_uuid(),
  sender     uuid not null references profiles on delete cascade,
  recipient  uuid not null references profiles on delete cascade,
  text       text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at    timestamptz,
  check (sender <> recipient)
);
create index if not exists messages_pair_idx on messages(sender, recipient, created_at desc);
create index if not exists messages_inbox_idx on messages(recipient, read_at);

alter table comments enable row level security;
alter table messages enable row level security;

-- comments are public, like the posts they hang off
drop policy if exists read_all on comments;
create policy read_all on comments for select using (true);
drop policy if exists own_insert on comments;
create policy own_insert on comments for insert with check (auth.uid() = author);
drop policy if exists own_delete on comments;
create policy own_delete on comments for delete using (auth.uid() = author);

-- a direct message is readable only by the two people in it
drop policy if exists dm_read on messages;
create policy dm_read on messages for select
  using (auth.uid() = sender or auth.uid() = recipient);
drop policy if exists dm_send on messages;
create policy dm_send on messages for insert with check (auth.uid() = sender);
drop policy if exists dm_read_receipt on messages;
create policy dm_read_receipt on messages for update
  using (auth.uid() = recipient) with check (auth.uid() = recipient);

do $$
declare t text;
begin
  foreach t in array array['comments','messages']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
