import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RAFAEL_ID, SPORT_EMOJI } from "@/lib/constants";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft, MapPin, Check, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/eventos/$eventId")({
  head: () => ({ meta: [{ title: "Evento — Spoint" }] }),
  component: EventPage,
});

function EventPage() {
  const { eventId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => (await supabase.from("events").select("*").eq("id", eventId).single()).data,
  });
  const { data: parts } = useQuery({
    queryKey: ["parts", eventId],
    queryFn: async () => (await supabase.from("event_participants").select("*, profiles(name)").eq("event_id", eventId)).data ?? [],
  });
  const { data: dates } = useQuery({
    queryKey: ["dates", eventId],
    queryFn: async () => (await supabase.from("event_dates").select("*, event_date_votes(user_id)").eq("event_id", eventId)).data ?? [],
  });
  const { data: messages } = useQuery({
    queryKey: ["msgs-preview", eventId],
    queryFn: async () => (await supabase.from("event_messages").select("*, profiles(name)").eq("event_id", eventId).order("created_at", { ascending: false }).limit(2)).data ?? [],
  });

  const me = parts?.find((p: any) => p.user_id === RAFAEL_ID);
  const confirmed = (parts ?? []).filter((p: any) => p.rsvp_status === "confirmed");
  const perPerson = event && confirmed.length ? (Number(event.total_cost) / confirmed.length).toFixed(2) : "0.00";

  const setRsvp = async (status: string) => {
    if (!me) return;
    await supabase.from("event_participants").update({ rsvp_status: status }).eq("id", me.id);
    qc.invalidateQueries({ queryKey: ["parts", eventId] });
  };

  const togglePaid = async (id: string, paid: boolean) => {
    await supabase.from("event_participants").update({ paid: !paid }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["parts", eventId] });
  };

  const vote = async (dateId: string) => {
    await supabase.from("event_date_votes").delete().eq("user_id", RAFAEL_ID).in("event_date_id", (dates ?? []).map((d: any) => d.id));
    await supabase.from("event_date_votes").insert({ event_date_id: dateId, user_id: RAFAEL_ID });
    qc.invalidateQueries({ queryKey: ["dates", eventId] });
  };

  if (!event) return <AppShell><div className="screen">Carregando...</div></AppShell>;
  

  return (
    <AppShell>
      <div className="relative -mx-0">
        {/* Hero dark */}
        <div className="text-white p-6 pt-8 pb-10" style={{ background: "var(--gradient-hero)" }}>
          <button onClick={() => nav({ to: "/" })} className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center mb-4">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="chip-yellow mb-3">{SPORT_EMOJI[event.sport]} {event.sport}</span>
          <h1 className="text-2xl font-bold mt-2">{event.title}</h1>
          <p className="text-sm opacity-80 flex items-center gap-1 mt-1"><MapPin className="h-4 w-4" />{event.location}</p>
          {event.confirmed_date && (
            <p className="text-sm opacity-90 mt-1">{new Date(event.confirmed_date).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</p>
          )}
        </div>

        <div className="px-5 -mt-6 pb-28">

          {/* RSVP */}
          <div className="card mb-4">
            <p className="label">Você vai?</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: "confirmed", label: "Vou" },
                { v: "invited", label: "Talvez" },
                { v: "declined", label: "Não" },
              ].map(o => (
                <button key={o.v} onClick={()=>setRsvp(o.v)} className={`rounded-xl py-2.5 text-sm font-semibold border ${me?.rsvp_status===o.v ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>{o.label}</button>
              ))}
            </div>
          </div>

          {/* Date voting */}
          {(dates ?? []).length > 0 && !event.confirmed_date && (
            <div className="card mb-4">
              <p className="label">Vote na melhor data</p>
              <div className="space-y-2">
                {dates!.map((d: any) => {
                  const votes = d.event_date_votes?.length ?? 0;
                  const mine = d.event_date_votes?.some((v: any) => v.user_id === RAFAEL_ID);
                  return (
                    <button key={d.id} onClick={()=>vote(d.id)} className={`w-full flex items-center justify-between rounded-xl p-3 border ${mine ? "bg-accent border-primary" : "bg-card border-border"}`}>
                      <span className="text-sm font-medium">{new Date(d.proposed_date).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</span>
                      <span className="text-xs font-bold">{votes} voto{votes!==1?"s":""}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Racha */}
          {Number(event.total_cost) > 0 && (
            <div className="card mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold">Racha</p>
                <span className="text-2xl font-bold text-primary">R$ {perPerson}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">R$ {Number(event.total_cost).toFixed(2)} ÷ {confirmed.length} confirmados</p>
              <div className="space-y-2">
                {confirmed.map((p: any) => (
                  <button key={p.id} onClick={()=>togglePaid(p.id, p.paid)} className="w-full flex items-center gap-3 py-2">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center ${p.paid ? "bg-primary text-primary-foreground" : "border-2 border-border"}`}>
                      {p.paid && <Check className="h-4 w-4" />}
                    </div>
                    <span className="text-sm font-medium flex-1 text-left">{p.profiles?.name}</span>
                    <span className={`text-xs font-semibold ${p.paid ? "text-primary" : "text-muted-foreground"}`}>{p.paid ? "Pago" : "Pendente"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat preview */}
          <Link to="/chat/$eventId" params={{ eventId }} className="card flex items-start gap-3">
            <MessageCircle className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm mb-1">Chat do evento</p>
              {(messages ?? []).slice().reverse().map((m: any) => (
                <p key={m.id} className="text-xs text-muted-foreground truncate"><b className="text-foreground">{m.profiles?.name}:</b> {m.content}</p>
              ))}
            </div>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
