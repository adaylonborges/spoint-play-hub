drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Owner updates events" on public.events;
create policy "Owner updates events"
on public.events
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Self update own row" on public.event_participants;
create policy "Self update own row"
on public.event_participants
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());