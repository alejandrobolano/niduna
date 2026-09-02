create or replace function private.validate_baby_contact(
  target_name text,
  target_contact_person text,
  target_phone text,
  target_address text,
  target_website_url text,
  target_notes text
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(char_length(trim(target_name)), 0) not between 1 and 120
    or (target_contact_person is not null and char_length(trim(target_contact_person)) > 120)
    or (target_phone is not null and char_length(trim(target_phone)) > 40)
    or (target_address is not null and char_length(trim(target_address)) > 300)
    or (target_website_url is not null and char_length(trim(target_website_url)) > 500)
    or (target_notes is not null and char_length(trim(target_notes)) > 500)
    or nullif(trim(target_phone), '') is null
      and nullif(trim(target_address), '') is null
      and nullif(trim(target_website_url), '') is null
      and nullif(trim(target_notes), '') is null then
    raise exception 'baby_contact_invalid' using errcode = '22023';
  end if;
end;
$$;

revoke all on function private.validate_baby_contact(text, text, text, text, text, text)
from public, anon, authenticated;
