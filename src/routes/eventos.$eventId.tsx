import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SPORT_EMOJI } from "@/lib/constants";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft, MapPin, Check, MessageCircle, Share2, CalendarPlus, ExternalLink } from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import { EventMap } from "@/components/EventMap";
import { InviteSheet } from "@/components/InviteSheet";
import { generateIcs, downloadIcs } from "@/lib/ics";
import { buildGoogleCalendarUrl, isMobileUA } from "@/lib/calendar";
import { getSportImage } from "@/lib/sportImages";

export const Route = createFileRoute("/eventos/$eventId")({
  head: () => ({ meta: [{ title: "Evento — Spoint" }] }),
  component: EventPage,
});

function VotingCountdown({ deadline }: { deadline: Date }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const ms = deadline.getTime() - now;
  if (ms <= 0) return <span className="font-bold">Encerrada</span>;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const urgent = ms < 6 * 3600 * 1000;
  const txt = d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${sec}s`;
  return <span className={`font-bold tabular-nums ${urgent ? "text-destructive" : ""}`}>{txt}</span>;
}

function EventPage() {
  const { eventId } = Route.useParams();
  const { user, loading } = useRequireAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [showCal, setShowCal] = useState(false);

  const { data: event } = useQuery({
    enabled: !!user,
    queryKey: ["event", eventId],
    queryFn: async () => (await supabase.from("events").select("*").eq("id", eventId).single()).data,
  });
  const { data: parts } = useQuery({
    enabled: !!user,
    queryKey: ["parts", eventId],
    queryFn: async () => (await supabase.from("event_participants").select("*, profiles(name)").eq("event_id", eventId)).data ?? [],
  });
  const { data: dates } = useQuery({
    enabled: !!user,
    queryKey: ["dates", eventId],
    queryFn: async () => (await supabase.from("event_dates").select("*, event_date_votes(user_id)").eq("event_id", eventId)).data ?? [],
  });
  const { data: messages } = useQuery({
    enabled: !!user,
    queryKey: ["msgs-preview", eventId],
    queryFn: async () => (await supabase.from("event_messages").select("*, profiles(name)").eq("event_id", eventId).order("created_at", { ascending: false }).limit(2)).data ?? [],
  });

  if (loading || !user) return <AppShell><div className="screen">Carregando...</div></AppShell>;
  if (!event) return <AppShell><div className="screen">Carregando evento...</div></AppShell>;

  const me = parts?.find((p: any) => p.user_id === user.id);
  const confirmed = (parts ?? []).filter((p: any) => p.rsvp_status === "confirmed");
  const perPerson = event && confirmed.length ? (Number(event.total_cost) / confirmed.length).toFixed(2) : "0.00";
  const isOwner = event.owner_id === user.id;

  const earliestDate = useMemo(() => {
    const list = (dates ?? []).map((d: any) => new Date(d.proposed_date).getTime()).filter((n: number) => !isNaN(n));
    return list.length ? new Date(Math.min(...list)) : null;
  }, [dates]);
  const votingDeadline = earliestDate ? new Date(earliestDate.getTime() - 48 * 3600 * 1000) : null;
  const dateConfirmed = !!event.confirmed_date;
  const votingOpen = !dateConfirmed && !!votingDeadline && Date.now() < votingDeadline.getTime() && (dates ?? []).length > 0;
  const votingClosed = !dateConfirmed && !!votingDeadline && Date.now() >= votingDeadline.getTime() && (dates ?? []).length > 0;

  // Owner auto-confirma data vencedora após o prazo
  useEffect(() => {
    if (!votingClosed || !isOwner || !dates || dates.length === 0) return;
    const ranked = [...dates].map((d: any) => ({
      id: d.id,
      date: d.proposed_date,
      votes: d.event_date_votes?.length ?? 0,
      time: new Date(d.proposed_date).getTime(),
    })).sort((a, b) => b.votes - a.votes || a.time - b.time);
    const winner = ranked[0];
    if (!winner) return;
    supabase.from("events").update({ confirmed_date: winner.date }).eq("id", eventId).then(() => {
      qc.invalidateQueries({ queryKey: ["event", eventId] });
    });
  }, [votingClosed, isOwner, dates, eventId, qc]);

  const setRsvp = async (status: string) => {
    if (me) {
      await supabase.from("event_participants").update({ rsvp_status: status }).eq("id", me.id);
    } else {
      await supabase.from("event_participants").insert({ event_id: eventId, user_id: user.id, rsvp_status: status });
    }
    qc.invalidateQueries({ queryKey: ["parts", eventId] });
  };

  const togglePaid = async (id: string, paid: boolean, userId: string) => {
    if (userId !== user.id && !isOwner) return;
    await supabase.from("event_participants").update({ paid: !paid }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["parts", eventId] });
  };

  const vote = async (dateId: string) => {
    await supabase.from("event_date_votes").delete().eq("user_id", user.id).in("event_date_id", (dates ?? []).map((d: any) => d.id));
    await supabase.from("event_date_votes").insert({ event_date_id: dateId, user_id: user.id });
    qc.invalidateQueries({ queryKey: ["dates", eventId] });
  };

  const calendarPayload = () => {
    const startStr = event.confirmed_date ?? (dates ?? []).find((d: any) => d.proposed_date)?.proposed_date;
    if (!startStr) return null;
    return {
      start: new Date(startStr),
      title: event.title,
      location: event.address ?? event.location ?? "",
      details: `Evento Spoint. Veja detalhes: ${window.location.origin}/eventos/${event.id}`,
      url: `${window.location.origin}/eventos/${event.id}`,
    };
  };

  const openGoogleCalendar = () => {
    const p = calendarPayload();
    if (!p) return;
    const url = buildGoogleCalendarUrl({ title: p.title, start: p.start, location: p.location, details: p.details });
    window.open(url, "_blank", "noopener,noreferrer");
    setShowCal(false);
  };

  const downloadIcsFile = () => {
    const p = calendarPayload();
    if (!p) return;
    const ics = generateIcs({ uid: event.id, title: p.title, start: p.start, location: p.location, description: p.details, url: p.url });
    downloadIcs(`${event.title.replace(/\s+/g, "_")}.ics`, ics);
    setShowCal(false);
  };

  const handleCalendarClick = () => {
    if (!calendarPayload()) return;
    if (isMobileUA()) openGoogleCalendar();
    else setShowCal(true);
  };

  return (
    <AppShell>
      <div className="relative">
        <div className="relative text-white overflow-hidden">
          <img
            src={getSportImage(event.sport)}
            alt={event.sport}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.78) 100%)" }} />
          <div className="relative px-4 sm:px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-8 min-h-[200px] lg:min-h-[280px]">
            <button onClick={() => nav({ to: "/" })} className="h-10 w-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center mb-3">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="chip-yellow mb-3">{SPORT_EMOJI[event.sport]} {event.sport}</span>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 break-words">{event.title}</h1>
            <p className="text-sm opacity-90 flex items-start gap-1 mt-1"><MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" /><span className="line-clamp-2">{event.location}</span></p>
            {event.confirmed_date && (
              <p className="text-sm opacity-90 mt-1">{new Date(event.confirmed_date).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</p>
            )}
          </div>
        </div>

        <div className="relative z-10 px-4 sm:px-5 -mt-4 pb-28 space-y-4">
          {/* Action row / CTA */}
          {dateConfirmed ? (
            <div className="card relative overflow-hidden text-center" style={{ background: "var(--gradient-primary, hsl(var(--primary)))" }}>
              <div className="flex flex-col items-center gap-3 py-2 text-primary-foreground">
                <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <CalendarPlus className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide opacity-90">Data confirmada</p>
                  <p className="font-bold text-lg leading-tight">
                    {new Date(event.confirmed_date!).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })}
                  </p>
                </div>
                <button onClick={handleCalendarClick} className="w-full rounded-2xl bg-white text-primary font-bold py-3 px-4 inline-flex items-center justify-center gap-2 shadow-lg">
                  <CalendarPlus className="h-5 w-5" /> Adicionar à minha agenda
                </button>
                <button onClick={() => setShowInvite(true)} className="text-sm font-semibold opacity-90 inline-flex items-center gap-1">
                  <Share2 className="h-4 w-4" /> Convidar amigos
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setShowInvite(true)} className="btn-primary text-sm px-3 py-3">
                <Share2 className="h-4 w-4" /> Convidar
              </button>
              <button onClick={handleCalendarClick} className="btn-ghost text-sm px-3 py-3" disabled={!calendarPayload()}>
                <CalendarPlus className="h-4 w-4" /> Agenda
              </button>
            </div>
          )}

          {/* Map */}
          {event.latitude && event.longitude && (
            <div className="card p-3">
              <p className="label flex items-center gap-1"><MapPin className="h-4 w-4" />Local</p>
              <p className="text-xs text-muted-foreground mb-2">{event.address}</p>
              <EventMap lat={event.latitude} lng={event.longitude} label={event.location ?? undefined} />
              <a
                href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-foreground mt-2"
              >
                Abrir no Google Maps <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* RSVP */}
          <div className="card">
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
          {(dates ?? []).length > 0 && !dateConfirmed && (
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <p className="label mb-0">Vote na melhor data</p>
                {votingDeadline && (
                  <span className="text-xs">
                    {votingOpen ? <>Encerra em <VotingCountdown deadline={votingDeadline} /></> : <span className="font-bold text-destructive">Votação encerrada</span>}
                  </span>
                )}
              </div>
              {votingClosed && (
                <p className="text-xs text-muted-foreground mb-2">Confirmando data vencedora…</p>
              )}
              <div className="space-y-2">
                {dates!.map((d: any) => {
                  const votes = d.event_date_votes?.length ?? 0;
                  const mine = d.event_date_votes?.some((v: any) => v.user_id === user.id);
                  return (
                    <button key={d.id} onClick={()=>vote(d.id)} disabled={!votingOpen} className={`w-full flex items-center justify-between rounded-xl p-3 border disabled:opacity-60 disabled:cursor-not-allowed ${mine ? "bg-accent border-primary" : "bg-card border-border"}`}>
                      <span className="text-sm font-medium">{new Date(d.proposed_date).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</span>
                      <span className="text-xs font-bold">{votes} voto{votes!==1?"s":""}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Participants */}
          <div className="card">
            <p className="label">Participantes ({parts?.length ?? 0})</p>
            <div className="space-y-2">
              {(parts ?? []).map((p: any) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-sm">
                    {p.profiles?.name?.[0] ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.profiles?.name ?? "Convidado"}</p>
                  </div>
                  <span className={`chip text-[10px] ${p.rsvp_status === "confirmed" ? "bg-success/20 text-foreground" : ""}`}>
                    {p.rsvp_status === "confirmed" ? "Vai" : p.rsvp_status === "declined" ? "Não" : "Talvez"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Racha */}
          {Number(event.total_cost) > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold">Racha</p>
                <span className="text-2xl font-bold text-primary">R$ {perPerson}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">R$ {Number(event.total_cost).toFixed(2)} ÷ {confirmed.length} confirmados</p>
              <div className="space-y-2">
                {confirmed.map((p: any) => (
                  <button key={p.id} onClick={()=>togglePaid(p.id, p.paid, p.user_id)} className="w-full flex items-center gap-3 py-2">
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
              {(!messages || messages.length === 0) && (
                <p className="text-xs text-muted-foreground">Diga oi pra galera 👋</p>
              )}
            </div>
          </Link>
        </div>
      </div>

      {showInvite && event.invite_code && (
        <InviteSheet inviteCode={event.invite_code} eventTitle={event.title} onClose={() => setShowInvite(false)} />
      )}

      {showCal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowCal(false)}>
          <div className="w-full max-w-[430px] bg-card rounded-t-3xl p-6 pb-8" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">Adicionar à agenda</h3>
            <p className="muted mb-4">Escolha onde salvar este evento.</p>
            <div className="space-y-2">
              <button onClick={openGoogleCalendar} className="btn-primary w-full">
                <CalendarPlus className="h-4 w-4" /> Google Calendar
              </button>
              <button onClick={downloadIcsFile} className="btn-ghost w-full">
                <CalendarPlus className="h-4 w-4" /> Apple / Outlook (.ics)
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
