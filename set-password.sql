-- Give your existing account a password, so you never wait on an email again.
-- Change BOTH values below, then run it in Supabase: SQL Editor -> New snippet -> Run.

update auth.users
set encrypted_password = crypt('CHANGE-THIS-PASSWORD', gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now())
where email = 'humbledomain@icloud.com';
