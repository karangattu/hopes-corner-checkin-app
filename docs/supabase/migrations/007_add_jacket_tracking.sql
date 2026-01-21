-- Migration: Add Jacket Distribution Tracking
-- Description: Track jacket distributions with 15-day validity period
-- Date: 2026-01-10

-- Update items_distributed to support jacket tracking with validity period
-- The jacket item will be tracked like other essentials but with a 15-day expiration
-- Jackets become available again 15 days after distribution

-- Verify items_distributed table exists and has the structure we need
-- No schema changes needed - we'll use the existing item_key column with 'jacket' value
-- The distributed_at timestamp already tracks when the item was given

-- Add an index to improve jacket query performance
create index if not exists items_distributed_jacket_lookup
  on public.items_distributed (guest_id, item_key, distributed_at desc)
  where item_key = 'jacket';

-- Add a comment documenting jacket validity
comment on table public.items_distributed is 'Track distribution of items (t-shirt, sleeping_bag, backpack, tent, flip_flops, jacket, etc). 
Jacket has special 15-day validity - guests can receive another jacket 15+ days after distribution.
Other items use app logic for frequency limits.';

-- Document the jacket item type
comment on column public.items_distributed.item_key is 'Item type: tshirt, sleeping_bag, backpack, tent, flip_flops, jacket, etc. 
Jacket items become available again after 15 days (distributed_at + 15 days).';
