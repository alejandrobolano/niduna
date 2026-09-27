alter table public.profiles
add column expense_display_currency text not null default 'EUR'
check (expense_display_currency in ('EUR', 'USD', 'GBP', 'CAD', 'MXN'));

grant update (expense_display_currency) on public.profiles to authenticated;
