-- Les tables métier ne doivent pas être accessibles au rôle anon.
-- L'accès applicatif passe par authenticated + RLS.
revoke all privileges on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
