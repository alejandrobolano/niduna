alter table public.product_announcements
  add column web_display_mode text check (
    web_display_mode is null or web_display_mode = 'standalone'
  );
