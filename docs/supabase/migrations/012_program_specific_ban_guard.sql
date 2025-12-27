-- 012_program_specific_ban_guard.sql
-- Update the ban guard to respect program-specific bans for each service

create or replace function public.ensure_guest_not_banned()
returns trigger as $$
declare
  ban_until timestamptz;
  ban_reason text;
  guest_name text;
  bicycle_ban boolean;
  meal_ban boolean;
  shower_ban boolean;
  laundry_ban boolean;
  has_program_specific boolean;
  normalized_service text;
  formatted_until text;
  service_label text;
begin
  if new.guest_id is null then
    return new;
  end if;

  select g.banned_until, g.ban_reason, g.full_name,
         g.banned_from_bicycle, g.banned_from_meals,
         g.banned_from_shower, g.banned_from_laundry
    into ban_until, ban_reason, guest_name,
         bicycle_ban, meal_ban, shower_ban, laundry_ban
  from public.guests g
  where g.id = new.guest_id;

  if ban_until is null then
    return new;
  end if;

  if ban_until <= now() then
    return new;
  end if;

  formatted_until := to_char(ban_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI"Z"');

  has_program_specific := coalesce(bicycle_ban, false)
    or coalesce(meal_ban, false)
    or coalesce(shower_ban, false)
    or coalesce(laundry_ban, false);

  service_label := CASE WHEN TG_NARGS > 0 THEN TG_ARGV[0] ELSE NULL END;
  normalized_service := lower(trim(coalesce(service_label, '')));

  if has_program_specific then
    if normalized_service in ('meals', 'meal service', 'meal') then
      if meal_ban then
        raise exception using
          message = format(
            'Guest %s is banned from meals until %s',
            coalesce(guest_name, new.guest_id::text),
            formatted_until
          ),
          detail = coalesce(ban_reason, ''),
          hint = 'Update the guest''s ban settings or wait until it expires.';
      end if;
      return new;
    elsif normalized_service in ('shower', 'showers', 'shower booking', 'shower bookings') then
      if shower_ban then
        raise exception using
          message = format(
            'Guest %s is banned from showers until %s',
            coalesce(guest_name, new.guest_id::text),
            formatted_until
          ),
          detail = coalesce(ban_reason, ''),
          hint = 'Update the guest''s ban settings or wait until it expires.';
      end if;
      return new;
    elsif normalized_service in ('laundry', 'laundry booking', 'laundry bookings') then
      if laundry_ban then
        raise exception using
          message = format(
            'Guest %s is banned from laundry until %s',
            coalesce(guest_name, new.guest_id::text),
            formatted_until
          ),
          detail = coalesce(ban_reason, ''),
          hint = 'Update the guest''s ban settings or wait until it expires.';
      end if;
      return new;
    elsif normalized_service in ('bicycle repairs', 'bicycle repair', 'bicycle') then
      if bicycle_ban then
        raise exception using
          message = format(
            'Guest %s is banned from bicycle repairs until %s',
            coalesce(guest_name, new.guest_id::text),
            formatted_until
          ),
          detail = coalesce(ban_reason, ''),
          hint = 'Update the guest''s ban settings or wait until it expires.';
      end if;
      return new;
    else
      return new;
    end if;
  end if;

  raise exception using
    message = format(
      'Guest %s is banned from services until %s',
      coalesce(guest_name, new.guest_id::text),
      formatted_until
    ),
    detail = coalesce(ban_reason, ''),
    hint = 'Update the guest''s ban settings or wait until it expires.';
end;
$$ language plpgsql;

-- Refresh the ban guard triggers so they pass the relevant service label

drop trigger if exists trg_meal_attendance_ban_guard on public.meal_attendance;
create trigger trg_meal_attendance_ban_guard
before insert or update on public.meal_attendance
for each row execute function public.ensure_guest_not_banned('meals');

drop trigger if exists trg_shower_reservations_ban_guard on public.shower_reservations;
create trigger trg_shower_reservations_ban_guard
before insert or update on public.shower_reservations
for each row execute function public.ensure_guest_not_banned('shower');

drop trigger if exists trg_laundry_bookings_ban_guard on public.laundry_bookings;
create trigger trg_laundry_bookings_ban_guard
before insert or update on public.laundry_bookings
for each row execute function public.ensure_guest_not_banned('laundry');

drop trigger if exists trg_bicycle_repairs_ban_guard on public.bicycle_repairs;
create trigger trg_bicycle_repairs_ban_guard
before insert or update on public.bicycle_repairs
for each row execute function public.ensure_guest_not_banned('bicycle repairs');

drop trigger if exists trg_holiday_visits_ban_guard on public.holiday_visits;
create trigger trg_holiday_visits_ban_guard
before insert or update on public.holiday_visits
for each row execute function public.ensure_guest_not_banned('holiday');

drop trigger if exists trg_haircut_visits_ban_guard on public.haircut_visits;
create trigger trg_haircut_visits_ban_guard
before insert or update on public.haircut_visits
for each row execute function public.ensure_guest_not_banned('haircut');

drop trigger if exists trg_items_distributed_ban_guard on public.items_distributed;
create trigger trg_items_distributed_ban_guard
before insert or update on public.items_distributed
for each row execute function public.ensure_guest_not_banned('items');
