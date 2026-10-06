import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Sparkles, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fmtKm, projecaoKm } from "@/lib/fleet";
import { analisarRisco, type AnaliseRisco } from "@/lib/risco.functions";

const title = "Quilometragem mensal e risco — Frota";
const desc = "Registre o km mensal da frota e identifique veículos em risco de exceder o contrato.";

export const Route = createFileRoute("/risco")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell><Risco /></AppShell>,
});

const riscoCor = { alto: "destructive", medio: "secondary", baixo: "outline" } as const;
const riscoTxt = { alto: "Risco alto", medio: "Risco médio", baixo: "Risco baixo" };

function Risco() {
  const qc = useQueryClient();
  const analisar = useServerFn(analisarRisco);
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [vals, setVals] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [analise, setAnalise] = useState<AnaliseRisco | null>(null);
  const [carregando, setCarregando] = useState(false);

  const { data } = useQuery({
    queryKey: ["risco-dados"],
    queryFn: async () => {
      const [v, l] = await Promise.all([
        supabase.from("veiculos").select("*").order("placa"),
        supabase.from("leituras_km").select("*").order("mes"),
      ]);
      if (v.error) throw v.error;
      return { veiculos: v.data, leituras: l.data ?? [] };
    },
  });

  const salvar = async () => {
    const rows = Object.entries(vals)
      .filter(([, k]) => k.trim() !== "")
      .map(([veiculo_id, k]) => ({ veiculo_id, mes: mes + "-01", km: Number(k) }));
    if (!rows.length) return toast.error("Informe o km de pelo menos um veículo.");
    if (rows.some((r) => !Number.isFinite(r.km) || r.km < 0)) return toast.error("Km inválido.");
    setSalvando(true);
    const { error } = await supabase.from("leituras_km").upsert(rows, { onConflict: "veiculo_id,mes" });
    if (!error) {
      for (const r of rows) {
        const v = data?.veiculos.find((x) => x.id === r.veiculo_id);
        if (v && r.km > v.km_atual) await supabase.from("veiculos").update({ km_atual: r.km }).eq("id", r.veiculo_id);
      }
    }
    setSalvando(false);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} registro(s) salvos`);
    setVals({});
    qc.invalidateQueries();
    return undefined;
  };

  const rodarIA = async () => {
    setCarregando(true);
    try {
      setAnalise(await analisar());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCarregando(false);
    }
  };

  const veiculos = data?.veiculos ?? [];
  const placa = (id: string) => veiculos.find((v) => v.id === id)?.placa ?? "—";
  const ordem = { alto: 0, medio: 1, baixo: 2 };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold">Registro mensal de quilometragem</h1>
            <p className="text-sm text-muted-foreground">Informe o odômetro de cada veículo no fim do mês.</p>
          </div>
          <div className="flex items-end gap-2">
            <label className="text-sm">Mês<Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-40" /></label>
            <Button onClick={salvar} disabled={salvando}>{salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar</Button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr><th className="p-3">Placa</th><th className="p-3">Modelo</th><th className="p-3">Km atual</th><th className="p-3">Média/mês</th><th className="p-3">Projeção x limite</th><th className="p-3">Km do mês</th></tr>
            </thead>
            <tbody>
              {veiculos.map((v) => {
                const lt = (data?.leituras ?? []).filter((l) => l.veiculo_id === v.id);
                const p = projecaoKm(v, lt);
                const doMes = lt.find((l) => l.mes.startsWith(mes));
                return (
                  <tr key={v.id} className="border-t">
                    <td className="p-3 font-medium"><Link to="/veiculos/$id" params={{ id: v.id }} className="hover:underline">{v.placa}</Link></td>
                    <td className="p-3">{v.modelo}</td>
                    <td className="p-3">{fmtKm(v.km_atual)}</td>
                    <td className="p-3">{fmtKm(p.mediaMensal)}</td>
                    <td className={`p-3 ${p.excesso != null && p.excesso > 0 ? "font-medium text-destructive" : ""}`}>
                      {p.projetadoTotal != null && p.limiteTotal != null ? `${fmtKm(p.projetadoTotal)} / ${fmtKm(p.limiteTotal)}` : "—"}
                    </td>
                    <td className="p-3">
                      <Input type="number" min={0} className="w-36" placeholder={doMes ? String(doMes.km) : "Odômetro"}
                        value={vals[v.id] ?? ""} onChange={(e) => setVals({ ...vals, [v.id]: e.target.value })} />
                    </td>
                  </tr>
                );
              })}
              {!veiculos.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum veículo cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Análise de risco com IA</h2>
            <p className="text-sm text-muted-foreground">Identifica veículos que podem estourar o km contratado e sugere ações.</p>
          </div>
          <Button onClick={rodarIA} disabled={carregando || !veiculos.length}>
            {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {carregando ? "Analisando…" : "Analisar frota"}
          </Button>
        </div>
        {analise && (
          <div className="space-y-3">
            <p className="rounded-lg border bg-card p-4 text-sm">{analise.resumo}</p>
            {[...analise.veiculos].sort((a, b) => ordem[a.risco] - ordem[b.risco]).map((a) => (
              <div key={a.veiculo_id} className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{placa(a.veiculo_id)}</span>
                  <Badge variant={riscoCor[a.risco]}>{riscoTxt[a.risco]}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{a.motivo}</p>
                <ul className="mt-2 list-disc pl-5 text-sm">{a.acoes.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
