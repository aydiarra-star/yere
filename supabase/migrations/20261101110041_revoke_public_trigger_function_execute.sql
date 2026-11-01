-- This function is only intended to run from the three existing table triggers.
-- PostgreSQL does not require callers to hold EXECUTE when a trigger fires.
-- Keep it unavailable as a callable PostgREST/RPC function.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
