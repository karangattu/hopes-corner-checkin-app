-- Create haircut_visits table if it doesn't exist
CREATE TABLE IF NOT EXISTS haircut_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    served_at TIMESTAMPTZ DEFAULT NOW(),
    service_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure service_date column exists (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'haircut_visits' AND column_name = 'service_date') THEN
        ALTER TABLE haircut_visits ADD COLUMN service_date DATE;
    END IF;
END $$;

-- Enable RLS for haircut_visits
ALTER TABLE haircut_visits ENABLE ROW LEVEL SECURITY;

-- Create policies for haircut_visits
CREATE POLICY "Enable read access for authenticated users" ON haircut_visits
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON haircut_visits
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON haircut_visits
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON haircut_visits
    FOR DELETE
    TO authenticated
    USING (true);


-- Create holiday_visits table if it doesn't exist
CREATE TABLE IF NOT EXISTS holiday_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    served_at TIMESTAMPTZ DEFAULT NOW(),
    visit_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure visit_date column exists (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'holiday_visits' AND column_name = 'visit_date') THEN
        ALTER TABLE holiday_visits ADD COLUMN visit_date DATE;
    END IF;
END $$;

-- Enable RLS for holiday_visits
ALTER TABLE holiday_visits ENABLE ROW LEVEL SECURITY;

-- Create policies for holiday_visits
CREATE POLICY "Enable read access for authenticated users" ON holiday_visits
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON holiday_visits
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON holiday_visits
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON holiday_visits
    FOR DELETE
    TO authenticated
    USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_haircut_visits_guest_id ON haircut_visits(guest_id);
CREATE INDEX IF NOT EXISTS idx_haircut_visits_service_date ON haircut_visits(service_date);
CREATE INDEX IF NOT EXISTS idx_holiday_visits_guest_id ON holiday_visits(guest_id);
CREATE INDEX IF NOT EXISTS idx_holiday_visits_visit_date ON holiday_visits(visit_date);
