-- A person's `condemned` note becomes `persecution`: how they were martyred,
-- jailed, exiled or condemned, by anyone, shown as its own callout rather than
-- a tag. It no longer needs a parent church.

update public.timeline_events
set person = (person - 'condemned')
  || jsonb_build_object('persecution', person -> 'condemned')
where person ? 'condemned';

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
  if coalesce(p_event_data ->> 'branch_from', 'node') not in ('node', 'date') then
    raise exception 'invalid_branch_from';
  end if;
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
       or person_value - array['role', 'type', 'affiliation', 'aliases', 'group', 'region', 'formerly', 'persecution'] <> '{}'::jsonb
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
    if person_value ? 'region' and jsonb_typeof(person_value -> 'region') <> 'null'
       and (jsonb_typeof(person_value -> 'region') <> 'string'
            or length(trim(person_value ->> 'region')) > 100) then
      raise exception 'invalid_person_region';
    end if;
    if person_value ? 'formerly' and jsonb_typeof(person_value -> 'formerly') <> 'null' then
      if not exists (select 1 from public.traditions t where t.id = person_value ->> 'formerly') then
        raise exception 'invalid_person_formerly';
      end if;
      if person_value ? 'affiliation' and jsonb_typeof(person_value -> 'affiliation') <> 'null' then
        raise exception 'invalid_person_formerly';
      end if;
    end if;
    if person_value ? 'persecution' and jsonb_typeof(person_value -> 'persecution') <> 'null'
       and (jsonb_typeof(person_value -> 'persecution') <> 'string'
            or length(trim(person_value ->> 'persecution')) > 300) then
      raise exception 'invalid_person_persecution';
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
      'group', nullif(trim(person_value ->> 'group'), ''),
      'region', nullif(trim(person_value ->> 'region'), ''),
      'formerly', person_value -> 'formerly',
      'persecution', nullif(trim(person_value ->> 'persecution'), '')
    ));
  else
    person_value := null;
  end if;

  insert into public.timeline_events (
    id, year, date_label, title, tradition_id, kind, icon, summary, detail,
    key_figures, links, group_id, person, branch_from, created_by, updated_by
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
    nullif(p_event_data ->> 'branch_from', ''),
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
    branch_from = excluded.branch_from,
    updated_by = p_user_id;

  delete from public.event_parents ep where ep.event_id = target_event_id;
  foreach parent in array p_parent_ids loop
    insert into public.event_parents(event_id, parent_id, sort_order) values (target_event_id, parent, position);
    position := position + 1;
  end loop;
end;
$$;

revoke execute on function public.save_timeline_event(uuid, jsonb, text[]) from public;
