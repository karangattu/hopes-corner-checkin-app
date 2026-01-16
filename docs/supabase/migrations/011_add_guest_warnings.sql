-- 011_add_guest_warnings.sql
-- Adds a table to store warnings issued to guests

create table if not exists public.guest_warnings (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete cascade,
  message text not null,
  severity smallint not null default 1, -- 1:low, 2:medium, 3:high
  issued_by text, -- optional: staff id or name
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes to speed lookups by guest
create index if not exists guest_warnings_guest_id_idx on public.guest_warnings (guest_id);
create index if not exists guest_warnings_created_at_idx on public.guest_warnings (created_at desc);

-- Trigger to maintain updated_at
create or replace function public.touch_guest_warnings_updated_at()
returns trigger as $$
begin
  new.updated_at = greatest(now(), coalesce(new.updated_at, now()));
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_guest_warnings_updated_at on public.guest_warnings;
create trigger trg_guest_warnings_updated_at
before update on public.guest_warnings
for each row execute function public.touch_guest_warnings_updated_at();
