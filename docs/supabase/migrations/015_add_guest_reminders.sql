-- 015_add_guest_reminders.sql
-- Adds a table to store reminders for guests that staff must dismiss before proceeding with services

create table if not exists public.guest_reminders (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete cascade,
  message text not null,
  created_by text, -- staff name who created the reminder
  created_at timestamptz not null default now(),
  dismissed_by text, -- staff name who dismissed the reminder (null = not dismissed)
  dismissed_at timestamptz, -- when the reminder was dismissed (null = not dismissed)
  active boolean not null default true -- false when dismissed
);

-- Indexes to speed lookups by guest and active status
create index if not exists guest_reminders_guest_id_idx on public.guest_reminders (guest_id);
create index if not exists guest_reminders_active_idx on public.guest_reminders (active) where active = true;
create index if not exists guest_reminders_created_at_idx on public.guest_reminders (created_at desc);
