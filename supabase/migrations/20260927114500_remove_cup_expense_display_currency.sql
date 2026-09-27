update public.profiles
set expense_display_currency = 'EUR'
where expense_display_currency = 'CUP';

alter table public.profiles
drop constraint profiles_expense_display_currency_check;

alter table public.profiles
add constraint profiles_expense_display_currency_check
check (expense_display_currency in ('EUR', 'USD', 'GBP', 'CAD', 'MXN'));
