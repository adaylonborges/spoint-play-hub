
REVOKE EXECUTE ON FUNCTION public.award_spoints(uuid, uuid, text, int, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_event_created_spoints() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_participant_invite_spoints() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_participant_invite_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_photo_award() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_share(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_share(uuid) TO authenticated;
