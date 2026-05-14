import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { collection, query, where, limit, getDocs, getDoc, doc, addDoc } from "firebase/firestore";
import { AppShell } from "@/components/AppShell";
import { SPORT_EMOJI } from "@/lib/constants";
import { MapPin, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SpointLogo } from "@/components/SpointLogo";
import { normalizeRedirectPath } from "@/lib/authRedirect";

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
      try {
        const q = query(collection(db, "events"), where("invite_code", "==", code), limit(1));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          setError("Convite inválido");
          setEvent(null);
          setLoading(false);
          return;
        }

        const evData = snap.docs[0].data();
        const evId = snap.docs[0].id;

        let owner_name = null;
        if (evData.owner_id) {
          const pSnap = await getDoc(doc(db, "profiles", evData.owner_id));
          if (pSnap.exists()) owner_name = pSnap.data().name;
        }

        setEvent({
          id: evId,
          title: evData.title || "",
          sport: evData.sport || "",
          location: evData.location || null,
          address: evData.address || null,
          confirmed_date: evData.confirmed_date || null,
          owner_name
        });
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar convite");
      }
      setLoading(false);
    })();
  }, [code]);

  const join = async () => {
    if (!user || !event) return;
    setJoining(true);
    try {
      const pq = query(
        collection(db, "event_participants"),
        where("event_id", "==", event.id),
        where("user_id", "==", user.uid)
      );
      const psnap = await getDocs(pq);
      
      if (psnap.empty) {
        await addDoc(collection(db, "event_participants"), {
          event_id: event.id,
          user_id: user.uid,
          rsvp_status: "invited",
          joined_at: new Date().toISOString()
        });
      }
      nav({ to: "/eventos/$eventId", params: { eventId: event.id } });
    } catch (err) {
      console.error(err);
      setJoining(false);
    }
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
              onClick={() => nav({ to: "/login", search: { redirect: normalizeRedirectPath(`/convite/${code}`, "/") } as never })}
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

