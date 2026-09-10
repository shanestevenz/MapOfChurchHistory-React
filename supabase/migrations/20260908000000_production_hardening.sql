-- Least privilege, curator MFA enforcement, and validation for every exposed write.

drop policy if exists "profiles update own name" on public.profiles;

create table public.suggestion_rate_limits (
  rate_limit_key text primary key check (rate_limit_key ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count >= 1),
  updated_at timestamptz not null default now()
);
alter table public.suggestion_rate_limits enable row level security;
create index timeline_events_group_idx on public.timeline_events(group_id)
  where group_id is not null;
create index timeline_events_created_by_idx on public.timeline_events(created_by)
  where created_by is not null;
create index timeline_events_updated_by_idx on public.timeline_events(updated_by)
  where updated_by is not null;
create index edit_suggestions_event_idx on public.edit_suggestions(event_id);
create index edit_suggestions_reviewed_by_idx on public.edit_suggestions(reviewed_by)
  where reviewed_by is not null;

create extension if not exists pg_cron;

create function public.purge_expired_suggestion_data() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.edit_suggestions
  where (status = 'declined' and reviewed_at < now() - interval '90 days')
     or (status = 'approved' and reviewed_at < now() - interval '1 year');
  delete from public.suggestion_rate_limits
  where updated_at < now() - interval '48 hours';
end;
$$;

select cron.schedule(
  'purge-expired-suggestion-data',
  '17 3 * * *',
  'select public.purge_expired_suggestion_data()'
);

create or replace function public.is_curator() returns boolean
language sql stable security definer set search_path = '' as $$
  select
    (select auth.jwt() ->> 'aal') = 'aal2'
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'curator'
    );
$$;

create or replace function public.save_timeline_event(
  event_data jsonb,
  parent_ids text[] default '{}'
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_event_id text;
  parent text;
  position integer := 0;
  item jsonb;
begin
  if not public.is_curator() then
    raise exception 'curator_access_required' using errcode = '42501';
  end if;
  if jsonb_typeof(event_data) <> 'object' then
    raise exception 'invalid_event';
  end if;

  v_event_id := event_data ->> 'id';
  if v_event_id is null or v_event_id !~ '^[a-z0-9-]{1,100}$' then
    raise exception 'invalid_event_id';
  end if;
  if coalesce(jsonb_typeof(event_data -> 'key_figures'), 'null') <> 'array'
     or jsonb_array_length(event_data -> 'key_figures') > 50 then
    raise exception 'invalid_key_figures';
  end if;
  if exists (
    select 1 from jsonb_array_elements_text(event_data -> 'key_figures') value
    where length(value) > 200 or length(trim(value)) = 0
  ) then
    raise exception 'invalid_key_figure';
  end if;
  if coalesce(jsonb_typeof(event_data -> 'links'), 'null') <> 'array'
     or jsonb_array_length(event_data -> 'links') > 20 then
    raise exception 'invalid_links';
  end if;
  for item in select * from jsonb_array_elements(event_data -> 'links') loop
    if jsonb_typeof(item) <> 'object'
       or item - array['label', 'url'] <> '{}'::jsonb
       or jsonb_typeof(item -> 'label') <> 'string'
       or jsonb_typeof(item -> 'url') <> 'string'
       or length(trim(item ->> 'label')) not between 1 and 300
       or length(item ->> 'url') not between 1 and 2048
       or item ->> 'url' !~ '^https://[^[:space:]/?#@]+(:[0-9]+)?([/?#]|$)'
       or item ->> 'url' ~ '@' then
      raise exception 'invalid_link';
    end if;
  end loop;
  if jsonb_typeof(event_data -> 'icon') <> 'object'
     or not (
       (event_data -> 'icon' ->> 'type' = 'lucide'
        and (event_data -> 'icon') - array['type', 'name'] = '{}'::jsonb
        and coalesce(event_data -> 'icon' ->> 'name', '') ~ '^[A-Za-z0-9]{1,50}$')
       or
       (event_data -> 'icon' ->> 'type' = 'image'
        and (event_data -> 'icon') - array['type', 'src'] = '{}'::jsonb
        and length(event_data -> 'icon' ->> 'src') <= 550000
        and event_data -> 'icon' ->> 'src' ~ '^data:image/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$')
     ) then
    raise exception 'invalid_icon';
  end if;
  if cardinality(parent_ids) > 10
     or cardinality(parent_ids) <> cardinality(array(select distinct unnest(parent_ids))) then
    raise exception 'invalid_parents';
  end if;

  insert into public.timeline_events (
    id, year, date_label, title, tradition_id, kind, icon, summary, detail,
    key_figures, links, group_id, created_by, updated_by
  ) values (
    v_event_id,
    (event_data ->> 'year')::integer,
    trim(event_data ->> 'date_label'),
    trim(event_data ->> 'title'),
    event_data ->> 'tradition_id',
    event_data ->> 'kind',
    event_data -> 'icon',
    trim(event_data ->> 'summary'),
    trim(coalesce(event_data ->> 'detail', '')),
    array(select trim(value) from jsonb_array_elements_text(event_data -> 'key_figures') value),
    event_data -> 'links',
    nullif(event_data ->> 'group_id', ''),
    auth.uid(),
    auth.uid()
  )
  on conflict (id) do update set
    year = excluded.year,
    date_label = excluded.date_label,
    title = excluded.title,
    tradition_id = excluded.tradition_id,
    kind = excluded.kind,
    icon = excluded.icon,
    summary = excluded.summary,
    detail = excluded.detail,
    key_figures = excluded.key_figures,
    links = excluded.links,
    group_id = excluded.group_id,
    updated_by = auth.uid();

  delete from public.event_parents ep where ep.event_id = v_event_id;
  foreach parent in array parent_ids loop
    insert into public.event_parents(event_id, parent_id, sort_order)
    values (v_event_id, parent, position);
    position := position + 1;
  end loop;
end;
$$;

drop function public.submit_edit_suggestion(jsonb, jsonb);

create function public.submit_edit_suggestion(
  suggestion_data jsonb,
  changes_data jsonb,
  rate_limit_key text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  new_id uuid;
  item jsonb;
  target_event public.timeline_events%rowtype;
  source_value jsonb;
  source_url text;
  source_label text;
  contributor_value text;
  note_value text;
  field_name text;
  after_value text;
  before_value text;
  seen_fields text[] := array[]::text[];
  limit_count integer;
begin
  if jsonb_typeof(suggestion_data) <> 'object'
     or suggestion_data - array['event_id', 'contributor', 'note', 'source'] <> '{}'::jsonb
     or jsonb_typeof(changes_data) <> 'array'
     or jsonb_array_length(changes_data) > 4 then
    raise exception 'invalid_suggestion';
  end if;
  if rate_limit_key is null or rate_limit_key !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_rate_limit_key';
  end if;

  select * into target_event
  from public.timeline_events
  where id = suggestion_data ->> 'event_id';
  if not found then raise exception 'event_not_found'; end if;

  contributor_value := coalesce(nullif(trim(suggestion_data ->> 'contributor'), ''), 'Anonymous');
  note_value := trim(coalesce(suggestion_data ->> 'note', ''));
  if length(contributor_value) not between 1 and 100
     or length(note_value) not between 1 and 2000 then
    raise exception 'invalid_suggestion_metadata';
  end if;

  source_value := nullif(suggestion_data -> 'source', 'null'::jsonb);
  if source_value is not null then
    if jsonb_typeof(source_value) <> 'object'
       or source_value - array['label', 'url'] <> '{}'::jsonb
       or jsonb_typeof(source_value -> 'label') <> 'string'
       or jsonb_typeof(source_value -> 'url') <> 'string' then
      raise exception 'invalid_source';
    end if;
    source_label := trim(source_value ->> 'label');
    source_url := trim(source_value ->> 'url');
    if length(source_label) not between 1 and 300
       or length(source_url) not between 1 and 2048
       or source_url !~ '^https://[^[:space:]/?#@]+(:[0-9]+)?([/?#]|$)'
       or source_url ~ '@' then
      raise exception 'invalid_source';
    end if;
    source_value := jsonb_build_object('label', source_label, 'url', source_url);
  end if;
  if jsonb_array_length(changes_data) = 0 and source_value is null then
    raise exception 'empty_suggestion';
  end if;

  -- Keep a fixed 24-hour window starting at the first accepted submission.
  delete from public.suggestion_rate_limits
  where updated_at < now() - interval '48 hours';
  insert into public.suggestion_rate_limits(rate_limit_key, window_started_at, request_count, updated_at)
  values (submit_edit_suggestion.rate_limit_key, now(), 1, now())
  on conflict on constraint suggestion_rate_limits_pkey do update set
    request_count = case
      when suggestion_rate_limits.window_started_at <= now() - interval '24 hours' then 1
      else suggestion_rate_limits.request_count + 1
    end,
    window_started_at = case
      when suggestion_rate_limits.window_started_at <= now() - interval '24 hours' then now()
      else suggestion_rate_limits.window_started_at
    end,
    updated_at = now()
  returning request_count into limit_count;
  if limit_count > 20 then raise exception 'suggestion_rate_limit_exceeded'; end if;
  if (select count(*) from public.edit_suggestions where status = 'pending') >= 500 then
    raise exception 'suggestion_queue_full';
  end if;

  insert into public.edit_suggestions(event_id, event_title, contributor, note, source)
  values (target_event.id, target_event.title, contributor_value, note_value, source_value)
  returning id into new_id;

  for item in select * from jsonb_array_elements(changes_data) loop
    if jsonb_typeof(item) <> 'object'
       or item - array['field', 'after'] <> '{}'::jsonb
       or jsonb_typeof(item -> 'field') <> 'string'
       or jsonb_typeof(item -> 'after') <> 'string' then
      raise exception 'invalid_change';
    end if;
    field_name := item ->> 'field';
    after_value := trim(item ->> 'after');
    if field_name not in ('title', 'dateLabel', 'summary', 'detail')
       or field_name = any(seen_fields)
       or length(after_value) = 0
       or (field_name = 'title' and length(after_value) > 200)
       or (field_name = 'dateLabel' and length(after_value) > 100)
       or (field_name = 'summary' and length(after_value) > 2000)
       or (field_name = 'detail' and length(after_value) > 50000) then
      raise exception 'invalid_change';
    end if;
    seen_fields := array_append(seen_fields, field_name);
    before_value := case field_name
      when 'title' then target_event.title
      when 'dateLabel' then target_event.date_label
      when 'summary' then target_event.summary
      when 'detail' then target_event.detail
    end;
    if after_value = before_value then raise exception 'unchanged_value'; end if;

    insert into public.suggestion_changes(suggestion_id, field, before_value, after_value)
    values (new_id, field_name::public.suggestable_field, before_value, after_value);
  end loop;
  return new_id;
end;
$$;

-- Existing objects are made opt-in for Data API roles.
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- New objects stay private until a future migration grants exactly what is needed.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated;

grant select on public.traditions,
                public.timeline_groups,
                public.timeline_events,
                public.event_parents
  to anon, authenticated;
grant select on public.profiles,
                public.edit_suggestions,
                public.suggestion_changes
  to authenticated;

grant execute on function public.is_curator() to authenticated;
grant execute on function public.save_timeline_event(jsonb, text[]) to authenticated;
grant execute on function public.delete_timeline_event(text) to authenticated;
grant execute on function public.save_timeline_group(jsonb) to authenticated;
grant execute on function public.delete_timeline_group(text) to authenticated;
grant execute on function public.review_edit_suggestion(uuid, text) to authenticated;
grant execute on function public.submit_edit_suggestion(jsonb, jsonb, text) to service_role;
