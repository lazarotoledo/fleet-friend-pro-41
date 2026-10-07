import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Definir senha — Frota" }, { name: "description", content: "Defina sua senha de acesso à frota." },
    { property: "og:title", content: "Definir senha — Frota" }, { property: "og:description", content: "Defina sua senha de acesso à frota." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Password,
});
function Password() {
  const navigate = useNavigate();
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const type = new URLSearchParams(window.location.hash.slice(1)).get("type");
    if (type !== "recovery" && type !== "invite") return;
    supabase.auth.getUser().then(({ data }) => setValid(!!data.user));
  }, []);
  return <main className="flex min-h-screen items-center justify-center px-4"><form className="w-full max-w-sm space-y-4" onSubmit={async (e) => {
    e.preventDefault();
    if (!valid || password !== confirmation) { toast.error("As senhas precisam ser iguais."); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Senha definida"); navigate({ to: "/", replace: true });
  }}><h1 className="text-2xl font-semibold">Definir senha</h1>{valid ? <><Label htmlFor="new-password">Nova senha</Label><Input id="new-password" type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /><Label htmlFor="confirm-password">Confirmar senha</Label><Input id="confirm-password" type="password" minLength={8} required autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /><Button disabled={saving}>Salvar senha</Button></> : <p className="text-muted-foreground">Abra o link de convite ou recuperação recebido por e-mail.</p>}</form></main>;
}