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
