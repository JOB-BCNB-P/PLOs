-- Set a fixed, safe search path for the SECURITY DEFINER trigger helper.
alter function public.set_updated_at() set search_path = public, pg_temp;
