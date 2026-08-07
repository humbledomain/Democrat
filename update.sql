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
