import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { nanoid } from "nanoid";
import { db } from "@/lib/firebase/client";
import { collection, addDoc } from "firebase/firestore";
import { SPORTS, SPORT_EMOJI } from "@/lib/constants";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft, DollarSign } from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import { AddressSearch, type Place } from "@/components/AddressSearch";
import { toast } from "sonner";

export const Route = createFileRoute("/criar")({
  head: () => ({ meta: [{ title: "Criar evento — Spoint" }] }),
  component: Criar,
});

function Criar() {
  const { user, loading } = useRequireAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [sport, setSport] = useState("Beach Tennis");
  const [title, setTitle] = useState("");
  const [dates, setDates] = useState<string[]>(["", "", ""]);
  const [place, setPlace] = useState<Place | null>(null);
  const [cost, setCost] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!user) return;
    setSaving(true); setError("");
    try {
      const inviteCode = nanoid(8);
      const evRef = await addDoc(collection(db, "events"), {
        owner_id: user.uid,
        sport,
        title: title || `${sport} entre amigos`,
        location: place?.name ?? "",
        address: place?.address ?? null,
        latitude: place?.lat ?? null,
        longitude: place?.lng ?? null,
        total_cost: Number(cost) || 0,
        invite_code: inviteCode,
        created_at: new Date().toISOString(),
      });
      const evId = evRef.id;

      const validDates = dates.filter(Boolean);
      for (const d of validDates) {
        await addDoc(collection(db, "event_dates"), {
          event_id: evId,
          proposed_date: new Date(d).toISOString()
        });
      }

      // Owner is auto-confirmed participant
      await addDoc(collection(db, "event_participants"), {
        event_id: evId,
        user_id: user.uid,
        rsvp_status: "confirmed",
        joined_at: new Date().toISOString()
      });

      toast.success("Evento criado! +50 Spoints 🎯");

      nav({ to: "/eventos/$eventId", params: { eventId: evId } });
    } catch (e: any) {
      setError(e.message ?? "Erro ao criar evento");
    } finally { setSaving(false); }
  };

  if (loading || !user) return <AppShell hideNav><div className="screen">Carregando...</div></AppShell>;

  return (
    <AppShell hideNav>
      <div className="screen">
        <header className="flex items-center gap-3 mb-6">
          <button onClick={() => step === 0 ? nav({ to: "/" }) : setStep(step - 1)} className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 flex gap-1.5">
            {[0,1,2].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />)}
          </div>
        </header>

        {step === 0 && (
          <>
            <h1 className="h1 mb-1">Qual o esporte?</h1>
            <p className="muted mb-5">Escolha e dê um nome ao seu evento</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {SPORTS.slice(0,9).map(s => (
                <button key={s} onClick={()=>setSport(s)} className={`rounded-xl p-3 text-xs font-medium border ${sport===s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
                  <div className="text-2xl mb-1">{SPORT_EMOJI[s]}</div>{s}
                </button>
              ))}
            </div>
            <label className="label">Nome do evento</label>
            <input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="BT no fim de tarde" />
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="h1 mb-1">Sugira até 3 datas</h1>
            <p className="muted mb-5">A galera vota na melhor</p>
            <div className="space-y-3">
              {dates.map((d, i) => (
                <div key={i}>
                  <label className="label">Opção {i+1}</label>
                  <input type="datetime-local" className="input w-full min-w-0 block appearance-none" value={d} onChange={e => setDates(dates.map((x, j) => j===i ? e.target.value : x))} />
                </div>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="h1 mb-1">Local e custo</h1>
            <p className="muted mb-5">Busque pelo nome do local ou endereço</p>
            <label className="label">Local</label>
            <div className="mb-4"><AddressSearch value={place} onSelect={setPlace} /></div>
            {place && (
              <p className="text-xs text-muted-foreground mb-4 truncate">📍 {place.address}</p>
            )}
            <label className="label"><DollarSign className="inline h-4 w-4 mr-1" />Custo total (R$)</label>
            <input type="number" className="input" value={cost} onChange={e=>setCost(e.target.value)} placeholder="240 (opcional)" />
            {error && <p className="text-sm text-destructive mt-3">{error}</p>}
          </>
        )}

        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-5 bg-background border-t border-border">
          <button
            disabled={saving || (step === 2 && !place)}
            onClick={() => step === 2 ? submit() : setStep(step + 1)}
            className="btn-primary w-full disabled:opacity-40"
          >
            {step === 2 ? (saving ? "Criando..." : "Criar evento") : "Continuar"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

