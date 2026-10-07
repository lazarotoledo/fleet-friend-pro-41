import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AccessContext, type FleetRole } from "@/components/Access";
import type { Session } from "@supabase/supabase-js";
import { Car, LogOut, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AppShell({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [role, setRole] = useState<FleetRole | null | undefined>(undefined);
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    let revision = 0;
    const load = async () => {
      const current = ++revision;
      const { data: identity } = await supabase.auth.getUser();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active || current !== revision) return;
      setSession(identity.user ? sessionData.session : null);
      if (!identity.user) { setRole(null); return; }
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", identity.user.id);
      if (!active || current !== revision) return;
      setRole(error ? null : data?.some((r) => r.role === "admin") ? "admin" : data?.some((r) => r.role === "consultor") ? "consultor" : null);
    };
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { revision++; setSession(null); setRole(null); }
      else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        setRole(undefined);
        setTimeout(() => { void load(); }, 0);
      }
    });
    void load();
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  if (session === undefined || (session && role === undefined))
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando…</div>;
  if (!session) return <Login />;

  const sair = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  if (!role) return <main className="flex min-h-screen flex-col items-center justify-center gap-4"><p>Acesso não autorizado. Solicite um convite ao administrador.</p><Button onClick={sair}>Sair</Button></main>;

  return (
    <AccessContext.Provider value={role}><div className="min-h-screen">
      <header className="bg-hero text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <Car className="h-5 w-5" /> Frota
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            <Link to="/" className="rounded-md px-3 py-1.5 opacity-80 hover:opacity-100" activeProps={{ className: "bg-primary-foreground/15 opacity-100" }} activeOptions={{ exact: true }}>
              Veículos
            </Link>
            <Link to="/equipes" className="flex items-center gap-1 rounded-md px-3 py-1.5 opacity-80 hover:opacity-100" activeProps={{ className: "bg-primary-foreground/15 opacity-100" }}>
              <Users className="h-4 w-4" /> Equipes
            </Link>
            <Link to="/risco" className="rounded-md px-3 py-1.5 opacity-80 hover:opacity-100" activeProps={{ className: "bg-primary-foreground/15 opacity-100" }}>
              Km & Risco
            </Link>
            {role === "admin" && <Link to="/usuarios" className="rounded-md px-3 py-1.5 opacity-80 hover:opacity-100">Usuários</Link>}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden opacity-75 sm:inline">{session.user.email}</span>
            <span className="hidden text-xs sm:inline">{role === "admin" ? "Administrador" : "Consultor"}</span>
            <Button variant="ghost" onClick={sair} className="flex items-center gap-1">
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div></AccessContext.Provider>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) toast.error("E-mail ou senha inválidos");
    } catch { toast.error("Não foi possível entrar."); }
    setLoading(false);
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Não foi possível entrar com Google");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="bg-hero hidden flex-col justify-between p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 font-display text-xl font-semibold"><Car /> Frota</div>
        <div>
          <h1 className="text-4xl font-semibold leading-tight">Sua frota inteira,<br />sob controle.</h1>
          <p className="mt-4 max-w-sm opacity-80">Equipes, contratos, quilometragem, manutenções e sinistros em um só lugar.</p>
        </div>
        <span className="text-sm opacity-60">Gestão de veículos corporativos</span>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h2 className="text-2xl font-semibold">Entrar</h2>
          <div className="space-y-2"><Label>E-mail</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-2"><Label>Senha</Label><Input type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
          <Button className="w-full" disabled={loading}>Entrar</Button>
          <Button type="button" variant="outline" className="w-full" onClick={google}>Continuar com Google</Button>
          <Button type="button" variant="link" disabled={loading || !email.trim()} onClick={async () => {
            setLoading(true);
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password?flow=recovery` });
            setLoading(false);
            if (error) toast.error(error.message); else toast.success("Confira seu e-mail para redefinir a senha.");
          }}>Esqueci minha senha</Button>
        </form>
      </div>
    </div>
  );
}
