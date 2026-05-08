import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RAFAEL_ID } from "@/lib/constants";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft, Send } from "lucide-react";

export const Route = createFileRoute("/chat/$eventId")({
  head: () => ({ meta: [{ title: "Chat do evento" }] }),
  component: ChatPage,
});

type Msg = { id: string; user_id: string; content: string; created_at: string; profiles?: { name: string } };

function ChatPage() {
  const { eventId } = Route.useParams();
  const nav = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.from("event_messages").select("*, profiles(name)").eq("event_id", eventId).order("created_at");
      if (mounted) setMsgs((data as any) ?? []);
    })();

    const channel = supabase.channel(`chat-${eventId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "event_messages", filter: `event_id=eq.${eventId}` }, async (payload) => {
        const m = payload.new as any;
        const { data: prof } = await supabase.from("profiles").select("name").eq("id", m.user_id).single();
        setMsgs((prev) => [...prev, { ...m, profiles: prof ?? undefined }]);
      })
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [eventId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText("");
    await supabase.from("event_messages").insert({ event_id: eventId, user_id: RAFAEL_ID, content });
  };

  return (
    <AppShell hideNav>
      <div className="flex flex-col h-screen">
        <header className="flex items-center gap-3 px-5 py-4 border-b border-border bg-background">
          <button onClick={() => nav({ to: "/eventos/$eventId", params: { eventId } })} className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <ChevronLeft className="h-5 w-5" />
          </button>
          {null}
          <div>
            <p className="font-bold">Chat do evento</p>
            <p className="text-xs text-muted-foreground">Em tempo real</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: "oklch(0.97 0 0)" }}>
          {msgs.map(m => {
            const mine = m.user_id === RAFAEL_ID;
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
