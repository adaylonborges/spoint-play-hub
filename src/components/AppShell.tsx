import { BottomNav } from "./BottomNav";

export function AppShell({ children, hideNav }: { children: React.ReactNode; hideNav?: boolean }) {
  return (
    <div className="app-shell">
      {children}
      {!hideNav && <BottomNav />}
    </div>
  );
}
