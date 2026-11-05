import { AdminOnly } from "@/components/Access";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/locadoras")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Locadoras — Frota" },
      { name: "description", content: "Cadastro das locadoras dos veículos da frota." },
      { property: "og:title", content: "Locadoras — Frota" },
      { property: "og:description", content: "Cadastro das locadoras dos veículos da frota." },
    ],
  }),
  component: () => <AppShell><Locadoras /></AppShell>,
});

function Locadoras() {
  const qc = useQueryClient();
  const vazio = { nome: "", contato: "", telefone: "", email: "" };
  const [f, setF] = useState(vazio);
  const { data } = useQuery({
    queryKey: ["locadoras-page"],
    queryFn: async () => {
      const [l, v] = await Promise.all([
        supabase.from("locadoras").select("*").order("nome"),
        supabase.from("veiculos").select("id, placa, locadora_id"),
      ]);
      if (l.error) throw l.error;
      return { locadoras: l.data, veiculos: v.data ?? [] };
    },
  });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = f.nome.trim();
    if (!nome) return;
    const { error } = await supabase.from("locadoras").insert({ nome, contato: f.contato || null, telefone: f.telefone || null, email: f.email || null });
    if (error) { toast.error(error.message); return; }
    setF(vazio); qc.invalidateQueries();
  };
  const del = async (id: string, n: number) => {
    if (!confirm(n ? `Esta locadora tem ${n} veículo(s). Excluir mesmo assim? Os veículos ficarão sem locadora.` : "Excluir locadora?")) return;
    const { error } = await supabase.from("locadoras").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Locadoras</h1>
      <AdminOnly><form onSubmit={add} className="grid gap-2 sm:grid-cols-5">
        <Input placeholder="Nome *" maxLength={80} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
        <Input placeholder="Contato" maxLength={80} value={f.contato} onChange={(e) => setF({ ...f, contato: e.target.value })} />
        <Input placeholder="Telefone" maxLength={30} value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} />
        <Input placeholder="E-mail" type="email" maxLength={120} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <Button>Adicionar</Button>
      </form></AdminOnly>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.locadoras.map((l) => {
          const carros = data.veiculos.filter((v) => v.locadora_id === l.id);
          return (
            <div key={l.id} className="space-y-2 rounded-xl border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{l.nome}</h3>
                <AdminOnly><button aria-label="Excluir locadora" onClick={() => del(l.id, carros.length)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></AdminOnly>
              </div>
              <p className="text-sm text-muted-foreground">{[l.contato, l.telefone, l.email].filter(Boolean).join(" · ") || "Sem contato"}</p>
              <p className="text-sm">Veículos: {carros.length ? carros.map((c) => c.placa).join(", ") : "nenhum"}</p>
            </div>
          );
        })}
        {data && !data.locadoras.length && <p className="text-muted-foreground">Nenhuma locadora cadastrada.</p>}
      </div>
    </div>
  );
}
