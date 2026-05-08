import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RAFAEL_ID, SPORT_EMOJI } from "@/lib/constants";
import { AppShell } from "@/components/AppShell";
import { Bell, Calendar, ChevronRight, Plus, MapPin } from "lucide-react";
import { SpointLogo } from "@/components/SpointLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spoint — A comunidade dos seus jogos" },
      { name: "description", content: "Organize jogos, vote nas datas e divida o custo com seus amigos." },
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
        .limit(8);
      return data ?? [];
    },
  });

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

        <div className="flex items-center justify-between mb-3">
          <h2 className="h2">Próximos jogos</h2>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="grid gap-3 lg:grid-cols-2 mb-6">
          {events?.map((e: any) => (
            <Link key={e.id} to="/eventos/$eventId" params={{ eventId: e.id }} className="card flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-2xl">
                {SPORT_EMOJI[e.sport] ?? "🏅"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{e.title}</p>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {e.location} {e.confirmed_date ? "· " + new Date(e.confirmed_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "· Aguardando data"}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          ))}
          {events?.length === 0 && (
            <p className="muted text-center py-6">Nenhum jogo ainda. Crie o primeiro 🎾</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
