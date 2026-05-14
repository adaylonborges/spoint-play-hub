import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase/client";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc, deleteDoc, addDoc, orderBy, limit } from "firebase/firestore";
import { SPORT_EMOJI } from "@/lib/constants";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft, MapPin, Check, MessageCircle, Share2, CalendarPlus, ExternalLink, Camera, Sparkles } from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import { EventMap } from "@/components/EventMap";
import { InviteSheet } from "@/components/InviteSheet";
import { generateIcs, downloadIcs } from "@/lib/ics";
import { buildGoogleCalendarUrl, isMobileUA } from "@/lib/calendar";
import { getSportImage } from "@/lib/sportImages";
import { uploadEventPhoto, publicPhotoUrl, awardShare } from "@/lib/spoints";
import { toast } from "sonner";
import centauroAd from "@/assets/ads/centauro-joga35.jpg";

export const Route = createFileRoute("/eventos/$eventId")({
  codeSplitGroupings: [],
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
    queryFn: async () => {
      const docSnap = await getDoc(doc(db, "events", eventId));
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as any : null;
    },
  });
  const { data: parts } = useQuery({
    enabled: !!user,
    queryKey: ["parts", eventId],
    queryFn: async () => {
      const q = query(collection(db, "event_participants"), where("event_id", "==", eventId));
      const snaps = await getDocs(q);
      const results = [];
      for (const d of snaps.docs) {
        const p = d.data();
        let profileName = "Convidado";
        if (p.user_id) {
          const profSnap = await getDoc(doc(db, "profiles", p.user_id));
          if (profSnap.exists()) profileName = profSnap.data().name || "Convidado";
        }
        results.push({ id: d.id, ...p, profiles: { name: profileName } });
      }
      return results;
    },
  });
  const { data: dates } = useQuery({
    enabled: !!user,
    queryKey: ["dates", eventId],
    queryFn: async () => {
      const q = query(collection(db, "event_dates"), where("event_id", "==", eventId));
      const snaps = await getDocs(q);
      const results = [];
      for (const d of snaps.docs) {
        const dt = d.data();
        const vq = query(collection(db, "event_date_votes"), where("event_date_id", "==", d.id));
        const vsnaps = await getDocs(vq);
        const votes = vsnaps.docs.map(v => ({ id: v.id, ...v.data() }));
        results.push({ id: d.id, ...dt, event_date_votes: votes });
      }
      return results;
    },
  });
  const { data: messages } = useQuery({
    enabled: !!user,
    queryKey: ["msgs-preview", eventId],
    queryFn: async () => {
      const q = query(collection(db, "event_messages"), where("event_id", "==", eventId), orderBy("created_at", "desc"), limit(2));
      const snaps = await getDocs(q);
      const results = [];
      for (const d of snaps.docs) {
        const m = d.data();
        let profileName = "Usuário";
        if (m.user_id) {
          const profSnap = await getDoc(doc(db, "profiles", m.user_id));
          if (profSnap.exists()) profileName = profSnap.data().name || "Usuário";
        }
        results.push({ id: d.id, ...m, profiles: { name: profileName } });
      }
      return results;
    },
  });
  const { data: photos } = useQuery({
    enabled: !!user,
    queryKey: ["photos", eventId],
    queryFn: async () => {
      const q = query(collection(db, "event_photos"), where("event_id", "==", eventId), orderBy("created_at", "desc"));
      const snaps = await getDocs(q);
      const results = [];
      for (const d of snaps.docs) {
        const p = d.data();
        let profileName = "Atleta";
        if (p.user_id) {
          const profSnap = await getDoc(doc(db, "profiles", p.user_id));
          if (profSnap.exists()) profileName = profSnap.data().name || "Atleta";
        }
        results.push({ id: d.id, ...p, profiles: { name: profileName } });
      }
      return results;
    },
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [sharing, setSharing] = useState(false);

  const earliestDate = useMemo(() => {
    const list = (dates ?? []).map((d: any) => new Date(d.proposed_date).getTime()).filter((n: number) => !isNaN(n));
    return list.length ? new Date(Math.min(...list)) : null;
  }, [dates]);
  const votingDeadline = earliestDate ? new Date(earliestDate.getTime() - 48 * 3600 * 1000) : null;
  const dateConfirmed = !!event?.confirmed_date;
  const hasDates = (dates ?? []).length > 0;
  const votingOpen = !dateConfirmed && !!votingDeadline && Date.now() < votingDeadline.getTime() && hasDates;
  const votingClosed = !dateConfirmed && !!votingDeadline && Date.now() >= votingDeadline.getTime() && hasDates;
  const isOwner = !!event && !!user && event.owner_id === user.id;

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
    updateDoc(doc(db, "events", eventId), { confirmed_date: winner.date }).then(() => {
      qc.invalidateQueries({ queryKey: ["event", eventId] });
    });
  }, [votingClosed, isOwner, dates, eventId, qc]);

  if (loading || !user) return <AppShell><div className="screen">Carregando...</div></AppShell>;
  if (!event) return <AppShell><div className="screen">Carregando evento...</div></AppShell>;

  const me = parts?.find((p: any) => p.user_id === user.id);
  const confirmed = (parts ?? []).filter((p: any) => p.rsvp_status === "confirmed");
  const perPerson = event && confirmed.length ? (Number(event.total_cost) / confirmed.length).toFixed(2) : "0.00";

  const setRsvp = async (status: string) => {
    if (me) {
      await updateDoc(doc(db, "event_participants", me.id), { rsvp_status: status });
    } else {
      const partId = `${eventId}_${user.id}`;
      await setDoc(doc(db, "event_participants", partId), { event_id: eventId, user_id: user.id, rsvp_status: status });
    }
    qc.invalidateQueries({ queryKey: ["parts", eventId] });
  };

  const togglePaid = async (id: string, paid: boolean, userId: string) => {
    if (userId !== user.id && !isOwner) return;
    await updateDoc(doc(db, "event_participants", id), { paid: !paid });
    qc.invalidateQueries({ queryKey: ["parts", eventId] });
  };

  const vote = async (dateId: string) => {
    const userVotesQ = query(collection(db, "event_date_votes"), where("user_id", "==", user.id));
    const userVotesSnaps = await getDocs(userVotesQ);
    const dateIds = (dates ?? []).map((d: any) => d.id);
    const toDelete = userVotesSnaps.docs.filter(d => dateIds.includes(d.data().event_date_id));
    for (const v of toDelete) {
      await deleteDoc(doc(db, "event_date_votes", v.id));
    }
    await addDoc(collection(db, "event_date_votes"), { event_date_id: dateId, user_id: user.id });
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

  const eventHappened = !!event.confirmed_date && new Date(event.confirmed_date).getTime() < Date.now();
  const myPhoto = (photos ?? []).find((p: any) => p.user_id === user.id);
  const isConfirmedParticipant = me?.rsvp_status === "confirmed" || isOwner;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      await uploadEventPhoto(file, eventId, user.id);
      toast.success("Foto enviada! +150 Spoints 🎉");
      qc.invalidateQueries({ queryKey: ["photos", eventId] });
      qc.invalidateQueries({ queryKey: ["profile-spoints", user.id] });
      qc.invalidateQueries({ queryKey: ["profile-full", user.id] });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar foto");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/eventos/${event.id}`;
    const text = `Joguei ${event.sport} no Spoint! 🏆 ${url}`;
    setSharing(true);
    try {
      if (navigator.share) {
        try { await navigator.share({ title: event.title, text, url }); } catch { /* user canceled */ }
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      }
      try {
        await awardShare(eventId, user.id);
        toast.success("+20 Spoints por compartilhar! 🔗");
        qc.invalidateQueries({ queryKey: ["profile-spoints", user.id] });
        qc.invalidateQueries({ queryKey: ["profile-full", user.id] });
      } catch { /* already awarded */ }
    } finally {
      setSharing(false);
    }
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

          {/* Photo of the day + Share (post-game) */}
          {eventHappened && (
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <p className="label mb-0 flex items-center gap-1"><Camera className="h-4 w-4" />Foto do jogo</p>
                <span className="chip-yellow text-[10px]">+150 Spoints</span>
              </div>

              {(photos ?? []).length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-3">
                  {photos!.map((p: any) => (
                    <div key={p.id} className="relative flex-shrink-0">
                      <img src={publicPhotoUrl(p.storage_path)} alt={p.profiles?.name ?? "Foto"} className="h-24 w-24 object-cover rounded-xl" />
                      <span className="absolute bottom-1 left-1 right-1 text-[10px] font-semibold text-white bg-black/55 rounded px-1 truncate">{p.profiles?.name ?? "—"}</span>
                    </div>
                  ))}
                </div>
              )}

              {isConfirmedParticipant && !myPhoto && (
                <label className={`btn-primary w-full cursor-pointer ${uploadingPhoto ? "opacity-60" : ""}`}>
                  <Camera className="h-4 w-4" />
                  {uploadingPhoto ? "Enviando..." : "Enviar foto do jogo"}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                </label>
              )}
              {myPhoto && (
                <p className="text-xs text-success font-semibold flex items-center gap-1"><Sparkles className="h-3 w-3" /> Você ganhou +150 Spoints pela foto</p>
              )}
              {!isConfirmedParticipant && !myPhoto && (
                <p className="text-xs text-muted-foreground">Apenas confirmados podem enviar foto.</p>
              )}

              <button onClick={handleShare} disabled={sharing} className="btn-ghost w-full mt-3 disabled:opacity-60">
                <Share2 className="h-4 w-4" />
                Compartilhar o jogo (+20)
              </button>
            </div>
          )}

          {/* Sponsored banner */}
          <a
            href="https://www.centauro.com.br"
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="block rounded-2xl overflow-hidden shadow-sm relative"
            aria-label="Centauro — Cupom JOGA35"
          >
            <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide bg-black/55 text-white px-2 py-0.5 rounded-full z-10">Publi</span>
            <img src={centauroAd} alt="Centauro: 35% OFF com o cupom JOGA35" className="w-full h-auto block" />
          </a>
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
