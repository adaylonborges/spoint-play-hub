import { BottomNav } from "./BottomNav";
import { Sparkles, Users, CalendarCheck, Wallet } from "lucide-react";
import spointLogoWhite from "@/assets/spoint-logo-white.png";

export function AppShell({ children, hideNav }: { children: React.ReactNode; hideNav?: boolean }) {
  return (
    <div className="desktop-frame">
      {/* Desktop-only side panel with brand context */}
      <aside className="hidden lg:flex flex-col justify-between p-12 text-white" style={{ background: "var(--gradient-hero)" }}>
        <div>
          <div className="mb-2">
            <img src={spointLogoWhite} alt="Spoint" className="h-10 w-auto" />
          </div>
          <p className="text-sm opacity-70 max-w-sm mt-8">
            A comunidade que organiza seus jogos. Convide amigos, escolha a melhor data e divida o custo sem complicação.
          </p>
        </div>
        <ul className="space-y-4 text-sm">
          <li className="flex items-start gap-3"><Users className="h-5 w-5 text-primary mt-0.5" /><span>Reúna a galera em um único lugar</span></li>
          <li className="flex items-start gap-3"><CalendarCheck className="h-5 w-5 text-primary mt-0.5" /><span>Vote nas melhores datas e locais</span></li>
          <li className="flex items-start gap-3"><Wallet className="h-5 w-5 text-primary mt-0.5" /><span>Racha automático conforme confirmações</span></li>
          <li className="flex items-start gap-3"><Sparkles className="h-5 w-5 text-primary mt-0.5" /><span>Tudo num app simples e direto</span></li>
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
