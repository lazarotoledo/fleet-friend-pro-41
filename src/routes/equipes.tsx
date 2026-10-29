import { AdminOnly } from "@/components/Access";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/equipes")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Equipes — Frota" },
      { name: "description", content: "Cadastro das equipes que utilizam os veículos da frota." },
      { property: "og:title", content: "Equipes — Frota" },
      { property: "og:description", content: "Cadastro das equipes que utilizam os veículos da frota." },
    ],
  }),
  component: () => <AppShell><Equipes /></AppShell>,
});

type Colab = { id: string; nome: string; funcao: string | null; equipe_id: string | null };

function Equipes() {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const { data } = useQuery({
    queryKey: ["equipes-veiculos"],
    queryFn: async () => {
      const [e, v, c] = await Promise.all([
        supabase.from("equipes").select("*").order("nome"),
        supabase.from("veiculos").select("id, placa, equipe_id"),
        supabase.from("colaboradores").select("id, nome, funcao, equipe_id").order("nome"),
      ]);
      if (e.error) throw e.error;
      return { equipes: e.data, veiculos: v.data ?? [], colaboradores: (c.data ?? []) as Colab[] };
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
  const mover = useMutation({
    mutationFn: async ({ id, equipe_id }: { id: string; equipe_id: string | null }) => {
      const { error } = await supabase.from("colaboradores").update({ equipe_id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Equipes</h1>
      <AdminOnly><form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="flex max-w-md gap-2">
        <Input placeholder="Nome da equipe" maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} />
        <Button disabled={add.isPending}>Adicionar</Button>
      </form></AdminOnly>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.equipes.map((q) => {
          const carros = data.veiculos.filter((v) => v.equipe_id === q.id);
          const membros = data.colaboradores.filter((c) => c.equipe_id === q.id);
          return (
            <div key={q.id} className="space-y-3 rounded-xl border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{q.nome}</h3>
                <AdminOnly><button aria-label="Excluir equipe" onClick={() => confirm("Excluir equipe?") && del.mutate(q.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></AdminOnly>
              </div>
              <p className="text-sm text-muted-foreground">Veículos: {carros.length ? carros.map((c) => c.placa).join(", ") : "nenhum"}</p>
              <div className="flex flex-wrap gap-1.5">
                {membros.map((m) => <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs">
                  {m.nome}<AdminOnly><button aria-label={`Remover ${m.nome}`} onClick={() => mover.mutate({ id: m.id, equipe_id: null })} className="hover:text-destructive"><X className="h-3 w-3" /></button></AdminOnly>
                </span>)}
                {!membros.length && <span className="text-xs text-muted-foreground">Sem colaboradores</span>}
              </div>
              <AdminOnly><AutoCompletar opcoes={data.colaboradores.filter((c) => c.equipe_id !== q.id)} onEscolher={(c) => mover.mutate({ id: c.id, equipe_id: q.id })} /></AdminOnly>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AutoCompletar({ opcoes, onEscolher }: { opcoes: Colab[]; onEscolher: (c: Colab) => void }) {
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const t = texto.trim().toLowerCase();
  const sugestoes = t ? opcoes.filter((c) => c.nome.toLowerCase().includes(t)).slice(0, 8) : [];
  return (
    <div className="relative">
      <Input placeholder="Adicionar colaborador (digite o nome)…" value={texto}
        onChange={(e) => { setTexto(e.target.value); setAberto(true); }}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onKeyDown={(e) => { if (e.key === "Enter" && sugestoes[0]) { e.preventDefault(); onEscolher(sugestoes[0]); setTexto(""); } }} />
      {aberto && t && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover text-sm shadow-md">
          {sugestoes.map((c) => <li key={c.id}><button type="button" className="flex w-full justify-between px-3 py-1.5 text-left hover:bg-accent"
            onMouseDown={(e) => e.preventDefault()} onClick={() => { onEscolher(c); setTexto(""); }}>
            <span>{c.nome}</span><span className="text-xs text-muted-foreground">{c.equipe_id ? "trocar de equipe" : c.funcao ?? ""}</span></button></li>)}
          {!sugestoes.length && <li className="px-3 py-1.5 text-muted-foreground">Nenhum colaborador encontrado</li>}
        </ul>
      )}
    </div>
  );
}
