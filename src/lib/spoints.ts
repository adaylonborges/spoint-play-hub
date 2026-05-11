import { supabase } from "@/integrations/supabase/client";

export const SPOINTS_RULES = [
  { kind: "create_event", icon: "🎯", label: "Criar um jogo", amount: 50 },
  { kind: "invite", icon: "👥", label: "Convidar amigos que confirmam", amount: 10, hint: "até 100 / jogo" },
  { kind: "play", icon: "🏐", label: "Realizar o jogo", amount: 100 },
  { kind: "photo", icon: "📸", label: "Postar a foto do dia", amount: 50 },
  { kind: "share", icon: "🔗", label: "Compartilhar o jogo", amount: 20 },
] as const;

export const KIND_LABEL: Record<string, string> = {
  create_event: "Criou um jogo",
  invite: "Convidou um amigo",
  play: "Jogou",
  photo: "Postou foto",
  share: "Compartilhou",
};

export const KIND_ICON: Record<string, string> = {
  create_event: "🎯",
  invite: "👥",
  play: "🏐",
  photo: "📸",
  share: "🔗",
};

export async function uploadEventPhoto(file: File, eventId: string, userId: string) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${eventId}/${userId}/photo.${ext}`;
  const { error: upErr } = await supabase.storage.from("event-photos").upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) throw upErr;
  const { error: dbErr } = await supabase.from("event_photos").insert({ event_id: eventId, user_id: userId, storage_path: path });
  if (dbErr) throw dbErr;
  return path;
}

export function publicPhotoUrl(path: string) {
  return supabase.storage.from("event-photos").getPublicUrl(path).data.publicUrl;
}

export async function awardShare(eventId: string) {
  const { data, error } = await supabase.rpc("award_share", { _event_id: eventId });
  if (error) throw error;
  return data as number;
}
