import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AppShell } from "@/components/AppShell";
import { SpointLogo } from "@/components/SpointLogo";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Spoint" }] }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true); setError("");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { name } },
        });
        if (error) throw error;
        nav({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/" });
      }
    } catch (e: any) {
      setError(e.message ?? "Erro ao autenticar");
    } finally { setLoading(false); }
  };

  const google = async () => {
    setLoading(true); setError("");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { setError("Erro com Google"); setLoading(false); return; }
    if (result.redirected) return;
    nav({ to: "/" });
  };

  return (
    <AppShell hideNav>
      <div className="screen min-h-screen flex flex-col">
        <div className="text-center mb-10 mt-6">
          <img src={spointLogo} alt="Spoint" className="h-12 w-auto mx-auto" />
          <p className="muted mt-2">A comunidade dos seus jogos</p>
        </div>

        <div className="card-dark mb-5 text-center">
          <p className="text-xs opacity-70 mb-1">{mode === "signin" ? "Bem-vindo de volta" : "Bora começar"}</p>
          <h2 className="text-xl font-bold">{mode === "signin" ? "Entre na sua conta" : "Crie sua conta"}</h2>
        </div>

        <div className="space-y-3 mb-4">
          {mode === "signup" && (
            <div>
              <label className="label">Nome</label>
              <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome" />
            </div>
          )}
          <div>
            <label className="label">E-mail</label>
            <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com" />
          </div>
          <div>
            <label className="label">Senha</label>
            <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <button disabled={loading} onClick={submit} className="btn-primary w-full disabled:opacity-50">
          {loading ? "..." : mode === "signin" ? "Entrar" : "Criar conta"}
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button disabled={loading} onClick={google} className="btn-ghost w-full">
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continuar com Google
        </button>

        <button onClick={()=>setMode(mode === "signin" ? "signup" : "signin")} className="text-sm text-center mt-6 text-muted-foreground">
          {mode === "signin" ? "Não tem conta? " : "Já tem conta? "}
          <span className="font-bold text-foreground underline">{mode === "signin" ? "Cadastre-se" : "Entrar"}</span>
        </button>

        <Link to="/" className="text-xs text-center mt-3 text-muted-foreground">Continuar sem entrar</Link>
      </div>
    </AppShell>
  );
}
