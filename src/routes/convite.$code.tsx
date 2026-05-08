import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { SPORT_EMOJI } from "@/lib/constants";
import { MapPin, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SpointLogo } from "@/components/SpointLogo";

export const Route = createFileRoute("/convite/$code")({
  head: () => ({ meta: [{ title: "Convite — Spoint" }] }),
  component: InvitePage,
});

type Preview = { id: string; title: string; sport: string; location: string | null; address: string | null; confirmed_date: string | null; owner_name: string | null };

function InvitePage() {
  const { code } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [event, setEvent] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_event_by_invite", { _code: code });
      if (error) setError("Convite inválido");
      const row = (data as Preview[] | null)?.[0];
      setEvent(row ?? null);
      setLoading(false);
    })();
  }, [code]);

  const join = async () => {
    if (!user || !event) return;
    setJoining(true);
    const { error } = await supabase.from("event_participants").upsert(
      { event_id: event.id, user_id: user.id, rsvp_status: "confirmed" },
      { onConflict: "event_id,user_id" } as any,
    );
    setJoining(false);
    if (error) {
      // fall back: try insert (older schemas without unique constraint)
      await supabase.from("event_participants").insert({ event_id: event.id, user_id: user.id, rsvp_status: "confirmed" });
    }
    nav({ to: "/eventos/$eventId", params: { eventId: event.id } });
  };

  if (loading || authLoading) return <AppShell hideNav><div className="screen">Carregando...</div></AppShell>;

  if (!event) {
    return (
      <AppShell hideNav>
        <div className="screen text-center">
          <SpointLogo className="h-10 w-auto mx-auto mb-6" />
          <h1 className="h1 mb-2">Convite inválido</h1>
          <p className="muted">{error || "Esse link não existe ou expirou."}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell hideNav>
      <div className="screen">
        <SpointLogo className="h-8 w-auto mb-6" />
        <p className="text-xs font-bold opacity-60 mb-1">VOCÊ FOI CONVIDADO</p>
        <h1 className="h1 mb-2">{event.title}</h1>
        <p className="muted mb-5">por {event.owner_name ?? "alguém"}</p>

        <div className="card-dark space-y-2">
          <span className="chip-yellow">{SPORT_EMOJI[event.sport]} {event.sport}</span>
          {event.location && (
            <p className="text-sm flex items-start gap-1.5 mt-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" /><span>{event.address ?? event.location}</span></p>
          )}
          {event.confirmed_date && (
            <p className="text-sm opacity-90">{new Date(event.confirmed_date).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</p>
          )}
          {!event.confirmed_date && <p className="text-sm opacity-70">Data ainda em votação</p>}
        </div>

        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-5 bg-background border-t border-border">
          {user ? (
            <button onClick={join} disabled={joining} className="btn-primary w-full disabled:opacity-50">
              {joining ? "Entrando..." : "Entrar no evento"}
            </button>
          ) : (
            <button
              onClick={() => nav({ to: "/login", search: { redirect: encodeURIComponent(`/convite/${code}`) } as never })}
              className="btn-primary w-full"
            >
              <LogIn className="h-4 w-4" /> Entrar para confirmar
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
