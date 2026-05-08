
-- Demo prototype: permissive RLS for anon. Single seeded user "Rafael".

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age int,
  city text,
  main_sport text,
  secondary_sport text,
  sports text[] default '{}',
  level text,
  frequency text,
  time_pref text,
  social_profile text,
  spoints int not null default 0,
  xp int not null default 0,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  goal int not null default 1,
  reward_text text not null,
  reward_type text not null, -- 'discount' | 'spoints'
  sport text,
  active bool not null default true,
  created_at timestamptz not null default now()
);

create table public.user_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  progress int not null default 0,
  completed bool not null default false,
  unique(user_id, challenge_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  sport text not null,
  location text,
  total_cost numeric not null default 0,
  confirmed_date timestamptz,
  status text not null default 'open', -- open | confirmed | done
  challenge_id uuid references public.challenges(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.event_dates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  proposed_date timestamptz not null
);

create table public.event_date_votes (
  id uuid primary key default gen_random_uuid(),
  event_date_id uuid not null references public.event_dates(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  unique(event_date_id, user_id)
);

create table public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rsvp_status text not null default 'invited', -- invited | confirmed | declined
  paid bool not null default false,
  unique(event_id, user_id)
);

create table public.event_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  unique(user_id, friend_id)
);

-- Enable RLS with permissive demo policies (prototype only)
alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.user_challenges enable row level security;
alter table public.events enable row level security;
alter table public.event_dates enable row level security;
alter table public.event_date_votes enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_messages enable row level security;
alter table public.friendships enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array['profiles','challenges','user_challenges','events','event_dates','event_date_votes','event_participants','event_messages','friendships'])
  loop
    execute format('create policy "demo_all_select" on public.%I for select using (true);', t);
    execute format('create policy "demo_all_insert" on public.%I for insert with check (true);', t);
    execute format('create policy "demo_all_update" on public.%I for update using (true);', t);
    execute format('create policy "demo_all_delete" on public.%I for delete using (true);', t);
  end loop;
end $$;

-- Realtime
alter publication supabase_realtime add table public.event_messages;
alter publication supabase_realtime add table public.event_participants;
alter publication supabase_realtime add table public.event_date_votes;
