import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RAFAEL_ID, SPORT_EMOJI } from "@/lib/constants";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft, Settings, LogOut } from "lucide-react";

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

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <AppShell>
      <div className="screen">
        <header className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Link to="/" className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"><ChevronLeft className="h-5 w-5" /></Link>
            <h1 className="h1">Perfil</h1>
          </div>
          <Link to="/onboarding" className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"><Settings className="h-5 w-5" /></Link>
        </header>

        <div className="card-dark mb-5 text-center">
          <div className="h-20 w-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold mx-auto mb-3">
            {profile?.name?.[0]}
          </div>
          <h2 className="text-xl font-bold">{profile?.name}{profile?.age ? `, ${profile.age}` : ""}</h2>
          <p className="text-sm opacity-70">{profile?.city}</p>
          <div className="flex justify-center gap-2 mt-3 flex-wrap">
            {profile?.main_sport && <span className="chip-yellow">{SPORT_EMOJI[profile.main_sport]} {profile.main_sport}</span>}
            {profile?.level && <span className="chip">{profile.level}</span>}
          </div>
        </div>

        <h2 className="h2 mb-3">Meus eventos</h2>
        <div className="space-y-2 mb-6">
          {events?.map((e: any) => (
            <Link key={e.id} to="/eventos/$eventId" params={{ eventId: e.id }} className="card flex items-center gap-3">
              <div className="text-2xl">{SPORT_EMOJI[e.sport]}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-sm">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.status === "confirmed" ? "Confirmado" : e.status === "open" ? "Em organização" : "Realizado"}</p>
              </div>
            </Link>
          ))}
          {events?.length === 0 && <p className="muted text-center py-4">Nenhum evento criado ainda.</p>}
        </div>

        <button onClick={logout} className="btn-ghost w-full text-destructive">
          <LogOut className="h-4 w-4" /> Sair da conta
        </button>
      </div>
    </AppShell>
  );
}

