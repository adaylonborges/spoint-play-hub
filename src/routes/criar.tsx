import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RAFAEL_ID, SPORTS, SPORT_EMOJI } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft, MapPin, DollarSign } from "lucide-react";

export const Route = createFileRoute("/criar")({
  head: () => ({ meta: [{ title: "Criar evento — Spoint" }] }),
  component: Criar,
});

function Criar() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [sport, setSport] = useState("Beach Tennis");
  const [title, setTitle] = useState("");
  const [dates, setDates] = useState<string[]>(["", "", ""]);
  const [location, setLocation] = useState("");
  const [cost, setCost] = useState("");
  const [friends, setFriends] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: friendsList } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const { data } = await supabase.from("friendships").select("friend_id, profiles:friend_id(id,name,city)").eq("user_id", RAFAEL_ID);
      return data ?? [];
    },
  });

  const { data: linkedChallenge } = useQuery({
    queryKey: ["challenge-for-sport", sport],
    queryFn: async () => {
      const { data } = await supabase.from("challenges").select("*").eq("sport", sport).eq("active", true).maybeSingle();
      return data;
    },
  });

  const perPerson = friends.length > 0 && cost ? (Number(cost) / (friends.length + 1)).toFixed(2) : "0.00";

  const submit = async () => {
    setSaving(true);
    const { data: ev } = await supabase.from("events").insert({
      owner_id: RAFAEL_ID, sport, title: title || `${sport} entre amigos`, location,
      total_cost: Number(cost) || 0,
      challenge_id: linkedChallenge?.id ?? null,
    }).select().single();
    if (ev) {
      const validDates = dates.filter(Boolean);
      let insertedDates: { id: string }[] = [];
      if (validDates.length) {
        const { data: dRows } = await supabase.from("event_dates")
          .insert(validDates.map(d => ({ event_id: ev.id, proposed_date: new Date(d).toISOString() })))
          .select("id");
        insertedDates = dRows ?? [];
      }
      // All friends become participants. Selected = confirmed, others = invited (so we have voting visibility)
      const allFriendIds = (friendsList ?? []).map((f: any) => f.profiles.id);
      const participants = [
        { event_id: ev.id, user_id: RAFAEL_ID, rsvp_status: "confirmed" as const },
        ...allFriendIds.map((id: string) => ({
          event_id: ev.id,
          user_id: id,
          rsvp_status: (friends.includes(id) ? "confirmed" : "invited") as "confirmed" | "invited",
        })),
      ];
      await supabase.from("event_participants").insert(participants);

      // Seed simulated votes so the date-voting UI has signal immediately
      if (insertedDates.length) {
        const voters = [RAFAEL_ID, ...allFriendIds];
        const votes = voters.map((uid, i) => ({
          event_date_id: insertedDates[i % insertedDates.length].id,
          user_id: uid,
        }));
        await supabase.from("event_date_votes").insert(votes);
      }

      nav({ to: "/eventos/$eventId", params: { eventId: ev.id } });
    }
    setSaving(false);
  };

  return (
    <AppShell hideNav>
      <div className="screen">
        <header className="flex items-center gap-3 mb-6">
          <button onClick={() => step === 0 ? nav({ to: "/" }) : setStep(step - 1)} className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 flex gap-1.5">
            {[0,1,2,3].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />)}
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
            {linkedChallenge && (
              <div className="mt-4 rounded-2xl border border-primary/40 bg-accent p-4 flex gap-3">
                <Gift className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Conta para o desafio: {linkedChallenge.title}</p>
                  <p className="text-xs text-muted-foreground">Recompensa: {linkedChallenge.reward_text}</p>
                </div>
              </div>
            )}
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
                  <input type="datetime-local" className="input" value={d} onChange={e => setDates(dates.map((x, j) => j===i ? e.target.value : x))} />
                </div>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="h1 mb-1">Local e custo</h1>
            <p className="muted mb-5">A divisão é automática</p>
            <label className="label"><MapPin className="inline h-4 w-4 mr-1" />Local</label>
            <input className="input mb-4" value={location} onChange={e=>setLocation(e.target.value)} placeholder="Arena Sand — Itupeva" />
            <label className="label"><DollarSign className="inline h-4 w-4 mr-1" />Custo total (R$)</label>
            <input type="number" className="input" value={cost} onChange={e=>setCost(e.target.value)} placeholder="240" />
            <div className="card mt-5 bg-secondary text-secondary-foreground border-secondary">
              <p className="text-xs opacity-70">Por pessoa ({friends.length + 1} confirmados)</p>
              <p className="text-3xl font-bold">R$ {perPerson}</p>
              <p className="text-xs opacity-70 mt-1">Recalcula automaticamente conforme confirmam</p>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="h1 mb-1">Convide os amigos</h1>
            <p className="muted mb-5">Selecione quem vai jogar</p>
            <div className="space-y-2">
              {friendsList?.map((f: any) => {
                const p = f.profiles;
                const on = friends.includes(p.id);
                return (
                  <button key={p.id} onClick={() => setFriends(on ? friends.filter(x => x !== p.id) : [...friends, p.id])}
                    className={`w-full flex items-center gap-3 rounded-xl p-3 border ${on ? "bg-accent border-primary" : "bg-card border-border"}`}>
                    <div className="h-10 w-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold">{p.name[0]}</div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.city}</p>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 ${on ? "bg-primary border-primary" : "border-border"}`} />
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-5 bg-background border-t border-border">
          <button disabled={saving} onClick={() => step === 3 ? submit() : setStep(step + 1)} className="btn-primary w-full disabled:opacity-40">
            {step === 3 ? (saving ? "Criando..." : "Criar evento") : "Continuar"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
