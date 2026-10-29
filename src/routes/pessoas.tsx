import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { AdminOnly } from "@/components/Access";
import { Box } from "@/components/Box";
import { Operadores } from "@/components/Operadores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/pessoas")({
  head: () => ({ meta: [
    { title: "Pessoas — Frota" }, { name: "description", content: "Operadores do sistema e colaboradores que utilizam os veículos." },
    { property: "og:title", content: "Pessoas — Frota" }, { property: "og:description", content: "Operadores do sistema e colaboradores que utilizam os veículos." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AppShell><Pessoas /></AppShell>,
});

function Pessoas() {
  return <div className="space-y-6">
    <h1 className="text-3xl font-semibold">Pessoas</h1>
    <Box title="Colaboradores do operacional"><Colaboradores /></Box>
    <AdminOnly><Box title="Operadores do sistema"><Operadores /></Box></AdminOnly>
  </div>;
}

function Colaboradores() {
  const qc = useQueryClient();
  const [f, setF] = useState({ nome: "", funcao: "", telefone: "" });
  const [busca, setBusca] = useState("");
  const { data } = useQuery({
    queryKey: ["colaboradores"],
    queryFn: async () => {
      const [c, e] = await Promise.all([
        supabase.from("colaboradores").select("*").order("nome"),
        supabase.from("equipes").select("id, nome"),
      ]);
      if (c.error) throw c.error;
      return { colaboradores: c.data, equipes: e.data ?? [] };
    },
  });
  const add = useMutation({
    mutationFn: async () => {
      if (!f.nome.trim()) throw new Error("Informe o nome");
      const { error } = await supabase.from("colaboradores").insert({ nome: f.nome.trim(), funcao: f.funcao.trim() || null, telefone: f.telefone.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => { setF({ nome: "", funcao: "", telefone: "" }); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("colaboradores").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries(),
  });
  const lista = (data?.colaboradores ?? []).filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase()));
  return <div className="space-y-4">
    <AdminOnly><form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="flex flex-wrap gap-2">
      <Input className="max-w-xs" placeholder="Nome" maxLength={100} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      <Input className="max-w-[12rem]" placeholder="Função" maxLength={60} value={f.funcao} onChange={(e) => setF({ ...f, funcao: e.target.value })} />
      <Input className="max-w-[12rem]" placeholder="Telefone" maxLength={30} value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} />
      <Button disabled={add.isPending}>Adicionar</Button>
    </form></AdminOnly>
    <Input className="max-w-xs" placeholder="Buscar colaborador…" value={busca} onChange={(e) => setBusca(e.target.value)} />
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-2">Nome</th><th>Função</th><th>Telefone</th><th>Equipe</th><th /></tr></thead><tbody>
      {lista.map((c) => <tr key={c.id} className="border-b"><td className="py-2">{c.nome}</td><td>{c.funcao ?? "—"}</td><td>{c.telefone ?? "—"}</td><td>{data?.equipes.find((q) => q.id === c.equipe_id)?.nome ?? "—"}</td>
        <td className="text-right"><AdminOnly><button aria-label="Excluir colaborador" onClick={() => confirm(`Excluir ${c.nome}?`) && del.mutate(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></AdminOnly></td></tr>)}
      {!lista.length && <tr><td colSpan={5} className="py-3 text-muted-foreground">Nenhum colaborador.</td></tr>}
    </tbody></table></div>
  </div>;
}
