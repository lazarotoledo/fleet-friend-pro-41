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
import { fmtDate, fmtMoney } from "@/lib/fleet";

export const Route = createFileRoute("/ticketlog")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Ticket Log — Abastecimentos da Frota" },
      { name: "description", content: "Abastecimentos do mês por veículo: litros e valores do cartão Ticket Log." },
      { property: "og:title", content: "Ticket Log — Abastecimentos da Frota" },
      { property: "og:description", content: "Abastecimentos do mês por veículo: litros e valores do cartão Ticket Log." },
    ],
  }),
  component: () => <AppShell><TicketLog /></AppShell>,
});

const sel = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";
const fmtL = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L`;

function fimMes(mes: string) {
  const [y = 2000, m = 1] = mes.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

function TicketLog() {
  const qc = useQueryClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const [mes, setMes] = useState(hoje.slice(0, 7));
  const vazio = { veiculo_id: "", data: hoje, litros: "", valor: "", km: "", motorista: "", posto: "" };
  const [f, setF] = useState(vazio);
  const { data } = useQuery({
    queryKey: ["abastecimentos", mes],
    queryFn: async () => {
      const [a, v] = await Promise.all([
        supabase.from("abastecimentos").select("*").gte("data", `${mes}-01`).lte("data", fimMes(mes)).order("data", { ascending: false }),
        supabase.from("veiculos").select("id, placa").order("placa"),
      ]);
      if (a.error) throw a.error;
      return { itens: a.data, veiculos: v.data ?? [] };
    },
  });
  const itens = data?.itens ?? [];
  const veiculos = data?.veiculos ?? [];
  const placa = (id: string) => veiculos.find((v) => v.id === id)?.placa ?? "—";
  const totalL = itens.reduce((s, i) => s + Number(i.litros), 0);
  const totalV = itens.reduce((s, i) => s + Number(i.valor), 0);
  const porVeiculo = veiculos.map((v) => {
    const d = itens.filter((i) => i.veiculo_id === v.id);
    return { ...v, n: d.length, litros: d.reduce((s, i) => s + Number(i.litros), 0), valor: d.reduce((s, i) => s + Number(i.valor), 0) };
  }).filter((x) => x.n > 0);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const litros = Number(f.litros), valor = Number(f.valor);
    if (!f.veiculo_id || !(litros > 0) || !(valor >= 0) || f.valor === "") { toast.error("Informe veículo, litros e valor"); return; }
    const { error } = await supabase.from("abastecimentos").insert({ veiculo_id: f.veiculo_id, data: f.data, litros, valor, km: f.km ? Number(f.km) : null, motorista: f.motorista || null, posto: f.posto || null });
    if (error) { toast.error(error.message); return; }
    setF({ ...vazio, data: f.data }); toast.success("Abastecimento registrado"); qc.invalidateQueries();
  };
  const del = async (id: string) => {
    if (!confirm("Excluir abastecimento?")) return;
    await supabase.from("abastecimentos").delete().eq("id", id); qc.invalidateQueries();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold">Ticket Log · Abastecimentos</h1>
        <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-44" aria-label="Mês" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-card"><div className="text-xs text-muted-foreground">Total no mês</div><div className="font-display text-2xl font-semibold">{fmtMoney(totalV)}</div></div>
        <div className="rounded-xl border bg-card p-4 shadow-card"><div className="text-xs text-muted-foreground">Litros no mês</div><div className="font-display text-2xl font-semibold">{fmtL(totalL)}</div></div>
        <div className="rounded-xl border bg-card p-4 shadow-card"><div className="text-xs text-muted-foreground">Preço médio</div><div className="font-display text-2xl font-semibold">{totalL ? `${fmtMoney(totalV / totalL)}/L` : "—"}</div></div>
      </div>
      <AdminOnly><form onSubmit={add} className="grid gap-2 rounded-xl border bg-card p-4 shadow-card sm:grid-cols-4">
        <select className={sel} value={f.veiculo_id} onChange={(e) => setF({ ...f, veiculo_id: e.target.value })}>
          <option value="">Veículo *</option>
          {veiculos.map((v) => <option key={v.id} value={v.id}>{v.placa}</option>)}
        </select>
        <Input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} />
        <Input type="number" step="0.01" min={0} placeholder="Litros *" value={f.litros} onChange={(e) => setF({ ...f, litros: e.target.value })} />
        <Input type="number" step="0.01" min={0} placeholder="Valor R$ *" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} />
        <Input type="number" min={0} placeholder="Km no abastecimento" value={f.km} onChange={(e) => setF({ ...f, km: e.target.value })} />
        <Input placeholder="Motorista" maxLength={80} value={f.motorista} onChange={(e) => setF({ ...f, motorista: e.target.value })} />
        <Input placeholder="Posto" maxLength={80} value={f.posto} onChange={(e) => setF({ ...f, posto: e.target.value })} />
        <Button>Registrar</Button>
      </form></AdminOnly>
      {porVeiculo.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground"><tr><th className="p-3">Veículo</th><th>Abastecimentos</th><th>Litros</th><th>Valor</th></tr></thead>
            <tbody>{porVeiculo.map((p) => <tr key={p.id} className="border-t"><td className="p-3 font-medium">{p.placa}</td><td>{p.n}</td><td>{fmtL(p.litros)}</td><td>{fmtMoney(p.valor)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground"><tr><th className="p-3">Data</th><th>Veículo</th><th>Litros</th><th>Valor</th><th>Km</th><th>Motorista</th><th>Posto</th><th /></tr></thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="p-3">{fmtDate(i.data)}</td>
                <td><Link to="/veiculos/$id" params={{ id: i.veiculo_id }} className="text-accent hover:underline">{placa(i.veiculo_id)}</Link></td>
                <td>{fmtL(Number(i.litros))}</td>
                <td>{fmtMoney(Number(i.valor))}</td>
                <td>{i.km?.toLocaleString("pt-BR") ?? "—"}</td>
                <td>{i.motorista ?? "—"}</td>
                <td>{i.posto ?? "—"}</td>
                <td className="pr-3 text-right"><AdminOnly><button aria-label="Excluir" onClick={() => del(i.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></AdminOnly></td>
              </tr>
            ))}
            {!itens.length && <tr><td colSpan={8} className="p-3 text-muted-foreground">Nenhum abastecimento neste mês.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
