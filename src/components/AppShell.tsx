import { BottomNav } from "./BottomNav";
import { Sparkles, Trophy, Users, Gift } from "lucide-react";

export function AppShell({ children, hideNav }: { children: React.ReactNode; hideNav?: boolean }) {
  return (
    <div className="desktop-frame">
      {/* Desktop-only side panel with brand context */}
      <aside className="hidden lg:flex flex-col justify-between p-12 text-white" style={{ background: "var(--gradient-hero)" }}>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-lg">S</div>
            <span className="text-xl font-bold tracking-tight">Comunidade Spoint</span>
          </div>
          <p className="text-sm opacity-70 max-w-sm mt-6">
            Organize jogos com seus amigos, divida custos sem stress e ganhe recompensas Centauro a cada partida.
          </p>
        </div>
        <ul className="space-y-4 text-sm">
          <li className="flex items-start gap-3"><Users className="h-5 w-5 text-primary mt-0.5" /><span>Convide amigos e vote nas melhores datas</span></li>
          <li className="flex items-start gap-3"><Sparkles className="h-5 w-5 text-primary mt-0.5" /><span>Racha automático conforme confirmações</span></li>
          <li className="flex items-start gap-3"><Trophy className="h-5 w-5 text-primary mt-0.5" /><span>Ranking, XP e desafios entre a galera</span></li>
          <li className="flex items-start gap-3"><Gift className="h-5 w-5 text-primary mt-0.5" /><span>Spoints viram desconto na Centauro</span></li>
        </ul>
        <p className="text-xs opacity-50">© 2026 Spoint · powered by Centauro</p>
      </aside>

      <main className="desktop-stage">
        <div className="app-shell">
          {children}
          {!hideNav && <BottomNav />}
        </div>
      </main>
    </div>
  );
}
