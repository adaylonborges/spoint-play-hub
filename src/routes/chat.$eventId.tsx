import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase/client";
import { collection, query, where, orderBy, onSnapshot, addDoc, getDoc, doc, serverTimestamp } from "firebase/firestore";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft, Send } from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/chat/$eventId")({
  head: () => ({ meta: [{ title: "Chat do evento" }] }),
  component: ChatPage,
});

type Msg = { id: string; user_id: string; content: string; created_at: string; profiles?: { name: string } };

function ChatPage() {
  const { eventId } = Route.useParams();
  const { user, loading } = useRequireAuth();
  const nav = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const qStream = query(collection(db, "event_messages"), where("event_id", "==", eventId), orderBy("created_at"));
    const unsubscribe = onSnapshot(qStream, async (snapshot) => {
      const newMsgs = [];
      for (const d of snapshot.docs) {
        const m = d.data();
        let profileName = "Usuário";
        if (m.user_id) {
          const profSnap = await getDoc(doc(db, "profiles", m.user_id));
          if (profSnap.exists()) profileName = profSnap.data().name || "Usuário";
        }
        newMsgs.push({ id: d.id, ...m, profiles: { name: profileName } });
      }
      if (mounted) setMsgs(newMsgs as any);
    });

    return () => { mounted = false; unsubscribe(); };
  }, [eventId, user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!text.trim() || !user) return;
    const content = text.trim();
    setText("");
    await addDoc(collection(db, "event_messages"), {
      event_id: eventId,
      user_id: user.id,
      content,
      created_at: serverTimestamp()
    });
  };

  if (loading || !user) return <AppShell hideNav><div className="screen">Carregando...</div></AppShell>;

  return (
    <AppShell hideNav>
      <div className="flex flex-col h-screen">
        <header className="flex items-center gap-3 px-5 py-4 border-b border-border bg-background">
          <button onClick={() => nav({ to: "/eventos/$eventId", params: { eventId } })} className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="font-bold">Chat do evento</p>
            <p className="text-xs text-muted-foreground">Em tempo real</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: "oklch(0.97 0 0)" }}>
          {msgs.map(m => {
            const mine = m.user_id === user.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border rounded-bl-sm"}`}>
                  {!mine && <p className="text-[10px] font-bold text-muted-foreground mb-0.5">{m.profiles?.name}</p>}
                  <p className="text-sm">{m.content}</p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="p-3 border-t border-border bg-background flex gap-2">
          <input className="input flex-1" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e => e.key==="Enter" && send()} placeholder="Mensagem..." />
          <button onClick={send} className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"><Send className="h-5 w-5" /></button>
        </div>
      </div>
    </AppShell>
  );
}
