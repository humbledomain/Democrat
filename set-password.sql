-- Give your account a password.
-- 1. Replace CHANGE-THIS-PASSWORD below with the password you want (keep the quotes).
-- 2. Supabase -> SQL Editor -> New snippet -> paste -> Run.
-- 3. You should see "Success. 1 row" from the last line, showing your email.

create extension if not exists pgcrypto with schema extensions;

update auth.users
set encrypted_password = extensions.crypt('CHANGE-THIS-PASSWORD', extensions.gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at         = now()
where email = 'humbledomain@icloud.com';

-- did it work? this should list your email with has_password = true
select email,
       (encrypted_password is not null) as has_password,
       (email_confirmed_at is not null) as confirmed
from auth.users;
