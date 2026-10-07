import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { AdminOnly, type FleetRole } from "@/components/Access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listFleetUsers, inviteFleetUser } from "@/lib/users.functions";

export const Route = createFileRoute("/usuarios")({
  head: () => ({ meta: [
    { title: "Usuários — Frota" }, { name: "description", content: "Administração dos acessos à frota." },
    { property: "og:title", content: "Usuários — Frota" }, { property: "og:description", content: "Administração dos acessos à frota." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AppShell><AdminOnly><Users /></AdminOnly></AppShell>,
});

function Users() {
  const list = useServerFn(listFleetUsers);
  const invite = useServerFn(inviteFleetUser);
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FleetRole>("consultor");
  const { data, error, isLoading } = useQuery({ queryKey: ["fleet-users"], queryFn: () => list() });
  const create = useMutation({
    mutationFn: () => invite({ data: { email: email.trim(), role } }),
    onSuccess: () => { setEmail(""); toast.success("Convite enviado por e-mail para definir a senha."); qc.invalidateQueries({ queryKey: ["fleet-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return <div className="space-y-6">
    <h1 className="text-3xl font-semibold">Usuários</h1>
    <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
      <div className="space-y-2"><Label htmlFor="user-email">E-mail</Label><Input id="user-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="user-role">Acesso</Label><select id="user-role" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={role} onChange={(e) => setRole(e.target.value as FleetRole)}><option value="consultor">Consultor</option><option value="admin">Administrador</option></select></div>
      <Button disabled={create.isPending}>{create.isPending ? "Enviando…" : "Convidar usuário"}</Button>
    </form>
    {isLoading && <p>Carregando…</p>}{error && <p className="text-destructive">{error.message}</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-3">E-mail</th><th>Acesso</th><th>Status</th></tr></thead><tbody>{data?.map((u) => <tr key={u.id} className="border-b"><td className="py-3">{u.email}</td><td>{u.role === "admin" ? "Administrador" : "Consultor"}</td><td>{u.confirmed ? "Ativo" : "Convite enviado"}</td></tr>)}</tbody></table></div>
  </div>;
}