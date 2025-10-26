-- adds ban metadata to guests and guard triggers preventing banned guests from receiving services
begin;

create or replace function public.ensure_guest_not_banned()
returns trigger as $$
declare
  ban_until timestamptz;
  ban_reason text;
  guest_name text;
begin
  if new.guest_id is null then
    return new;
  end if;

  select g.banned_until, g.ban_reason, g.full_name
    into ban_until, ban_reason, guest_name
  from public.guests g
  where g.id = new.guest_id;

  if ban_until is null then
    return new;
  end if;

  if ban_until > now() then
    raise exception using
      message = format('Guest %s is banned from services until %s', coalesce(guest_name, new.guest_id::text), to_char(ban_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI"Z"')),
      detail = coalesce(ban_reason, ''),
      hint = 'Update the guest''s ban settings or wait until it expires.';
  end if;

  return new;
end;
$$ language plpgsql;

alter table public.guests
  add column if not exists ban_reason text;

alter table public.guests
  add column if not exists banned_at timestamptz;

alter table public.guests
  add column if not exists banned_until timestamptz;

do $$
begin
  if not exists (
    select 1
    from information_schema.constraint_column_usage
    where table_schema = 'public'
      and table_name = 'guests'
      and constraint_name = 'guests_ban_window_valid'
  ) then
    alter table public.guests
      add constraint guests_ban_window_valid
        check (
          banned_until is null
          or banned_at is null
          or banned_until > banned_at
        );
  end if;
end
$$;

create index if not exists guests_banned_until_idx
  on public.guests (banned_until)
  where banned_until is not null;

drop trigger if exists trg_meal_attendance_ban_guard on public.meal_attendance;
create trigger trg_meal_attendance_ban_guard
  before insert or update on public.meal_attendance
  for each row execute function public.ensure_guest_not_banned();

drop trigger if exists trg_shower_reservations_ban_guard on public.shower_reservations;
create trigger trg_shower_reservations_ban_guard
  before insert or update on public.shower_reservations
  for each row execute function public.ensure_guest_not_banned();

drop trigger if exists trg_laundry_bookings_ban_guard on public.laundry_bookings;
create trigger trg_laundry_bookings_ban_guard
  before insert or update on public.laundry_bookings
  for each row execute function public.ensure_guest_not_banned();

drop trigger if exists trg_bicycle_repairs_ban_guard on public.bicycle_repairs;
create trigger trg_bicycle_repairs_ban_guard
  before insert or update on public.bicycle_repairs
  for each row execute function public.ensure_guest_not_banned();

drop trigger if exists trg_holiday_visits_ban_guard on public.holiday_visits;
create trigger trg_holiday_visits_ban_guard
  before insert or update on public.holiday_visits
  for each row execute function public.ensure_guest_not_banned();

drop trigger if exists trg_haircut_visits_ban_guard on public.haircut_visits;
create trigger trg_haircut_visits_ban_guard
  before insert or update on public.haircut_visits
  for each row execute function public.ensure_guest_not_banned();

drop trigger if exists trg_items_distributed_ban_guard on public.items_distributed;
create trigger trg_items_distributed_ban_guard
  before insert or update on public.items_distributed
  for each row execute function public.ensure_guest_not_banned();

commit;
