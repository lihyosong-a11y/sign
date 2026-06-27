-- Supabase SQL Editor에서 한 번 실행하세요.
-- 이 스키마는 현재 프런트엔드 전용 프로토타입을 서버 저장소로 연결하기 위한 설정입니다.
-- 실제 개인정보 운영 전에는 Supabase Auth, 서버 함수, 더 엄격한 RLS 정책으로 교체해야 합니다.

create table if not exists public.teacher_users (
  id text primary key,
  username text not null unique,
  name text not null,
  organization text,
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.events (
  id text primary key,
  title text not null,
  category text not null,
  event_date timestamptz not null,
  location text,
  manager_name text,
  description text,
  capacity integer,
  is_public_registration_open boolean not null default true,
  registration_deadline timestamptz,
  public_registration_settings jsonb not null default '{}'::jsonb,
  admin_password_hash text,
  owner_user_id text references public.teacher_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.participants (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  name text not null,
  organization text not null,
  position text not null default '',
  phone text not null default '',
  email text,
  attendance_type text not null default '미정',
  registration_source text not null default 'self',
  attendance_status text not null default '예정',
  note text,
  signed boolean not null default false,
  signature_data_url text,
  created_at timestamptz not null default now()
);

create index if not exists events_event_date_idx on public.events(event_date);
create index if not exists events_owner_user_id_idx on public.events(owner_user_id);
create index if not exists participants_event_id_idx on public.participants(event_id);
create index if not exists participants_created_at_idx on public.participants(created_at);
create index if not exists teacher_users_username_idx on public.teacher_users(username);

alter table public.participants
  add column if not exists position text not null default '';

alter table public.teacher_users enable row level security;
alter table public.events enable row level security;
alter table public.participants enable row level security;

-- 프로토타입용 공개 정책입니다.
-- 이 앱은 아직 Supabase Auth가 아닌 임시 프런트엔드 비밀번호 방식을 사용하므로,
-- QR 등록과 관리자 화면이 작동하도록 anon/publishable key에 접근을 열어 둡니다.
-- 실제 운영 전에는 반드시 더 제한적인 정책과 서버 측 인증으로 바꾸세요.

drop policy if exists "prototype_teacher_users_select" on public.teacher_users;
drop policy if exists "prototype_teacher_users_insert" on public.teacher_users;
drop policy if exists "prototype_teacher_users_update" on public.teacher_users;
drop policy if exists "prototype_teacher_users_delete" on public.teacher_users;

create policy "prototype_teacher_users_select"
  on public.teacher_users for select
  to anon, authenticated
  using (true);

create policy "prototype_teacher_users_insert"
  on public.teacher_users for insert
  to anon, authenticated
  with check (true);

create policy "prototype_teacher_users_update"
  on public.teacher_users for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "prototype_teacher_users_delete"
  on public.teacher_users for delete
  to anon, authenticated
  using (true);

drop policy if exists "prototype_events_select" on public.events;
drop policy if exists "prototype_events_insert" on public.events;
drop policy if exists "prototype_events_update" on public.events;
drop policy if exists "prototype_events_delete" on public.events;

create policy "prototype_events_select"
  on public.events for select
  to anon, authenticated
  using (true);

create policy "prototype_events_insert"
  on public.events for insert
  to anon, authenticated
  with check (true);

create policy "prototype_events_update"
  on public.events for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "prototype_events_delete"
  on public.events for delete
  to anon, authenticated
  using (true);

drop policy if exists "prototype_participants_select" on public.participants;
drop policy if exists "prototype_participants_insert" on public.participants;
drop policy if exists "prototype_participants_update" on public.participants;
drop policy if exists "prototype_participants_delete" on public.participants;

create policy "prototype_participants_select"
  on public.participants for select
  to anon, authenticated
  using (true);

create policy "prototype_participants_insert"
  on public.participants for insert
  to anon, authenticated
  with check (true);

create policy "prototype_participants_update"
  on public.participants for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "prototype_participants_delete"
  on public.participants for delete
  to anon, authenticated
  using (true);
