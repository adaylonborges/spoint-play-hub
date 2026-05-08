import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RAFAEL_ID, SPORT_EMOJI } from "@/lib/constants";
import { AppShell } from "@/components/AppShell";
import { Bell, Calendar, Coins, Flame, Trophy, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Comunidade Spoint — Jogue com seus amigos" },
      { name: "description", content: "Organize jogos, divida custos e ganhe recompensas Centauro com a Comunidade Spoint." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: profile } = useQuery({
    queryKey: ["profile", RAFAEL_ID],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", RAFAEL_ID).single();
      return data;
    },
  });

  const { data: events } = useQuery({
    queryKey: ["home-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*, event_participants(count)")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: featured } = useQuery({
    queryKey: ["featured-challenge"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_challenges")
        .select("progress, challenges(*)")
        .eq("user_id", RAFAEL_ID)
        .order("progress", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const ch = featured?.challenges as any;
  const pct = ch ? Math.round(((featured?.progress ?? 0) / ch.goal) * 100) : 0;

  return (
    <AppShell>
      <div className="screen">
        <header className="flex items-center justify-between mb-6">
          <div>
            <p className="muted">Bom dia,</p>
            <h1 className="h1">{profile?.name ?? "..."} 👋</h1>
          </div>
          <button className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Bell className="h-5 w-5" />
          </button>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card text-center">
            <Coins className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">{profile?.spoints ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Spoints</p>
          </div>
          <div className="card text-center">
            <Flame className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">{profile?.xp ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">XP</p>
          </div>
          <div className="card text-center">
            <Trophy className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">3</p>
            <p className="text-[10px] text-muted-foreground">Conquistas</p>
          </div>
        </div>

        {/* Featured challenge */}
        {ch && (
          <Link to="/desafios" className="block mb-6">
            <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="chip-green">🔥 Desafio em destaque</span>
              </div>
              <h3 className="text-xl font-bold">{ch.title}</h3>
              <p className="text-sm opacity-80 mt-1 mb-4">{ch.description}</p>
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between items-center mt-2 text-xs">
                <span>{featured?.progress}/{ch.goal} concluídos</span>
                <span className="font-semibold">🎁 {ch.reward_text}</span>
              </div>
            </div>
          </Link>
        )}

        {/* Próximos jogos */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="h2">Próximos jogos</h2>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-3 mb-6">
          {events?.map((e: any) => (
            <Link key={e.id} to="/eventos/$eventId" params={{ eventId: e.id }} className="card flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-2xl">
                {SPORT_EMOJI[e.sport] ?? "🏅"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{e.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {e.location} {e.confirmed_date ? "· " + new Date(e.confirmed_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "· Aguardando data"}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          ))}
          {events?.length === 0 && (
            <p className="muted text-center py-6">Nenhum jogo. Que tal criar um? 🎾</p>
          )}
        </div>

        <Link to="/criar" className="btn-primary w-full">+ Criar novo evento</Link>
      </div>
    </AppShell>
  );
}
