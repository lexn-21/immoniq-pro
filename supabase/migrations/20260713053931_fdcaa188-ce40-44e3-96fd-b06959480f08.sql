
DELETE FROM public.suppressed_emails WHERE email ILIKE 'leafeldmann20@icloud.com';
DELETE FROM auth.users WHERE email IN ('leafeldmann20@icloud.com','leafeldmann20@icooud.com') AND email_confirmed_at IS NULL;
