-- Create blocked_slots table for managing service availability
create table if not exists blocked_slots (
  id uuid default gen_random_uuid() primary key,
  service_type text not null, -- 'shower' or 'laundry'
  slot_time text not null, -- e.g. '09:00', '10:30 - 12:00'
  date text not null, -- YYYY-MM-DD
  created_at timestamptz default now() not null,
  blocked_by uuid references auth.users(id) -- Optional: who blocked it
);

-- Add index for faster lookups by date and service type
create index if not exists idx_blocked_slots_lookup 
  on blocked_slots(date, service_type);

-- Enable RLS
alter table blocked_slots enable row level security;

-- Policies
create policy "Enable read access for authenticated users"
  on blocked_slots for select
  to authenticated
  using (true);

create policy "Enable insert access for authenticated users"
  on blocked_slots for insert
  to authenticated
  with check (true);

create policy "Enable delete access for authenticated users"
  on blocked_slots for delete
  to authenticated
  using (true);
