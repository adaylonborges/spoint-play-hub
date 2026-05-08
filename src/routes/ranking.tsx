import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RAFAEL_ID, SPORT_EMOJI } from "@/lib/constants";
import { AppShell } from "@/components/AppShell";
import { Crown } from "lucide-react";

export const Route = createFileRoute("/ranking")({
  head: () => ({ meta: [{ title: "Ranking — Spoint" }] }),
  component: RankingPage,
});

function RankingPage() {
  const [tab, setTab] = useState<"geral" | "esporte">("geral");

  const { data: friends } = useQuery({
    queryKey: ["ranking"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("xp", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = tab === "esporte"
    ? (friends ?? []).filter((p: any) => p.main_sport === "Beach Tennis")
    : (friends ?? []);

  return (
    <AppShell>
      <div className="screen">
        <h1 className="h1 mb-4">Ranking</h1>

        <div className="flex gap-2 bg-muted p-1 rounded-xl mb-5">
          <button onClick={()=>setTab("geral")} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${tab==="geral" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Geral</button>
          <button onClick={()=>setTab("esporte")} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${tab==="esporte" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Beach Tennis</button>
        </div>

        {/* Top 3 podium */}
        <div className="grid grid-cols-3 gap-2 mb-5 items-end">
          {[1,0,2].map((idx, pos) => {
            const p: any = filtered[idx];
            if (!p) return <div key={pos} />;
            const heights = ["h-20", "h-28", "h-16"];
            return (
              <div key={p.id} className="flex flex-col items-center">
                <div className="h-12 w-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold mb-1">{p.name[0]}</div>
                <p className="text-xs font-semibold truncate max-w-full">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">{p.xp} XP</p>
                <div className={`${heights[pos]} w-full mt-2 rounded-t-xl ${pos===1 ? "bg-primary" : "bg-secondary"} flex items-start justify-center pt-2 text-white font-bold`}>
                  {pos===1 ? <Crown className="h-4 w-4" /> : (idx+1)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          {filtered.map((p: any, i: number) => (
            <div key={p.id} className={`card flex items-center gap-3 ${p.id===RAFAEL_ID ? "border-primary bg-accent" : ""}`}>
              <span className="text-lg font-bold w-6 text-center text-muted-foreground">{i+1}</span>
              <div className="h-10 w-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold">{p.name[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{p.name} {p.id===RAFAEL_ID && <span className="text-xs text-primary">(você)</span>}</p>
                <p className="text-xs text-muted-foreground">{SPORT_EMOJI[p.main_sport ?? ""] ?? "🏅"} {p.main_sport}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{p.xp}</p>
                <p className="text-[10px] text-muted-foreground">XP</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
