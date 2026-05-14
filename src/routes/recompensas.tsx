import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ChevronLeft, Gift, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { useRequireAuth } from "@/hooks/useAuth";
import { SPOINTS_RULES } from "@/lib/spoints";

export const Route = createFileRoute("/recompensas")({
  head: () => ({ meta: [{ title: "Recompensas — Spoint" }] }),
  component: RecompensasPage,
});

function RecompensasPage() {
  const { user, loading } = useRequireAuth();
  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["profile-spoints", user?.uid],
    queryFn: async () => {
      const snap = await getDoc(doc(db, "profiles", user!.uid));
      return snap.exists() ? { spoints: snap.data().spoints } : null;
    },
  });

  if (loading || !user) return <AppShell><div className="screen">Carregando...</div></AppShell>;

  return (
    <AppShell>
      <div className="screen">
        <header className="flex items-center gap-3 mb-5">
          <Link to="/perfil" className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"><ChevronLeft className="h-5 w-5" /></Link>
          <h1 className="h1">Recompensas</h1>
        </header>

        <div className="card-dark mb-5 text-center">
          <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-90" />
          <p className="text-xs uppercase tracking-wide opacity-80">Seu saldo</p>
          <p className="text-4xl font-bold mt-1">{profile?.spoints ?? 0}</p>
          <p className="text-sm opacity-80 mt-1">Spoints</p>
        </div>

        <div className="card text-center py-8 mb-5">
          <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3">
            <Gift className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-bold text-lg mb-1">Loja em breve 🎁</h2>
          <p className="muted text-sm max-w-xs mx-auto">
            Continue acumulando Spoints. Em breve você troca por descontos e brindes dos nossos parceiros.
          </p>
        </div>

        <h2 className="h2 mb-3">Como ganhar Spoints</h2>
        <div className="space-y-2">
          {SPOINTS_RULES.map((r) => (
            <div key={r.kind} className="card flex items-center gap-3">
              <div className="text-2xl">{r.icon}</div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{r.label}</p>
                {"hint" in r && r.hint && <p className="text-xs text-muted-foreground">{r.hint}</p>}
              </div>
              <span className="chip-yellow font-bold">+{r.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

