-- Application schema for the Neon Postgres backend.
-- Run Better Auth's schema migration first; it creates auth."user".

create extension if not exists pgcrypto;

create type public.suggestion_status as enum ('pending', 'approved', 'declined');
create type public.suggestable_field as enum ('title', 'dateLabel', 'summary', 'detail');

create table public.traditions (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null,
  blurb text not null,
  lane integer not null unique check (lane >= 0),
  family text not null check (family in ('gold', 'sapphire', 'ruby', 'emerald', 'amethyst')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.timeline_groups (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  title text not null check (length(title) between 1 and 200),
  date_label text not null check (length(date_label) between 1 and 100),
  start_year integer not null check (start_year between -10000 and 10000),
  end_year integer not null check (end_year between start_year and 10000),
  auto_expand_zoom double precision not null default 1.35 check (auto_expand_zoom between 0.3 and 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.timeline_events (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  year integer not null check (year between -10000 and 10000),
  date_label text not null check (length(date_label) between 1 and 100),
  title text not null check (length(title) between 1 and 200),
  tradition_id text not null references public.traditions(id) on update cascade,
  kind text not null check (kind in ('event', 'council', 'schism', 'reunion')),
  icon jsonb not null check (jsonb_typeof(icon) = 'object'),
  summary text not null check (length(summary) between 1 and 2000),
  detail text not null default '' check (length(detail) <= 50000),
  key_figures text[] not null default '{}',
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  group_id text references public.timeline_groups(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text references auth."user"(id) on delete set null,
  updated_by text references auth."user"(id) on delete set null
);
create index timeline_events_year_idx on public.timeline_events(year);
create index timeline_events_tradition_idx on public.timeline_events(tradition_id);
create index timeline_events_group_idx on public.timeline_events(group_id) where group_id is not null;
create index timeline_events_created_by_idx on public.timeline_events(created_by) where created_by is not null;
create index timeline_events_updated_by_idx on public.timeline_events(updated_by) where updated_by is not null;

create table public.event_parents (
  event_id text not null references public.timeline_events(id) on delete cascade,
  parent_id text not null references public.timeline_events(id) on delete restrict,
  sort_order integer not null default 0 check (sort_order >= 0),
  primary key (event_id, parent_id),
  check (event_id <> parent_id)
);
create index event_parents_parent_idx on public.event_parents(parent_id);

create table public.edit_suggestions (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.timeline_events(id) on delete restrict,
  event_title text not null,
  contributor text not null default 'Anonymous' check (length(contributor) between 1 and 100),
  note text not null check (length(note) between 1 and 2000),
  source jsonb check (source is null or jsonb_typeof(source) = 'object'),
  status public.suggestion_status not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text references auth."user"(id) on delete set null,
  check ((status = 'pending' and reviewed_at is null and reviewed_by is null) or
         (status <> 'pending' and reviewed_at is not null and reviewed_by is not null))
);
create index edit_suggestions_status_created_idx on public.edit_suggestions(status, created_at desc);
create index edit_suggestions_event_idx on public.edit_suggestions(event_id);
create index edit_suggestions_reviewed_by_idx on public.edit_suggestions(reviewed_by) where reviewed_by is not null;

create table public.suggestion_changes (
  id bigint generated always as identity primary key,
  suggestion_id uuid not null references public.edit_suggestions(id) on delete cascade,
  field public.suggestable_field not null,
  before_value text not null,
  after_value text not null check (length(after_value) between 1 and 50000),
  unique (suggestion_id, field)
);

create table public.suggestion_rate_limits (
  rate_limit_key text primary key check (rate_limit_key ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count >= 1),
  updated_at timestamptz not null default now()
);

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger traditions_updated_at before update on public.traditions for each row execute function public.set_updated_at();
create trigger timeline_groups_updated_at before update on public.timeline_groups for each row execute function public.set_updated_at();
create trigger timeline_events_updated_at before update on public.timeline_events for each row execute function public.set_updated_at();

create function public.is_curator(p_user_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from auth."user" u
    where u.id = p_user_id
      and u.role = 'admin'
      and coalesce(u."twoFactorEnabled", false)
  );
$$;

create function public.save_timeline_event(p_user_id text, p_event_data jsonb, p_parent_ids text[] default '{}') returns void
language plpgsql security definer set search_path = '' as $$
declare
  target_event_id text;
  parent text;
  position integer := 0;
  item jsonb;
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

  insert into public.timeline_events (
    id, year, date_label, title, tradition_id, kind, icon, summary, detail,
    key_figures, links, group_id, created_by, updated_by
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
    updated_by = p_user_id;

  delete from public.event_parents ep where ep.event_id = target_event_id;
  foreach parent in array p_parent_ids loop
    insert into public.event_parents(event_id, parent_id, sort_order) values (target_event_id, parent, position);
    position := position + 1;
  end loop;
end;
$$;

create function public.save_timeline_group(p_user_id text, p_group_data jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_curator(p_user_id) then raise exception 'curator_access_required' using errcode = '42501'; end if;
  if jsonb_typeof(p_group_data) <> 'object'
     or p_group_data - array['id', 'title', 'date_label', 'start_year', 'end_year', 'auto_expand_zoom'] <> '{}'::jsonb then
    raise exception 'invalid_group';
  end if;
  insert into public.timeline_groups(id, title, date_label, start_year, end_year, auto_expand_zoom)
  values (
    p_group_data ->> 'id',
    trim(p_group_data ->> 'title'),
    trim(p_group_data ->> 'date_label'),
    (p_group_data ->> 'start_year')::integer,
    (p_group_data ->> 'end_year')::integer,
    coalesce((p_group_data ->> 'auto_expand_zoom')::double precision, 1.35)
  ) on conflict (id) do update set
    title = excluded.title,
    date_label = excluded.date_label,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    auto_expand_zoom = excluded.auto_expand_zoom;
end;
$$;

create function public.delete_timeline_group(p_user_id text, p_target_id text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_curator(p_user_id) then raise exception 'curator_access_required' using errcode = '42501'; end if;
  delete from public.timeline_groups where id = p_target_id;
end;
$$;

create function public.delete_timeline_event(p_user_id text, p_target_id text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_curator(p_user_id) then raise exception 'curator_access_required' using errcode = '42501'; end if;
  delete from public.event_parents where parent_id = p_target_id;
  delete from public.timeline_events where id = p_target_id;
end;
$$;

create function public.submit_edit_suggestion(p_suggestion_data jsonb, p_changes_data jsonb, p_rate_limit_key text) returns uuid
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

create function public.review_edit_suggestion(p_user_id text, p_suggestion_id uuid, p_decision text) returns void
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

create function public.purge_expired_suggestion_data() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.edit_suggestions
  where (status = 'declined' and reviewed_at < now() - interval '90 days')
     or (status = 'approved' and reviewed_at < now() - interval '1 year');
  delete from public.suggestion_rate_limits where updated_at < now() - interval '48 hours';
end;
$$;

-- The browser only calls this app's server routes. Keep all database objects private.
revoke all on all tables in schema public from public;
revoke all on all sequences in schema public from public;
revoke execute on all functions in schema public from public;
