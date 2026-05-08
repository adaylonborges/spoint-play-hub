import { BottomNav } from "./BottomNav";
import { SpointLogo, SPOINT_APP_URL } from "./SpointLogo";
import { Link, useLocation } from "@tanstack/react-router";
import { Home, PlusCircle, User, Download } from "lucide-react";

const navLinks = [
  { to: "/", label: "Início", icon: Home, exact: true },
  { to: "/criar", label: "Criar evento", icon: PlusCircle },
  { to: "/perfil", label: "Perfil", icon: User },
];

function DesktopHeader() {
  const loc = useLocation();
  return (
    <header className="hidden lg:flex sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl flex items-center justify-between px-8 py-4">
        <SpointLogo className="h-9 w-auto" />
        <nav className="flex items-center gap-1">
          {navLinks.map((it) => {
            const Icon = it.icon;
            const active = it.exact ? loc.pathname === it.to : loc.pathname.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? "bg-secondary text-secondary-foreground" : "text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
          <a
            href={SPOINT_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-3 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground font-bold px-4 py-2 text-sm shadow-[var(--shadow-yellow)] hover:opacity-90"
          >
            <Download className="h-4 w-4" /> Baixar app
          </a>
        </nav>
      </div>
    </header>
  );
}

export function AppShell({ children, hideNav }: { children: React.ReactNode; hideNav?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col bg-[oklch(0.97_0_0)]">
      <DesktopHeader />
      <main className="flex-1 w-full">
        <div className="app-shell">
          {children}
          {!hideNav && <BottomNav />}
        </div>
      </main>
    </div>
  );
}
