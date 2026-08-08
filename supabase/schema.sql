-- Schema completo Calcolo Bolletta. Eseguire nel SQL Editor di Supabase.
create extension if not exists pgcrypto;

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  period_label text not null,
  bill_date date not null default current_date,
  previous_reading numeric(18,3) not null,
  current_reading numeric(18,3) not null,
  total_amount numeric(12,2) not null,
  total_kwh numeric(18,3) not null,
  reading_difference numeric(18,3) not null,
  unit_price numeric(18,8) not null,
  apartment_one_kwh numeric(18,3) not null,
  apartment_one_amount numeric(12,2) not null,
  apartment_two_kwh numeric(18,3) not null,
  apartment_two_amount numeric(12,2) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bills_period_not_blank check (length(trim(period_label)) > 0),
  constraint bills_readings_valid check (previous_reading >= 0 and current_reading >= previous_reading),
  constraint bills_totals_positive check (total_amount > 0 and total_kwh > 0),
  constraint bills_difference_within_total check ((current_reading - previous_reading) <= total_kwh)
);

create index if not exists bills_user_date_idx on public.bills (user_id, bill_date desc, created_at desc);

create or replace function public.calculate_bill_values()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.user_id := auth.uid();
  new.reading_difference := new.current_reading - new.previous_reading;
  new.unit_price := new.total_amount / new.total_kwh;
  new.apartment_one_kwh := new.reading_difference;
  new.apartment_one_amount := round(new.reading_difference * new.unit_price, 2);
  new.apartment_two_kwh := new.total_kwh - new.reading_difference;
  new.apartment_two_amount := new.total_amount - new.apartment_one_amount;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists bills_calculate_values on public.bills;
create trigger bills_calculate_values before insert or update on public.bills
for each row execute function public.calculate_bill_values();

alter table public.bills enable row level security;
drop policy if exists "Users can read own bills" on public.bills;
create policy "Users can read own bills" on public.bills for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can insert own bills" on public.bills;
create policy "Users can insert own bills" on public.bills for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own bills" on public.bills;
create policy "Users can update own bills" on public.bills for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own bills" on public.bills;
create policy "Users can delete own bills" on public.bills for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on table public.bills from anon;
grant select, insert, update, delete on table public.bills to authenticated;
