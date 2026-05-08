import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SPORT_EMOJI } from "@/lib/constants";
import { AppShell } from "@/components/AppShell";
import { Bell, Calendar, ChevronRight, Plus, MapPin, Check, X, Mail } from "lucide-react";
import { SpointLogo } from "@/components/SpointLogo";
import { useRequireAuth } from "@/hooks/useAuth";
import { getSportImage } from "@/lib/sportImages";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spoint — A comunidade dos seus jogos" },
      { name: "description", content: "Organize jogos, vote nas datas e divida o custo com seus amigos." },
    ],
  }),
  component: HomePage,
});

type EvRow = {
  id: string; title: string; sport: string; location: string | null;
  confirmed_date: string | null; owner_id: string;
};
type PartRow = { event_id: string; rsvp_status: string; events: EvRow };

function HomePage() {
  const { user, loading } = useRequireAuth();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).single()).data,
  });

  const { data: rows } = useQuery({
    enabled: !!user,
    queryKey: ["my-events-list", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_participants")
        .select("event_id, rsvp_status, events(id, title, sport, location, confirmed_date, owner_id)")
        .eq("user_id", user!.id);
      return (data ?? []).filter((r: any) => r.events) as unknown as PartRow[];
    },
  });

  const respond = async (eventId: string, status: "confirmed" | "declined") => {
    if (!user) return;
    await supabase
      .from("event_participants")
      .update({ rsvp_status: status })
      .eq("user_id", user.id)
      .eq("event_id", eventId);
    qc.invalidateQueries({ queryKey: ["my-events-list", user.id] });
  };

  if (loading || !user) return <AppShell><div className="screen">Carregando...</div></AppShell>;

  const now = new Date();
  const all = rows ?? [];
  const isPast = (e: EvRow) => e.confirmed_date && new Date(e.confirmed_date) < now;

  // Convites pendentes: rsvp = invited e (sem data ou data futura) e não sou owner
  const pending = all.filter(
    (r) => r.rsvp_status === "invited" && r.events.owner_id !== user.id && !isPast(r.events),
  );
  // Próximos: confirmed/maybe ou owner, e não passou
  const upcoming = all.filter(
    (r) =>
      !isPast(r.events) &&
      (r.rsvp_status === "confirmed" || r.rsvp_status === "maybe" || r.events.owner_id === user.id) &&
      !pending.find((p) => p.event_id === r.event_id),
  );
  // Histórico: já passou
  const past = all.filter((r) => isPast(r.events));

  return (
    <AppShell>
      <div className="screen">
        <header className="flex items-center justify-between mb-6 lg:hidden">
          <SpointLogo className="h-8 w-auto" />
          <button className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Bell className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-5 lg:grid-cols-2 lg:gap-6 mb-6">
          <div className="card-dark">
            <p className="text-xs opacity-70">Olá,</p>
            <h1 className="text-2xl lg:text-3xl font-bold">{profile?.name ?? "atleta"} 👋</h1>
            <p className="text-sm opacity-70 mt-1">Pronto pra organizar o próximo jogo?</p>
          </div>

          <Link to="/criar" className="card-yellow flex items-center justify-between active:scale-[0.99] transition">
            <div>
              <p className="text-xs font-bold opacity-80">CRIE UM EVENTO</p>
              <p className="text-lg font-bold leading-tight">Bora marcar um jogo<br/>com a galera?</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center">
              <Plus className="h-6 w-6" strokeWidth={3} />
            </div>
          </Link>
        </div>

        {/* Convites pendentes */}
        {pending.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="h2 flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> Convites pendentes
              </h2>
              <span className="text-xs font-bold text-primary">{pending.length}</span>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {pending.map((r) => (
                <PendingCard key={r.event_id} ev={r.events} onAccept={() => respond(r.event_id, "confirmed")} onDecline={() => respond(r.event_id, "declined")} />
              ))}
            </div>
          </section>
        )}

        {/* Próximos jogos */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="h2">Próximos jogos</h2>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="grid gap-3 lg:grid-cols-2 mb-6">
          {upcoming.map((r) => <EventCard key={r.event_id} ev={r.events} />)}
          {upcoming.length === 0 && (
            <Link to="/criar" className="card text-center py-8 lg:col-span-2">
              <p className="text-3xl mb-2">🎾</p>
              <p className="font-semibold">Nenhum jogo marcado</p>
              <p className="text-xs text-muted-foreground mt-1">Crie o primeiro e convide a galera</p>
            </Link>
          )}
        </div>

        {past.length > 0 && (
          <>
            <h2 className="h2 mb-3">Histórico</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {past.slice(0, 6).map((r) => <EventCard key={r.event_id} ev={r.events} />)}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function EventCard({ ev }: { ev: EvRow }) {
  return (
    <Link to="/eventos/$eventId" params={{ eventId: ev.id }} className="card flex items-center gap-3">
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-2xl">
        {SPORT_EMOJI[ev.sport] ?? "🏅"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{ev.title}</p>
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {ev.location} {ev.confirmed_date ? "· " + new Date(ev.confirmed_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "· Aguardando data"}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </Link>
  );
}

function PendingCard({ ev, onAccept, onDecline }: { ev: EvRow; onAccept: () => void; onDecline: () => void }) {
  return (
    <div className="card-dark overflow-hidden p-0">
      <Link to="/eventos/$eventId" params={{ eventId: ev.id }} className="block relative h-24">
        <img src={getSportImage(ev.sport)} alt={ev.sport} loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3 text-white">
          <p className="text-[10px] font-bold opacity-80">{SPORT_EMOJI[ev.sport]} {ev.sport.toUpperCase()}</p>
          <p className="font-bold text-base leading-tight truncate">{ev.title}</p>
          {ev.location && <p className="text-[11px] opacity-80 truncate">{ev.location}</p>}
        </div>
      </Link>
      <div className="grid grid-cols-2 gap-2 p-3">
        <button onClick={onDecline} className="rounded-xl py-2 text-sm font-semibold bg-muted text-foreground flex items-center justify-center gap-1">
          <X className="h-4 w-4" /> Recusar
        </button>
        <button onClick={onAccept} className="rounded-xl py-2 text-sm font-semibold bg-primary text-primary-foreground flex items-center justify-center gap-1">
          <Check className="h-4 w-4" /> Vou
        </button>
      </div>
    </div>
  );
}
