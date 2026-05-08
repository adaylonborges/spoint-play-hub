import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RAFAEL_ID, SPORT_EMOJI } from "@/lib/constants";
import { AppShell } from "@/components/AppShell";
import { Coins, Trophy, Settings, Award } from "lucide-react";

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [{ title: "Perfil — Spoint" }] }),
  component: PerfilPage,
});

function PerfilPage() {
  const { data: profile } = useQuery({
    queryKey: ["profile-full", RAFAEL_ID],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", RAFAEL_ID).single()).data,
  });
  const { data: events } = useQuery({
    queryKey: ["my-events"],
    queryFn: async () => (await supabase.from("events").select("*").eq("owner_id", RAFAEL_ID).order("created_at", { ascending: false })).data ?? [],
  });
  const { data: completed } = useQuery({
    queryKey: ["completed-challenges"],
    queryFn: async () => (await supabase.from("user_challenges").select("*, challenges(*)").eq("user_id", RAFAEL_ID)).data ?? [],
  });

  return (
    <AppShell>
      <div className="screen">
        <header className="flex items-center justify-between mb-5">
          <h1 className="h1">Perfil</h1>
          <Link to="/onboarding" className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"><Settings className="h-5 w-5" /></Link>
        </header>

        <div className="card mb-5 text-center">
          <div className="h-20 w-20 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-3xl font-bold mx-auto mb-3">
            {profile?.name?.[0]}
          </div>
          <h2 className="text-xl font-bold">{profile?.name}, {profile?.age}</h2>
          <p className="muted">{profile?.city}</p>
          <div className="flex justify-center gap-2 mt-3">
            <span className="chip">{SPORT_EMOJI[profile?.main_sport ?? ""]} {profile?.main_sport}</span>
            <span className="chip">{profile?.level}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="card text-center">
            <Coins className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{profile?.spoints}</p>
            <p className="text-xs text-muted-foreground">Spoints</p>
          </div>
          <div className="card text-center">
            <Trophy className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{profile?.xp}</p>
            <p className="text-xs text-muted-foreground">XP</p>
          </div>
        </div>

        <h2 className="h2 mb-3">Conquistas</h2>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {(completed ?? []).slice(0,6).map((uc: any) => (
            <div key={uc.id} className="card text-center p-3">
              <Award className="h-8 w-8 mx-auto text-primary mb-1" />
              <p className="text-[10px] font-semibold">{uc.challenges?.title}</p>
            </div>
          ))}
        </div>

        <h2 className="h2 mb-3">Histórico</h2>
        <div className="space-y-2">
          {events?.map((e: any) => (
            <Link key={e.id} to="/eventos/$eventId" params={{ eventId: e.id }} className="card flex items-center gap-3">
              <div className="text-2xl">{SPORT_EMOJI[e.sport]}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-sm">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.status === "confirmed" ? "Confirmado" : e.status === "open" ? "Em organização" : "Realizado"}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
