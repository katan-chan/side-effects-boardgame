create table if not exists public.rooms (
  id text primary key,
  code text unique not null,
  host_player_id text not null,
  status text not null check (status in ('lobby', 'playing', 'finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rooms_code_idx on public.rooms (code);

create table if not exists public.room_snapshots (
  room_id text primary key references public.rooms(id) on delete cascade,
  schema_version integer not null,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
