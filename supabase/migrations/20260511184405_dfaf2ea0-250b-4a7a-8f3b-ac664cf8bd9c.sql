create policy "Owner updates participants in own event"
on public.event_participants
for update
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_participants.event_id
      and e.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = event_participants.event_id
      and e.owner_id = auth.uid()
  )
);