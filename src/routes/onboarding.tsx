import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RAFAEL_ID, SPORTS, LEVELS, FREQUENCIES, TIME_PREFS, SOCIAL_PROFILES, SPORT_EMOJI } from "@/lib/constants";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft, Check } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Bem-vindo à Comunidade Spoint" }] }),
  component: Onboarding,
});

function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [main, setMain] = useState("");
  const [level, setLevel] = useState("");
  const [freq, setFreq] = useState("");
  const [time, setTime] = useState("");
  const [social, setSocial] = useState("");

  const toggleSport = (s: string) =>
    setSports((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const next = async () => {
    if (step < 3) return setStep(step + 1);
    await supabase.from("profiles").update({
      name, age: Number(age) || null, city,
      sports, main_sport: main, level, frequency: freq, time_pref: time, social_profile: social,
    }).eq("id", RAFAEL_ID);
    nav({ to: "/" });
  };

  const canNext = [
    name && age && city,
    sports.length > 0,
    main,
    level && freq && time && social,
  ][step];

  return (
    <AppShell hideNav>
      <div className="screen">
        <header className="flex items-center gap-3 mb-6">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex-1 flex gap-1.5">
            {[0,1,2,3].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </header>

        {step === 0 && (
          <div>
            <h1 className="h1 mb-1">Vamos te conhecer</h1>
            <p className="muted mb-6">Conta um pouco sobre você</p>
            <div className="space-y-4">
              <div><label className="label">Nome</label><input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome" /></div>
              <div><label className="label">Idade</label><input className="input" type="number" value={age} onChange={e=>setAge(e.target.value)} placeholder="38" /></div>
              <div><label className="label">Cidade</label><input className="input" value={city} onChange={e=>setCity(e.target.value)} placeholder="Itupeva, SP" /></div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="h1 mb-1">Quais esportes você curte?</h1>
            <p className="muted mb-6">Escolha quantos quiser</p>
            <div className="grid grid-cols-3 gap-2">
              {SPORTS.map((s) => {
                const on = sports.includes(s);
                return (
                  <button key={s} onClick={()=>toggleSport(s)} className={`rounded-xl p-3 text-xs font-medium border transition ${on ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
                    <div className="text-2xl mb-1">{SPORT_EMOJI[s]}</div>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="h1 mb-1">Seu esporte principal?</h1>
            <p className="muted mb-6">Vamos personalizar seus desafios</p>
            <div className="space-y-2">
              {sports.map((s) => (
                <button key={s} onClick={()=>setMain(s)} className={`w-full flex items-center gap-3 rounded-xl p-4 border transition ${main===s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
                  <span className="text-2xl">{SPORT_EMOJI[s]}</span>
                  <span className="font-semibold flex-1 text-left">{s}</span>
                  {main===s && <Check className="h-5 w-5" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h1 className="h1 mb-1">Seu perfil esportivo</h1>
              <p className="muted">Pra te conectar com a galera certa</p>
            </div>
            <PickGroup label="Nível" options={LEVELS} value={level} onChange={setLevel} />
            <PickGroup label="Frequência" options={FREQUENCIES} value={freq} onChange={setFreq} />
            <PickGroup label="Horário preferido" options={TIME_PREFS} value={time} onChange={setTime} />
            <PickGroup label="Perfil social" options={SOCIAL_PROFILES} value={social} onChange={setSocial} />
          </div>
        )}

        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-5 bg-background border-t border-border">
          <button disabled={!canNext} onClick={next} className="btn-primary w-full disabled:opacity-40">
            {step === 3 ? "Começar a jogar" : "Continuar"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function PickGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o} onClick={()=>onChange(o)} className={`rounded-full px-4 py-2 text-sm font-medium border ${value===o ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>{o}</button>
        ))}
      </div>
    </div>
  );
}
