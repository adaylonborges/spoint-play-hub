import { Link, useLocation } from "@tanstack/react-router";
import { Home, Plus, User } from "lucide-react";

type NavItem = { to: string; label: string; icon: typeof Home; exact?: boolean; primary?: boolean };
const items: NavItem[] = [
  { to: "/", label: "Início", icon: Home, exact: true },
  { to: "/criar", label: "", icon: Plus, primary: true },
  { to: "/perfil", label: "Perfil", icon: User },
];

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-background border-t border-border z-40">
      <ul className="grid grid-cols-3 items-end px-2 pt-2 pb-3">
        {items.map((it) => {
          const Icon = it.icon;
          const active = it.exact ? loc.pathname === it.to : loc.pathname.startsWith(it.to);
          if (it.primary) {
            return (
              <li key={it.to} className="flex justify-center -mt-7">
                <Link to={it.to} className="h-16 w-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-[0_8px_24px_oklch(0.92_0.19_102/0.5)] active:scale-95 transition">
                  <Icon className="h-7 w-7" strokeWidth={3} />
                </Link>
              </li>
            );
          }
          return (
            <li key={it.to} className="flex justify-center">
              <Link to={it.to} className={`flex flex-col items-center gap-1 px-2 py-1 ${active ? "text-foreground" : "text-muted-foreground"}`}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                <span className="text-[11px] font-semibold">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
