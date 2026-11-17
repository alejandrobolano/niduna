create function public.list_baby_text_suggestions(
  target_baby_id uuid,
  target_kind text,
  target_query text default '',
  max_results integer default 6
)
returns table (
  value text,
  occurrence_count bigint,
  last_used_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with source_values as (
    select
      expense.concept as visible_value,
      greatest(expense.created_at, expense.updated_at) as used_at
    from public.baby_expenses expense
    where target_kind = 'expense_concept'
      and expense.baby_id = target_baby_id
      and expense.retired_at is null

    union all

    select
      note.content as visible_value,
      greatest(note.occurred_at, note.updated_at) as used_at
    from public.baby_notes note
    where target_kind = 'care_note'
      and note.baby_id = target_baby_id
      and note.deleted_at is null
  ),
  normalized_values as (
    select
      visible_value,
      lower(regexp_replace(trim(visible_value), '\s+', ' ', 'g')) as normalized_value,
      used_at
    from source_values
    where nullif(trim(visible_value), '') is not null
  ),
  grouped_values as (
    select
      (array_agg(visible_value order by used_at desc))[1] as visible_value,
      normalized_value,
      count(*)::bigint as occurrence_count,
      max(used_at) as last_used_at
    from normalized_values
    group by normalized_value
  ),
  request as (
    select lower(regexp_replace(trim(coalesce(target_query, '')), '\s+', ' ', 'g')) as normalized_query
  )
  select
    grouped.visible_value as value,
    grouped.occurrence_count,
    grouped.last_used_at
  from grouped_values grouped
  cross join request
  where target_kind in ('expense_concept', 'care_note')
    and (
      request.normalized_query = ''
      or grouped.normalized_value like '%' || request.normalized_query || '%'
    )
  order by
    case
      when request.normalized_query = '' then 0
      when grouped.normalized_value = request.normalized_query then 3
      when grouped.normalized_value like request.normalized_query || '%' then 2
      else 1
    end desc,
    grouped.occurrence_count desc,
    grouped.last_used_at desc,
    grouped.visible_value
  limit greatest(1, least(coalesce(max_results, 6), 10));
$$;

revoke all on function public.list_baby_text_suggestions(uuid, text, text, integer)
from public, anon;

grant execute on function public.list_baby_text_suggestions(uuid, text, text, integer)
to authenticated;
