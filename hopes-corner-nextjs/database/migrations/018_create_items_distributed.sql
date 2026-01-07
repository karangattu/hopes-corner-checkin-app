-- Create items_distributed table for tracking amenities (t-shirts, tents, etc.)
create table if not exists items_distributed (
  id uuid default gen_random_uuid() primary key,
  guest_id uuid references guests(id) on delete cascade not null,
  item_key text not null, -- e.g. 'tshirt', 'tent', 'backpack'
  distributed_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

-- Add index for faster lookups by guest and item
create index if not exists idx_items_distributed_guest_item 
  on items_distributed(guest_id, item_key);

-- Add index for sorting by date
create index if not exists idx_items_distributed_date 
  on items_distributed(distributed_at desc);

-- Enable RLS
alter table items_distributed enable row level security;

-- Policies
create policy "Enable read access for authenticated users"
  on items_distributed for select
  to authenticated
  using (true);

create policy "Enable insert access for authenticated users"
  on items_distributed for insert
  to authenticated
  with check (true);

create policy "Enable delete access for authenticated users"
  on items_distributed for delete
  to authenticated
  using (true);
