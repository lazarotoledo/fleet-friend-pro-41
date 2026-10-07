import { AdminOnly } from "@/components/Access";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, Plus, Radio } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { VehicleForm, type VeiculoInput } from "@/components/VehicleForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { alertas, contrato, fmtKm, kmComparativo } from "@/lib/fleet";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Veículos — Frota" },
      { name: "description", content: "Painel da frota com alertas de manutenção, km e contratos." },
      { property: "og:title", content: "Veículos — Frota" },
      { property: "og:description", content: "Painel da frota com alertas de manutenção, km e contratos." },
    ],
  }),
  component: () => <AppShell><Painel /></AppShell>,
});

function Painel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["painel"],
    queryFn: async () => {
      const [v, m, e, l] = await Promise.all([
        supabase.from("veiculos").select("*").order("placa"),
        supabase.from("manutencoes").select("*"),
        supabase.from("equipes").select("*"),
        supabase.from("leituras_km").select("*"),
      ]);
      if (v.error) throw v.error;
      if (l.error) throw l.error;
      return { veiculos: v.data, manut: m.data ?? [], equipes: e.data ?? [], leituras: l.data ?? [] };
    },
  });

  const criar = useMutation({
    mutationFn: async (input: VeiculoInput) => {
      const { data, error } = await supabase.from("veiculos").insert(input as never).select().single();
      if (error) throw error;
      if (data.equipe_id) await supabase.from("historico_equipes").insert({ veiculo_id: data.id, equipe_id: data.equipe_id, data_inicio: data.inicio_contrato ?? new Date().toISOString().slice(0, 10) });
    },
    onSuccess: () => { toast.success("Veículo cadastrado"); setOpen(false); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const veiculos = data?.veiculos ?? [];
  const lista = veiculos.map((v) => ({ v, a: alertas(v, data?.manut ?? [], data?.leituras ?? []) }));
  const comAlerta = lista.filter((x) => x.a.length);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Veículos</h1>
          <p className="text-muted-foreground">{veiculos.length} na frota · {comAlerta.length} com alertas</p>
        </div>
        <AdminOnly><Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Novo veículo</Button></AdminOnly>
      </div>

      {comAlerta.length > 0 && (
        <section className="rounded-xl border border-warning/40 bg-warning/10 p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Atenção</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {comAlerta.flatMap(({ v, a }) => a.map((al, i) => (
              <li key={v.id + i}>
                <Link to="/veiculos/$id" params={{ id: v.id }} className="flex items-center gap-2 text-sm hover:underline">
                  <span className={`h-2 w-2 rounded-full ${al.tipo === "erro" ? "bg-destructive" : "bg-warning"}`} />
                  <b>{v.placa}</b> — {al.texto}
                </Link>
              </li>
            )))}
          </ul>
        </section>
      )}

      {isLoading ? <p className="text-muted-foreground">Carregando…</p> : veiculos.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">Nenhum veículo cadastrado ainda.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map(({ v, a }) => {
            const c = contrato(v);
            const k = kmComparativo(v);
            const eq = data!.equipes.find((e) => e.id === v.equipe_id);
            return (
              <Link key={v.id} to="/veiculos/$id" params={{ id: v.id }} className="group rounded-xl border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-accent">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display text-xl font-semibold tracking-wider">{v.placa}</div>
                    <div className="text-sm text-muted-foreground">{[v.modelo, v.cor].filter(Boolean).join(" · ") || "—"}</div>
                  </div>
                  {v.rastreado && <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-secondary-foreground"><Radio className="h-3 w-3" />Rastreado</span>}
                </div>
                <div className="mt-4 text-sm"><span className="text-muted-foreground">Equipe:</span> {eq?.nome ?? "Sem equipe"}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><div className="text-xs text-muted-foreground">Km atual</div>{fmtKm(v.km_atual)}</div>
                  <div><div className="text-xs text-muted-foreground">Rodado / esperado</div>{fmtKm(k.rodado)}{k.esperado != null && <span className="text-muted-foreground"> / {k.esperado.toLocaleString("pt-BR")}</span>}</div>
                </div>
                {c?.pct != null && (
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Contrato</span><span>{c.restantes} meses restantes</span></div>
                    <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${c.pct}%` }} /></div>
                  </div>
                )}
                {a.length > 0 && <div className="mt-3 flex items-center gap-1 text-xs font-medium text-destructive"><AlertTriangle className="h-3 w-3" />{a.length} alerta(s)</div>}
              </Link>
            );
          })}
        </div>
      )}

      <AdminOnly><Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Novo veículo</DialogTitle></DialogHeader>
          <VehicleForm onSubmit={(v) => criar.mutate(v)} saving={criar.isPending} />
        </DialogContent>
      </Dialog></AdminOnly>
    </div>
  );
}
