create index baby_document_replacements_actor_idx
  on public.baby_document_replacements (actor_user_id);

create index baby_documents_retired_by_idx
  on public.baby_documents (retired_by)
  where retired_by is not null;
