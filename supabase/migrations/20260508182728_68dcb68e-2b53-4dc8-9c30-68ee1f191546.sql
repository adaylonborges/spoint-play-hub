
DROP TABLE IF EXISTS public.user_challenges CASCADE;
DROP TABLE IF EXISTS public.challenges CASCADE;
DROP TABLE IF EXISTS public.friendships CASCADE;

DROP POLICY IF EXISTS demo_all_select ON public.profiles;
DROP POLICY IF EXISTS demo_all_insert ON public.profiles;
DROP POLICY IF EXISTS demo_all_update ON public.profiles;
DROP POLICY IF EXISTS demo_all_delete ON public.profiles;

DELETE FROM public.event_messages;
DELETE FROM public.event_date_votes;
DELETE FROM public.event_dates;
DELETE FROM public.event_participants;
DELETE FROM public.events;
DELETE FROM public.profiles;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "Profiles viewable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS invite_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.events DROP COLUMN IF EXISTS challenge_id;

DROP POLICY IF EXISTS demo_all_select ON public.events;
DROP POLICY IF EXISTS demo_all_insert ON public.events;
DROP POLICY IF EXISTS demo_all_update ON public.events;
DROP POLICY IF EXISTS demo_all_delete ON public.events;

CREATE OR REPLACE FUNCTION public.is_event_participant(_event_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_participants
    WHERE event_id = _event_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.events WHERE id = _event_id AND owner_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_event_by_invite(_code text)
RETURNS TABLE(id uuid, title text, sport text, location text, address text, confirmed_date timestamptz, owner_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.title, e.sport, e.location, e.address, e.confirmed_date, p.name
  FROM public.events e
  LEFT JOIN public.profiles p ON p.id = e.owner_id
  WHERE e.invite_code = _code
  LIMIT 1;
$$;

CREATE POLICY "Events visible to members"
  ON public.events FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_event_participant(id, auth.uid()));
CREATE POLICY "Authenticated create own events"
  ON public.events FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner updates events"
  ON public.events FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owner deletes events"
  ON public.events FOR DELETE TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS demo_all_select ON public.event_participants;
DROP POLICY IF EXISTS demo_all_insert ON public.event_participants;
DROP POLICY IF EXISTS demo_all_update ON public.event_participants;
DROP POLICY IF EXISTS demo_all_delete ON public.event_participants;

CREATE POLICY "Participants visible to members"
  ON public.event_participants FOR SELECT TO authenticated
  USING (public.is_event_participant(event_id, auth.uid()));
CREATE POLICY "Self join event"
  ON public.event_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Self update own row"
  ON public.event_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Self or owner delete"
  ON public.event_participants FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.owner_id = auth.uid()));

DROP POLICY IF EXISTS demo_all_select ON public.event_dates;
DROP POLICY IF EXISTS demo_all_insert ON public.event_dates;
DROP POLICY IF EXISTS demo_all_update ON public.event_dates;
DROP POLICY IF EXISTS demo_all_delete ON public.event_dates;

CREATE POLICY "Dates visible to members"
  ON public.event_dates FOR SELECT TO authenticated
  USING (public.is_event_participant(event_id, auth.uid()));
CREATE POLICY "Owner inserts dates"
  ON public.event_dates FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.owner_id = auth.uid()));
CREATE POLICY "Owner deletes dates"
  ON public.event_dates FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.owner_id = auth.uid()));

DROP POLICY IF EXISTS demo_all_select ON public.event_date_votes;
DROP POLICY IF EXISTS demo_all_insert ON public.event_date_votes;
DROP POLICY IF EXISTS demo_all_update ON public.event_date_votes;
DROP POLICY IF EXISTS demo_all_delete ON public.event_date_votes;

CREATE POLICY "Votes visible to members"
  ON public.event_date_votes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.event_dates d WHERE d.id = event_date_id AND public.is_event_participant(d.event_id, auth.uid())));
CREATE POLICY "Self votes"
  ON public.event_date_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Self deletes vote"
  ON public.event_date_votes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS demo_all_select ON public.event_messages;
DROP POLICY IF EXISTS demo_all_insert ON public.event_messages;
DROP POLICY IF EXISTS demo_all_update ON public.event_messages;
DROP POLICY IF EXISTS demo_all_delete ON public.event_messages;

CREATE POLICY "Messages visible to members"
  ON public.event_messages FOR SELECT TO authenticated
  USING (public.is_event_participant(event_id, auth.uid()));
CREATE POLICY "Members send messages"
  ON public.event_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_event_participant(event_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
