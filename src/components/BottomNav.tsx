import { Link, useLocation } from "@tanstack/react-router";
import { Home, Trophy, Plus, BarChart3, User } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/desafios", label: "Desafios", icon: Trophy },
  { to: "/criar", label: "", icon: Plus, primary: true },
  { to: "/ranking", label: "Ranking", icon: BarChart3 },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-background border-t border-border z-40">
      <ul className="grid grid-cols-5 items-end px-2 pt-2 pb-3">
        {items.map((it) => {
          const Icon = it.icon;
          const active = it.exact ? loc.pathname === it.to : loc.pathname.startsWith(it.to);
          if (it.primary) {
            return (
              <li key={it.to} className="flex justify-center -mt-6">
                <Link to={it.to} className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg active:scale-95 transition">
                  <Icon className="h-6 w-6" strokeWidth={2.5} />
                </Link>
              </li>
            );
          }
          return (
            <li key={it.to} className="flex justify-center">
              <Link to={it.to} className={`flex flex-col items-center gap-1 px-2 py-1 ${active ? "text-primary" : "text-muted-foreground"}`}>
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
