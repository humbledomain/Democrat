-- democrat.ai — profile fields update
-- Everything the database needs for the changes we have made since launch.
-- Safe to run more than once. It only adds columns; nothing is deleted.

alter table profiles add column if not exists role     text;
alter table profiles add column if not exists location text;
alter table profiles add column if not exists link     text;
