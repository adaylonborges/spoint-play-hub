import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RAFAEL_ID } from "@/lib/constants";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft, Coins, Gift, Sparkles } from "lucide-react";

export const Route = createFileRoute("/desafios")({
  head: () => ({ meta: [{ title: "Desafios — Spoint" }] }),
  component: DesafiosPage,
});

function DesafiosPage() {
  const { data: profile } = useQuery({
    queryKey: ["profile", RAFAEL_ID],
    queryFn: async () => (await supabase.from("profiles").select("spoints").eq("id", RAFAEL_ID).single()).data,
  });

  const { data: mine } = useQuery({
    queryKey: ["my-challenges"],
    queryFn: async () => (await supabase.from("user_challenges").select("*, challenges(*)").eq("user_id", RAFAEL_ID)).data ?? [],
  });

  const { data: all } = useQuery({
    queryKey: ["all-challenges"],
    queryFn: async () => (await supabase.from("challenges").select("*").eq("active", true)).data ?? [],
  });

  const myIds = new Set((mine ?? []).map((m: any) => m.challenge_id));
  const available = (all ?? []).filter((c: any) => !myIds.has(c.id));

  return (
    <AppShell>
      <div className="screen">
        <header className="flex items-center gap-3 mb-4">
          <Link to="/" className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"><ChevronLeft className="h-5 w-5" /></Link>
          <h1 className="h1">Desafios</h1>
        </header>

        <div className="card mb-6 flex items-center justify-between bg-secondary text-secondary-foreground border-secondary">
          <div>
            <p className="text-xs opacity-70">Saldo Spoints</p>
            <p className="text-3xl font-bold">{profile?.spoints ?? 0}</p>
          </div>
          <Coins className="h-10 w-10 text-primary" />
        </div>

        <h2 className="h2 mb-3">Em andamento</h2>
        <div className="space-y-3 mb-6">
          {mine?.map((uc: any) => {
            const c = uc.challenges;
            const pct = Math.round((uc.progress / c.goal) * 100);
            return (
              <div key={uc.id} className="card">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-bold">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                  </div>
                  <span className="chip-green whitespace-nowrap"><Gift className="h-3 w-3" />{c.reward_text}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{uc.progress}/{c.goal}</p>
              </div>
            );
          })}
        </div>

        <h2 className="h2 mb-3">Disponíveis</h2>
        <div className="space-y-3">
          {available.map((c: any) => (
            <div key={c.id} className="card flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{c.title}</p>
                <p className="text-xs text-muted-foreground truncate">{c.reward_text}</p>
              </div>
              <button className="text-xs font-semibold text-primary">Aceitar</button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
