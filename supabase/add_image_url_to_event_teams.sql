-- SQL query to add the missing image_url column to public.event_teams table
ALTER TABLE public.event_teams ADD COLUMN IF NOT EXISTS image_url text;
