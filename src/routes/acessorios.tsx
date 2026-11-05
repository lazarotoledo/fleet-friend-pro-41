import { AdminOnly } from "@/components/Access";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/acessorios")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Acessórios — Frota" },
      { name: "description", content: "Cadastro dos acessórios da empresa instalados nos veículos." },
      { property: "og:title", content: "Acessórios — Frota" },
      { property: "og:description", content: "Cadastro dos acessórios da empresa instalados nos veículos." },
    ],
  }),
  component: () => <AppShell><Acessorios /></AppShell>,
});

const sel = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

function Acessorios() {
  const qc = useQueryClient();
  const vazio = { veiculo_id: "", nome: "", patrimonio: "", observacao: "" };
  const [f, setF] = useState(vazio);
  const [busca, setBusca] = useState("");
  const { data } = useQuery({
    queryKey: ["acessorios-page"],
    queryFn: async () => {
      const [a, v] = await Promise.all([
        supabase.from("acessorios").select("*").order("nome"),
        supabase.from("veiculos").select("id, placa").order("placa"),
      ]);
      if (a.error) throw a.error;
      return { itens: a.data, veiculos: v.data ?? [] };
    },
  });
  const placa = (id: string) => data?.veiculos.find((v) => v.id === id)?.placa ?? "—";
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.veiculo_id || !f.nome.trim()) { toast.error("Escolha o veículo e informe o item"); return; }
    const { error } = await supabase.from("acessorios").insert({ veiculo_id: f.veiculo_id, nome: f.nome.trim(), patrimonio: f.patrimonio || null, observacao: f.observacao || null });
    if (error) { toast.error(error.message); return; }
    setF(vazio); qc.invalidateQueries();
  };
  const del = async (id: string) => {
    if (!confirm("Excluir acessório?")) return;
    await supabase.from("acessorios").delete().eq("id", id); qc.invalidateQueries();
  };
  const t = busca.trim().toLowerCase();
  const lista = (data?.itens ?? []).filter((i) => !t || `${i.nome} ${i.patrimonio ?? ""} ${placa(i.veiculo_id)}`.toLowerCase().includes(t));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Acessórios</h1>
      <AdminOnly><form onSubmit={add} className="grid gap-2 sm:grid-cols-5">
        <select className={sel} value={f.veiculo_id} onChange={(e) => setF({ ...f, veiculo_id: e.target.value })}>
          <option value="">Veículo *</option>
          {data?.veiculos.map((v) => <option key={v.id} value={v.id}>{v.placa}</option>)}
        </select>
        <Input placeholder="Item * (ex.: Rack, Engate)" maxLength={80} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
        <Input placeholder="Nº patrimônio" maxLength={40} value={f.patrimonio} onChange={(e) => setF({ ...f, patrimonio: e.target.value })} />
        <Input placeholder="Observação" maxLength={200} value={f.observacao} onChange={(e) => setF({ ...f, observacao: e.target.value })} />
        <Button>Adicionar</Button>
      </form></AdminOnly>
      <Input placeholder="Buscar por item, patrimônio ou placa…" value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-sm" />
      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground"><tr><th className="p-3">Item</th><th>Patrimônio</th><th>Veículo</th><th>Observação</th><th /></tr></thead>
          <tbody>
            {lista.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="p-3 font-medium">{i.nome}</td>
                <td>{i.patrimonio ?? "—"}</td>
                <td><Link to="/veiculos/$id" params={{ id: i.veiculo_id }} className="text-accent hover:underline">{placa(i.veiculo_id)}</Link></td>
                <td className="text-muted-foreground">{i.observacao ?? ""}</td>
                <td className="pr-3 text-right"><AdminOnly><button aria-label="Excluir" onClick={() => del(i.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></AdminOnly></td>
              </tr>
            ))}
            {!lista.length && <tr><td colSpan={5} className="p-3 text-muted-foreground">Nenhum acessório.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
