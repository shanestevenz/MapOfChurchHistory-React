create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('viewer', 'curator');
create type public.suggestion_status as enum ('pending', 'approved', 'declined');
create type public.suggestable_field as enum ('title', 'dateLabel', 'summary', 'detail');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);
create index timeline_events_year_idx on public.timeline_events(year);
create index timeline_events_tradition_idx on public.timeline_events(tradition_id);

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
  reviewed_by uuid references auth.users(id) on delete set null,
  check ((status = 'pending' and reviewed_at is null and reviewed_by is null) or
         (status <> 'pending' and reviewed_at is not null and reviewed_by is not null))
);
create index edit_suggestions_status_created_idx on public.edit_suggestions(status, created_at desc);

create table public.suggestion_changes (
  id bigint generated always as identity primary key,
  suggestion_id uuid not null references public.edit_suggestions(id) on delete cascade,
  field public.suggestable_field not null,
  before_value text not null,
  after_value text not null check (length(after_value) between 1 and 50000),
  unique (suggestion_id, field)
);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger traditions_updated_at before update on public.traditions for each row execute function public.set_updated_at();
create trigger timeline_groups_updated_at before update on public.timeline_groups for each row execute function public.set_updated_at();
create trigger timeline_events_updated_at before update on public.timeline_events for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_curator() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'curator');
$$;

alter table public.profiles enable row level security;
alter table public.traditions enable row level security;
alter table public.timeline_groups enable row level security;
alter table public.timeline_events enable row level security;
alter table public.event_parents enable row level security;
alter table public.edit_suggestions enable row level security;
alter table public.suggestion_changes enable row level security;

create policy "profiles read own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles update own name" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "traditions public read" on public.traditions for select to anon, authenticated using (true);
create policy "timeline groups public read" on public.timeline_groups for select to anon, authenticated using (true);
create policy "events public read" on public.timeline_events for select to anon, authenticated using (true);
create policy "parents public read" on public.event_parents for select to anon, authenticated using (true);
create policy "suggestions curator read" on public.edit_suggestions for select to authenticated using (public.is_curator());
create policy "changes curator read" on public.suggestion_changes for select to authenticated using (public.is_curator());

create or replace function public.save_timeline_event(event_data jsonb, parent_ids text[] default '{}') returns void
language plpgsql security definer set search_path = '' as $$
declare v_event_id text := event_data ->> 'id'; parent text; position integer := 0;
begin
  if not public.is_curator() then raise exception 'Curator access required' using errcode = '42501'; end if;
  insert into public.timeline_events (id, year, date_label, title, tradition_id, kind, icon, summary, detail, key_figures, links, group_id, created_by, updated_by)
  values (v_event_id, (event_data->>'year')::integer, event_data->>'date_label', event_data->>'title', event_data->>'tradition_id', event_data->>'kind', event_data->'icon', event_data->>'summary', coalesce(event_data->>'detail',''), coalesce(array(select jsonb_array_elements_text(event_data->'key_figures')),'{}'), coalesce(event_data->'links','[]'), nullif(event_data->>'group_id',''), auth.uid(), auth.uid())
  on conflict (id) do update set year=excluded.year, date_label=excluded.date_label, title=excluded.title, tradition_id=excluded.tradition_id, kind=excluded.kind, icon=excluded.icon, summary=excluded.summary, detail=excluded.detail, key_figures=excluded.key_figures, links=excluded.links, group_id=excluded.group_id, updated_by=auth.uid();
  delete from public.event_parents ep where ep.event_id = v_event_id;
  foreach parent in array parent_ids loop
    insert into public.event_parents(event_id, parent_id, sort_order) values(v_event_id, parent, position);
    position := position + 1;
  end loop;
end;
$$;

create or replace function public.save_timeline_group(group_data jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_curator() then raise exception 'Curator access required' using errcode = '42501'; end if;
  insert into public.timeline_groups(id,title,date_label,start_year,end_year,auto_expand_zoom)
  values(group_data->>'id',group_data->>'title',group_data->>'date_label',(group_data->>'start_year')::integer,(group_data->>'end_year')::integer,(group_data->>'auto_expand_zoom')::double precision)
  on conflict (id) do update set title=excluded.title,date_label=excluded.date_label,start_year=excluded.start_year,end_year=excluded.end_year,auto_expand_zoom=excluded.auto_expand_zoom;
end;
$$;

create or replace function public.delete_timeline_group(target_id text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_curator() then raise exception 'Curator access required' using errcode = '42501'; end if;
  delete from public.timeline_groups where id=target_id;
end;
$$;

create or replace function public.submit_edit_suggestion(suggestion_data jsonb, changes_data jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_id uuid; item jsonb; actual_title text;
begin
  select title into actual_title from public.timeline_events where id = suggestion_data->>'event_id';
  if actual_title is null then raise exception 'Event not found'; end if;
  if jsonb_array_length(changes_data) = 0 and nullif(suggestion_data->'source','null'::jsonb) is null then raise exception 'A change or source is required'; end if;
  insert into public.edit_suggestions(event_id,event_title,contributor,note,source)
  values(suggestion_data->>'event_id',actual_title,coalesce(nullif(trim(suggestion_data->>'contributor'),''),'Anonymous'),suggestion_data->>'note',nullif(suggestion_data->'source','null'::jsonb)) returning id into new_id;
  for item in select * from jsonb_array_elements(changes_data) loop
    insert into public.suggestion_changes(suggestion_id,field,before_value,after_value)
    values(new_id,(item->>'field')::public.suggestable_field,item->>'before',item->>'after');
  end loop;
  return new_id;
end;
$$;

create or replace function public.review_edit_suggestion(suggestion_id uuid, decision text) returns void
language plpgsql security definer set search_path = '' as $$
declare suggestion public.edit_suggestions%rowtype; change public.suggestion_changes%rowtype;
begin
  if not public.is_curator() then raise exception 'Curator access required' using errcode = '42501'; end if;
  if decision not in ('approved','declined') then raise exception 'Invalid decision'; end if;
  select * into suggestion from public.edit_suggestions where id = suggestion_id for update;
  if suggestion.id is null then raise exception 'Suggestion not found'; end if;
  if suggestion.status <> 'pending' then raise exception 'Suggestion already reviewed'; end if;
  if decision = 'approved' then
    for change in select * from public.suggestion_changes where suggestion_changes.suggestion_id = review_edit_suggestion.suggestion_id loop
      if change.field = 'title' then update public.timeline_events set title=change.after_value, updated_by=auth.uid() where id=suggestion.event_id;
      elsif change.field = 'dateLabel' then update public.timeline_events set date_label=change.after_value, updated_by=auth.uid() where id=suggestion.event_id;
      elsif change.field = 'summary' then update public.timeline_events set summary=change.after_value, updated_by=auth.uid() where id=suggestion.event_id;
      elsif change.field = 'detail' then update public.timeline_events set detail=change.after_value, updated_by=auth.uid() where id=suggestion.event_id; end if;
    end loop;
    if suggestion.source is not null then
      update public.timeline_events set links = case when exists(select 1 from jsonb_array_elements(links) link where link->>'url'=suggestion.source->>'url') then links else links || jsonb_build_array(suggestion.source) end, updated_by=auth.uid() where id=suggestion.event_id;
    end if;
  end if;
  update public.edit_suggestions set status=decision::public.suggestion_status, reviewed_at=now(), reviewed_by=auth.uid() where id=suggestion_id;
end;
$$;

grant execute on function public.save_timeline_event(jsonb,text[]) to authenticated;
grant execute on function public.submit_edit_suggestion(jsonb,jsonb) to anon, authenticated;
grant execute on function public.review_edit_suggestion(uuid,text) to authenticated;
create or replace function public.delete_timeline_event(target_id text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_curator() then raise exception 'Curator access required' using errcode = '42501'; end if;
  delete from public.event_parents where parent_id = target_id;
  delete from public.timeline_events where id = target_id;
end;
$$;
grant execute on function public.delete_timeline_event(text) to authenticated;
revoke all on function public.is_curator() from public;
grant execute on function public.is_curator() to anon, authenticated;
