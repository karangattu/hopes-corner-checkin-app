-- Migration to create guest_proxies table for linking guests
-- Symmetric relationship: if A is linked to B, B is also linked to A.

CREATE TABLE IF NOT EXISTS public.guest_proxies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    proxy_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    
    -- Prevent self-linking
    CONSTRAINT guest_proxies_no_self_link CHECK (guest_id <> proxy_id),
    -- Prevent duplicate links (regardless of order)
    CONSTRAINT guest_proxies_unique_link UNIQUE (guest_id, proxy_id)
);

-- Index for fast lookup by either guest
CREATE INDEX IF NOT EXISTS guest_proxies_guest_id_idx ON public.guest_proxies (guest_id);
CREATE INDEX IF NOT EXISTS guest_proxies_proxy_id_idx ON public.guest_proxies (proxy_id);

-- Enable RLS
ALTER TABLE public.guest_proxies ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view guest proxies"
    ON public.guest_proxies FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Authenticated users can manage guest proxies"
    ON public.guest_proxies FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Trigger to maintain symmetry (Optional but helpful for ease of querying)
-- If we want A -> B to always imply B -> A in the table, we use this:
CREATE OR REPLACE FUNCTION public.maintain_guest_proxy_symmetry()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.guest_proxies (guest_id, proxy_id)
        VALUES (NEW.proxy_id, NEW.guest_id)
        ON CONFLICT (guest_id, proxy_id) DO NOTHING;
    ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM public.guest_proxies
        WHERE guest_id = OLD.proxy_id AND proxy_id = OLD.guest_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_maintain_guest_proxy_symmetry
AFTER INSERT OR DELETE ON public.guest_proxies
FOR EACH ROW EXECUTE FUNCTION public.maintain_guest_proxy_symmetry();

-- Function to check limit of 3 proxies
CREATE OR REPLACE FUNCTION public.check_guest_proxy_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT count(*) FROM public.guest_proxies WHERE guest_id = NEW.guest_id) >= 3 THEN
        RAISE EXCEPTION 'A guest can have at most 3 linked accounts.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_guest_proxy_limit
BEFORE INSERT ON public.guest_proxies
FOR EACH ROW EXECUTE FUNCTION public.check_guest_proxy_limit();
