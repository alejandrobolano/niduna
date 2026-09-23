alter table public.profiles
add column feeding_volume_unit text not null default 'ml'
check (feeding_volume_unit in ('ml', 'us_oz'));

grant update (feeding_volume_unit) on public.profiles to authenticated;
