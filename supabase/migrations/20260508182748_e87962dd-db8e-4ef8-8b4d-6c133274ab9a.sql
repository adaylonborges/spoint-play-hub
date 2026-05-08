
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_event_participant(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_event_by_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_by_invite(text) TO anon, authenticated;
