
CREATE TABLE public.spoint_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid,
  kind text NOT NULL CHECK (kind IN ('create_event','invite','play','photo','share')),
  amount integer NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX spoint_tx_unique_non_invite
  ON public.spoint_transactions (user_id, event_id, kind)
  WHERE kind <> 'invite';

CREATE UNIQUE INDEX spoint_tx_unique_invite
  ON public.spoint_transactions (user_id, event_id, ((meta->>'invitee_id')))
  WHERE kind = 'invite';

CREATE INDEX spoint_tx_user_idx ON public.spoint_transactions(user_id, created_at DESC);

ALTER TABLE public.spoint_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own transactions"
  ON public.spoint_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photos visible to members"
  ON public.event_photos FOR SELECT TO authenticated
  USING (public.is_event_participant(event_id, auth.uid()));

CREATE POLICY "Self insert photo"
  ON public.event_photos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_event_participant(event_id, auth.uid()));

CREATE POLICY "Self delete photo"
  ON public.event_photos FOR DELETE TO authenticated
  USING (user_id = auth.uid());

INSERT INTO storage.buckets (id, name, public) VALUES ('event-photos', 'event-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Event photos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-photos');

CREATE POLICY "Members upload event photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-photos'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Owner deletes own event photo"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-photos'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE OR REPLACE FUNCTION public.award_spoints(
  _user_id uuid, _event_id uuid, _kind text, _amount int, _meta jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE inserted_id uuid;
BEGIN
  INSERT INTO public.spoint_transactions (user_id, event_id, kind, amount, meta)
  VALUES (_user_id, _event_id, _kind, _amount, _meta)
  ON CONFLICT DO NOTHING
  RETURNING id INTO inserted_id;

  IF inserted_id IS NOT NULL THEN
    UPDATE public.profiles SET spoints = COALESCE(spoints,0) + _amount WHERE id = _user_id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_event_created_spoints()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_spoints(NEW.owner_id, NEW.id, 'create_event', 50, '{}'::jsonb);
  RETURN NEW;
END; $$;

CREATE TRIGGER events_award_spoints
AFTER INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.trg_event_created_spoints();

CREATE OR REPLACE FUNCTION public.trg_participant_invite_spoints()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ev_owner uuid; current_total int;
BEGIN
  IF NEW.rsvp_status <> 'confirmed' THEN RETURN NEW; END IF;
  SELECT owner_id INTO ev_owner FROM public.events WHERE id = NEW.event_id;
  IF ev_owner IS NULL OR ev_owner = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(SUM(amount),0) INTO current_total
    FROM public.spoint_transactions
    WHERE user_id = ev_owner AND event_id = NEW.event_id AND kind = 'invite';
  IF current_total >= 100 THEN RETURN NEW; END IF;
  PERFORM public.award_spoints(ev_owner, NEW.event_id, 'invite', 10,
    jsonb_build_object('invitee_id', NEW.user_id::text));
  RETURN NEW;
END; $$;

CREATE TRIGGER participants_award_invite
AFTER INSERT ON public.event_participants
FOR EACH ROW EXECUTE FUNCTION public.trg_participant_invite_spoints();

CREATE OR REPLACE FUNCTION public.trg_participant_invite_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ev_owner uuid; current_total int;
BEGIN
  IF NEW.rsvp_status <> 'confirmed' OR OLD.rsvp_status = 'confirmed' THEN RETURN NEW; END IF;
  SELECT owner_id INTO ev_owner FROM public.events WHERE id = NEW.event_id;
  IF ev_owner IS NULL OR ev_owner = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(SUM(amount),0) INTO current_total
    FROM public.spoint_transactions
    WHERE user_id = ev_owner AND event_id = NEW.event_id AND kind = 'invite';
  IF current_total >= 100 THEN RETURN NEW; END IF;
  PERFORM public.award_spoints(ev_owner, NEW.event_id, 'invite', 10,
    jsonb_build_object('invitee_id', NEW.user_id::text));
  RETURN NEW;
END; $$;

CREATE TRIGGER participants_award_invite_update
AFTER UPDATE ON public.event_participants
FOR EACH ROW EXECUTE FUNCTION public.trg_participant_invite_update();

CREATE OR REPLACE FUNCTION public.trg_photo_award()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_spoints(NEW.user_id, NEW.event_id, 'play', 100, '{}'::jsonb);
  PERFORM public.award_spoints(NEW.user_id, NEW.event_id, 'photo', 50, '{}'::jsonb);
  RETURN NEW;
END; $$;

CREATE TRIGGER event_photos_award
AFTER INSERT ON public.event_photos
FOR EACH ROW EXECUTE FUNCTION public.trg_photo_award();

CREATE OR REPLACE FUNCTION public.award_share(_event_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); is_member boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT public.is_event_participant(_event_id, uid) INTO is_member;
  IF NOT is_member THEN RAISE EXCEPTION 'not a member'; END IF;
  PERFORM public.award_spoints(uid, _event_id, 'share', 20, '{}'::jsonb);
  RETURN 20;
END; $$;

INSERT INTO public.spoint_transactions (user_id, event_id, kind, amount)
SELECT owner_id, id, 'create_event', 50 FROM public.events
ON CONFLICT DO NOTHING;

UPDATE public.profiles p
SET spoints = COALESCE((
  SELECT SUM(amount) FROM public.spoint_transactions WHERE user_id = p.id
), 0);
