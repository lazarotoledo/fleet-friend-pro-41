import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/equipes")({
  head: () => ({
    meta: [
      { title: "Equipes — Frota" },
      { name: "description", content: "Cadastro das equipes que utilizam os veículos da frota." },
      { property: "og:title", content: "Equipes — Frota" },
      { property: "og:description", content: "Cadastro das equipes que utilizam os veículos da frota." },
    ],
  }),
  component: () => <AppShell><Equipes /></AppShell>,
});

function Equipes() {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const { data } = useQuery({
    queryKey: ["equipes-veiculos"],
    queryFn: async () => {
      const [e, v] = await Promise.all([
        supabase.from("equipes").select("*").order("nome"),
        supabase.from("veiculos").select("id, placa, equipe_id"),
      ]);
      if (e.error) throw e.error;
      return { equipes: e.data, veiculos: v.data ?? [] };
    },
  });
  const add = useMutation({
    mutationFn: async () => {
      const n = nome.trim();
      if (!n || n.length > 80) throw new Error("Nome inválido");
      const { error } = await supabase.from("equipes").insert({ nome: n });
      if (error) throw error;
    },
    onSuccess: () => { setNome(""); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("equipes").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries(),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Equipes</h1>
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="flex max-w-md gap-2">
        <Input placeholder="Nome da equipe" maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} />
        <Button disabled={add.isPending}>Adicionar</Button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.equipes.map((q) => {
          const carros = data.veiculos.filter((v) => v.equipe_id === q.id);
          return (
            <div key={q.id} className="rounded-xl border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{q.nome}</h3>
                <button onClick={() => confirm("Excluir equipe?") && del.mutate(q.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{carros.length ? carros.map((c) => c.placa).join(", ") : "Nenhum veículo"}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
