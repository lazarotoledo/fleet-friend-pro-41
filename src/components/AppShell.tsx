import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
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
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined)
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando…</div>;
  if (!session) return <Login />;

  const sair = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen">
      <header className="bg-hero text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <Car className="h-5 w-5" /> Frota
          </Link>
          <nav className="flex gap-1 text-sm">
            <Link to="/" className="rounded-md px-3 py-1.5 opacity-80 hover:opacity-100" activeProps={{ className: "bg-primary-foreground/15 opacity-100" }} activeOptions={{ exact: true }}>
              Veículos
            </Link>
            <Link to="/equipes" className="flex items-center gap-1 rounded-md px-3 py-1.5 opacity-80 hover:opacity-100" activeProps={{ className: "bg-primary-foreground/15 opacity-100" }}>
              <Users className="h-4 w-4" /> Equipes
            </Link>
            <Link to="/risco" className="rounded-md px-3 py-1.5 opacity-80 hover:opacity-100" activeProps={{ className: "bg-primary-foreground/15 opacity-100" }}>
              Km & Risco
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden opacity-75 sm:inline">{session.user.email}</span>
            <button onClick={sair} className="flex items-center gap-1 opacity-80 hover:opacity-100">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

function Login() {
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) toast.error("E-mail ou senha inválidos");
    } else {
      const { error } = await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin } });
      if (error) toast.error(error.message);
      else toast.success("Conta criada! Confira seu e-mail para confirmar.");
    }
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
          <h2 className="text-2xl font-semibold">{modo === "entrar" ? "Entrar" : "Criar conta"}</h2>
          <div className="space-y-2"><Label>E-mail</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-2"><Label>Senha</Label><Input type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
          <Button className="w-full" disabled={loading}>{modo === "entrar" ? "Entrar" : "Criar conta"}</Button>
          <Button type="button" variant="outline" className="w-full" onClick={google}>Continuar com Google</Button>
          <p className="text-center text-sm text-muted-foreground">
            {modo === "entrar" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
            <button type="button" className="font-medium text-accent" onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}>
              {modo === "entrar" ? "Criar conta" : "Entrar"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
