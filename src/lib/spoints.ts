import { db, storage } from "@/lib/firebase/client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, doc, updateDoc, increment } from "firebase/firestore";

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
  const path = `event-photos/${eventId}/${userId}/photo.${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);
  
  const now = new Date().toISOString();

  await addDoc(collection(db, "event_photos"), {
    event_id: eventId,
    user_id: userId,
    storage_path: path,
    url: downloadUrl,
    created_at: now
  });

  // Award Spoints for photo
  await updateDoc(doc(db, "profiles", userId), {
    spoints: increment(50)
  });
  await addDoc(collection(db, "spoint_transactions"), {
    user_id: userId,
    event_id: eventId,
    kind: "photo",
    amount: 50,
    created_at: now
  });

  return path;
}

export function publicPhotoUrl(path: string) {
  return path; 
}

export async function awardShare(eventId: string, userId: string) {
  const now = new Date().toISOString();
  await updateDoc(doc(db, "profiles", userId), {
    spoints: increment(20)
  });
  await addDoc(collection(db, "spoint_transactions"), {
    user_id: userId,
    event_id: eventId,
    kind: "share",
    amount: 20,
    created_at: now
  });
  return 20;
}
