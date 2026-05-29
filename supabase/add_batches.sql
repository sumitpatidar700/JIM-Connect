-- 1. Create batches table
CREATE TABLE IF NOT EXISTS public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- 3. RLS: Anyone authenticated can read batches (needed for signup)
CREATE POLICY "batches_read_all" ON public.batches FOR SELECT USING (true);

-- 4. RLS: Only admin can manage batches
CREATE POLICY "batches_admin_manage" ON public.batches FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5. Add batch_id to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL;

-- 6. Add batch_id to events (null = visible to all)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL;

-- 7. Add batch_id to announcements
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL;

-- 8. Add batch_id to winners
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL;
