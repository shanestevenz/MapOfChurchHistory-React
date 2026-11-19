-- Named groups of people, drawn as one node on the timeline.
--
-- A person's `person.group` (e.g. "Early Church Fathers") groups them with
-- others of the same name on the same lane. The app decides what is actually
-- merged: anyone who lived through a landmark event on the lane is drawn on
-- their own. Curators set the group in the editor; anyone may suggest one.

-- Postgres 12+ allows this inside the migration's transaction; the new value
-- is only used when the functions below run, after it commits.
alter type public.suggestable_field add value if not exists 'personGroup';

create or replace function public.save_timeline_event(p_user_id uuid, p_event_data jsonb, p_parent_ids text[] default '{}') returns void
language plpgsql security definer set search_path = '' as $$
declare
  target_event_id text;
  parent text;
  position integer := 0;
  item jsonb;
  person_value jsonb;
begin
  if not public.is_curator(p_user_id) then
    raise exception 'curator_access_required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_event_data) <> 'object' then raise exception 'invalid_event'; end if;
  target_event_id := p_event_data ->> 'id';
  if target_event_id is null or target_event_id !~ '^[a-z0-9-]{1,100}$' then raise exception 'invalid_event_id'; end if;
  if coalesce(jsonb_typeof(p_event_data -> 'key_figures'), 'null') <> 'array'
     or jsonb_array_length(p_event_data -> 'key_figures') > 50 then
    raise exception 'invalid_key_figures';
  end if;
  if exists (
    select 1 from jsonb_array_elements_text(p_event_data -> 'key_figures') value
    where length(value) > 200 or length(trim(value)) = 0
  ) then raise exception 'invalid_key_figure'; end if;
  if coalesce(jsonb_typeof(p_event_data -> 'links'), 'null') <> 'array'
     or jsonb_array_length(p_event_data -> 'links') > 20 then
    raise exception 'invalid_links';
  end if;
  for item in select * from jsonb_array_elements(p_event_data -> 'links') loop
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
  if jsonb_typeof(p_event_data -> 'icon') <> 'object'
     or not (
       (p_event_data -> 'icon' ->> 'type' = 'lucide'
        and (p_event_data -> 'icon') - array['type', 'name'] = '{}'::jsonb
        and coalesce(p_event_data -> 'icon' ->> 'name', '') ~ '^[A-Za-z0-9]{1,50}$')
       or
       (p_event_data -> 'icon' ->> 'type' = 'image'
        and (p_event_data -> 'icon') - array['type', 'src'] = '{}'::jsonb
        and length(p_event_data -> 'icon' ->> 'src') <= 550000
        and p_event_data -> 'icon' ->> 'src' ~ '^data:image/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$')
     ) then raise exception 'invalid_icon'; end if;
  if cardinality(p_parent_ids) > 10
     or cardinality(p_parent_ids) <> cardinality(array(select distinct unnest(p_parent_ids))) then
    raise exception 'invalid_parents';
  end if;

  -- People: a role, a type, an optional affiliated branch and other names.
  -- People never grow out of other events, so they take no parents.
  person_value := nullif(p_event_data -> 'person', 'null'::jsonb);
  if p_event_data ->> 'kind' = 'person' then
    if person_value is null
       or jsonb_typeof(person_value) <> 'object'
       or person_value - array['role', 'type', 'affiliation', 'aliases', 'group'] <> '{}'::jsonb
       or jsonb_typeof(person_value -> 'role') <> 'string'
       or length(trim(person_value ->> 'role')) not between 1 and 200
       or coalesce(person_value ->> 'type', '') not in
          ('theologian', 'reformer', 'evangelist', 'church-leader', 'ruler', 'world') then
      raise exception 'invalid_person';
    end if;
    if person_value ? 'affiliation' and jsonb_typeof(person_value -> 'affiliation') <> 'null'
       and not exists (select 1 from public.traditions t where t.id = person_value ->> 'affiliation') then
      raise exception 'invalid_person_affiliation';
    end if;
    if person_value ? 'aliases' then
      if jsonb_typeof(person_value -> 'aliases') <> 'array'
         or jsonb_array_length(person_value -> 'aliases') > 20
         or exists (
           select 1 from jsonb_array_elements(person_value -> 'aliases') alias
           where jsonb_typeof(alias) <> 'string'
              or length(trim(alias #>> '{}')) not between 1 and 200
         ) then
        raise exception 'invalid_person_aliases';
      end if;
    end if;
    if person_value ? 'group' and jsonb_typeof(person_value -> 'group') <> 'null'
       and (jsonb_typeof(person_value -> 'group') <> 'string'
            or length(trim(person_value ->> 'group')) > 100) then
      raise exception 'invalid_person_group';
    end if;
    if cardinality(p_parent_ids) > 0 then raise exception 'invalid_parents'; end if;
    person_value := jsonb_strip_nulls(jsonb_build_object(
      'role', trim(person_value ->> 'role'),
      'type', person_value ->> 'type',
      'affiliation', person_value -> 'affiliation',
      'aliases', case
        when person_value ? 'aliases' and jsonb_array_length(person_value -> 'aliases') > 0
        then (select jsonb_agg(trim(alias)) from jsonb_array_elements_text(person_value -> 'aliases') alias)
      end,
      'group', nullif(trim(person_value ->> 'group'), '')
    ));
  else
    person_value := null;
  end if;

  insert into public.timeline_events (
    id, year, date_label, title, tradition_id, kind, icon, summary, detail,
    key_figures, links, group_id, person, created_by, updated_by
  ) values (
    target_event_id,
    (p_event_data ->> 'year')::integer,
    trim(p_event_data ->> 'date_label'),
    trim(p_event_data ->> 'title'),
    p_event_data ->> 'tradition_id',
    p_event_data ->> 'kind',
    p_event_data -> 'icon',
    trim(p_event_data ->> 'summary'),
    trim(coalesce(p_event_data ->> 'detail', '')),
    array(select trim(value) from jsonb_array_elements_text(p_event_data -> 'key_figures') value),
    p_event_data -> 'links',
    nullif(p_event_data ->> 'group_id', ''),
    person_value,
    p_user_id,
    p_user_id
  ) on conflict (id) do update set
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
    person = excluded.person,
    updated_by = p_user_id;

  delete from public.event_parents ep where ep.event_id = target_event_id;
  foreach parent in array p_parent_ids loop
    insert into public.event_parents(event_id, parent_id, sort_order) values (target_event_id, parent, position);
    position := position + 1;
  end loop;
end;
$$;

revoke execute on function public.save_timeline_event(uuid, jsonb, text[]) from public;

create or replace function public.submit_edit_suggestion(p_suggestion_data jsonb, p_changes_data jsonb, p_rate_limit_key text) returns uuid
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
  if jsonb_typeof(p_suggestion_data) <> 'object'
     or p_suggestion_data - array['event_id', 'contributor', 'note', 'source'] <> '{}'::jsonb
     or jsonb_typeof(p_changes_data) <> 'array'
     or jsonb_array_length(p_changes_data) > 4 then
    raise exception 'invalid_suggestion';
  end if;
  if p_rate_limit_key is null or p_rate_limit_key !~ '^[a-f0-9]{64}$' then raise exception 'invalid_rate_limit_key'; end if;

  select * into target_event from public.timeline_events where id = p_suggestion_data ->> 'event_id';
  if not found then raise exception 'event_not_found'; end if;
  contributor_value := coalesce(nullif(trim(p_suggestion_data ->> 'contributor'), ''), 'Anonymous');
  note_value := trim(coalesce(p_suggestion_data ->> 'note', ''));
  if length(contributor_value) not between 1 and 100 or length(note_value) not between 1 and 2000 then
    raise exception 'invalid_suggestion_metadata';
  end if;

  source_value := nullif(p_suggestion_data -> 'source', 'null'::jsonb);
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
  if jsonb_array_length(p_changes_data) = 0 and source_value is null then raise exception 'empty_suggestion'; end if;

  delete from public.suggestion_rate_limits where updated_at < now() - interval '48 hours';
  insert into public.suggestion_rate_limits(rate_limit_key, window_started_at, request_count, updated_at)
  values (p_rate_limit_key, now(), 1, now())
  on conflict (rate_limit_key) do update set
    request_count = case
      when public.suggestion_rate_limits.window_started_at <= now() - interval '24 hours' then 1
      else public.suggestion_rate_limits.request_count + 1
    end,
    window_started_at = case
      when public.suggestion_rate_limits.window_started_at <= now() - interval '24 hours' then now()
      else public.suggestion_rate_limits.window_started_at
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
  for item in select * from jsonb_array_elements(p_changes_data) loop
    if jsonb_typeof(item) <> 'object'
       or item - array['field', 'after'] <> '{}'::jsonb
       or jsonb_typeof(item -> 'field') <> 'string'
       or jsonb_typeof(item -> 'after') <> 'string' then
      raise exception 'invalid_change';
    end if;
    field_name := item ->> 'field';
    after_value := trim(item ->> 'after');
    if field_name not in ('title', 'dateLabel', 'summary', 'detail', 'personGroup')
       or field_name = any(seen_fields)
       or (length(after_value) = 0 and field_name <> 'personGroup')
       or (field_name = 'personGroup' and (target_event.kind <> 'person' or length(after_value) > 100))
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
      when 'personGroup' then coalesce(target_event.person ->> 'group', '')
    end;
    if after_value = before_value then raise exception 'unchanged_value'; end if;
    insert into public.suggestion_changes(suggestion_id, field, before_value, after_value)
    values (new_id, field_name::public.suggestable_field, before_value, after_value);
  end loop;
  return new_id;
end;
$$;

revoke execute on function public.submit_edit_suggestion(jsonb, jsonb, text) from public;

create or replace function public.review_edit_suggestion(p_user_id uuid, p_suggestion_id uuid, p_decision text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  suggestion public.edit_suggestions%rowtype;
  change public.suggestion_changes%rowtype;
begin
  if not public.is_curator(p_user_id) then raise exception 'curator_access_required' using errcode = '42501'; end if;
  if p_decision not in ('approved', 'declined') then raise exception 'invalid_decision'; end if;
  select * into suggestion from public.edit_suggestions where id = p_suggestion_id for update;
  if suggestion.id is null then raise exception 'suggestion_not_found'; end if;
  if suggestion.status <> 'pending' then raise exception 'suggestion_already_reviewed'; end if;
  if p_decision = 'approved' then
    for change in select * from public.suggestion_changes sc where sc.suggestion_id = p_suggestion_id loop
      if change.field = 'title' then update public.timeline_events set title = change.after_value, updated_by = p_user_id where id = suggestion.event_id;
      elsif change.field = 'dateLabel' then update public.timeline_events set date_label = change.after_value, updated_by = p_user_id where id = suggestion.event_id;
      elsif change.field = 'summary' then update public.timeline_events set summary = change.after_value, updated_by = p_user_id where id = suggestion.event_id;
      elsif change.field = 'detail' then update public.timeline_events set detail = change.after_value, updated_by = p_user_id where id = suggestion.event_id;
      elsif change.field = 'personGroup' then
        update public.timeline_events
        set person = case
              when change.after_value = '' then person - 'group'
              else jsonb_set(person, '{group}', to_jsonb(change.after_value))
            end,
            updated_by = p_user_id
        where id = suggestion.event_id and kind = 'person';
      end if;
    end loop;
    if suggestion.source is not null then
      update public.timeline_events
      set links = case
        when exists(select 1 from jsonb_array_elements(links) link where link ->> 'url' = suggestion.source ->> 'url') then links
        else links || jsonb_build_array(suggestion.source)
      end, updated_by = p_user_id
      where id = suggestion.event_id;
    end if;
  end if;
  update public.edit_suggestions
  set status = p_decision::public.suggestion_status, reviewed_at = now(), reviewed_by = p_user_id
  where id = p_suggestion_id;
end;
$$;

revoke execute on function public.review_edit_suggestion(uuid, uuid, text) from public;
