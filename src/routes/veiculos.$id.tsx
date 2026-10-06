import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { F, useEquipes, VehicleForm, type VeiculoInput } from "@/components/VehicleForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { alertas, contrato, fmtDate, fmtKm, fmtMoney, fmtMonth, kmComparativo, TIPOS_MANUTENCAO, type TipoManutencao, type Veiculo } from "@/lib/fleet";
import { Acessorios, Arquivos, Multas } from "@/components/VehicleExtras";

export const Route = createFileRoute("/veiculos/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do veículo — Frota" },
      { name: "description", content: "Contrato, quilometragem, manutenções e sinistros do veículo." },
      { property: "og:title", content: "Detalhes do veículo — Frota" },
      { property: "og:description", content: "Contrato, quilometragem, manutenções e sinistros do veículo." },
    ],
  }),
  component: () => <AppShell><Detalhe /></AppShell>,
});

const sel = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

function Detalhe() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["veiculo", id],
    queryFn: async () => {
      const [v, h, l, m, s] = await Promise.all([
        supabase.from("veiculos").select("*").eq("id", id).maybeSingle(),
        supabase.from("historico_equipes").select("*").eq("veiculo_id", id).order("data_inicio", { ascending: false }),
        supabase.from("leituras_km").select("*").eq("veiculo_id", id).order("mes"),
        supabase.from("manutencoes").select("*").eq("veiculo_id", id).order("data", { ascending: false }),
        supabase.from("sinistros").select("*").eq("veiculo_id", id).order("data", { ascending: false }),
      ]);
      if (v.error) throw v.error;
      return { v: v.data, hist: h.data ?? [], leit: l.data ?? [], manut: m.data ?? [], sin: s.data ?? [] };
    },
  });
  const refresh = () => qc.invalidateQueries();

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (!data?.v) return <p>Veículo não encontrado. <Link to="/" className="text-accent">Voltar</Link></p>;
  const v = data.v;
  const al = alertas(v, data.manut);

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Veículos</Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-wider">{v.placa}</h1>
          <p className="text-muted-foreground">{[v.modelo, v.cor, v.rastreado ? "Rastreado" : "Sem rastreador"].filter(Boolean).join(" · ")}</p>
        </div>
        <AtualizarKm v={v} onDone={refresh} />
      </div>
      {al.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {al.map((a, i) => <span key={i} className={`rounded-full px-3 py-1 text-xs font-medium ${a.tipo === "erro" ? "bg-destructive/15 text-destructive" : "bg-warning/20 text-warning-foreground"}`}>{a.texto}</span>)}
        </div>
      )}
      <Tabs defaultValue="info">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="km">Quilometragem</TabsTrigger>
          <TabsTrigger value="manut">Manutenções</TabsTrigger>
          <TabsTrigger value="sin">Sinistros</TabsTrigger>
          <TabsTrigger value="multas">Multas</TabsTrigger>
          <TabsTrigger value="acess">Acessórios</TabsTrigger>
          <TabsTrigger value="check">Checklist</TabsTrigger>
          <TabsTrigger value="docs">Documentos</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="mt-6"><Info v={v} hist={data.hist} onDone={refresh} /></TabsContent>
        <TabsContent value="km" className="mt-6"><Km v={v} leit={data.leit} onDone={refresh} /></TabsContent>
        <TabsContent value="manut" className="mt-6"><Manut v={v} lista={data.manut} onDone={refresh} /></TabsContent>
        <TabsContent value="sin" className="mt-6"><Sin v={v} lista={data.sin} onDone={refresh} /></TabsContent>
        <TabsContent value="multas" className="mt-6"><Multas veiculoId={v.id} /></TabsContent>
        <TabsContent value="acess" className="mt-6"><Acessorios veiculoId={v.id} /></TabsContent>
        <TabsContent value="check" className="mt-6"><Arquivos veiculoId={v.id} categoria="checklist" /></TabsContent>
        <TabsContent value="docs" className="mt-6"><Arquivos veiculoId={v.id} categoria="documento" /></TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return <section className="rounded-xl border bg-card p-5 shadow-card">{title && <h3 className="mb-4 font-semibold">{title}</h3>}{children}</section>;
}
function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className={`font-display text-lg font-semibold ${tone ?? ""}`}>{value}</div></div>;
}

function AtualizarKm({ v, onDone }: { v: Veiculo; onDone: () => void }) {
  const [km, setKm] = useState("");
  const save = async () => {
    const n = Number(km);
    if (!km || n < 0) return;
    const { error } = await supabase.from("veiculos").update({ km_atual: n }).eq("id", v.id);
    if (error) { toast.error(error.message); return; }
    const mes = new Date(); mes.setDate(1);
    await supabase.from("leituras_km").upsert({ veiculo_id: v.id, mes: mes.toISOString().slice(0, 10), km: n }, { onConflict: "veiculo_id,mes" });
    setKm(""); toast.success("Km atualizado"); onDone();
  };
  return (
    <div className="flex gap-2">
      <Input type="number" min={0} placeholder={`Km atual: ${v.km_atual}`} value={km} onChange={(e) => setKm(e.target.value)} className="w-44" />
      <Button onClick={save}>Atualizar km</Button>
    </div>
  );
}

function Info({ v, hist, onDone }: { v: Veiculo; hist: { id: string; equipe_id: string | null; data_inicio: string; data_fim: string | null }[]; onDone: () => void }) {
  const { data: equipes = [] } = useEquipes();
  const [edit, setEdit] = useState(false);
  const [nova, setNova] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const c = contrato(v);
  const nome = (id: string | null) => equipes.find((e) => e.id === id)?.nome ?? "Sem equipe";

  const salvar = useMutation({
    mutationFn: async (input: VeiculoInput) => { const { error } = await supabase.from("veiculos").update(input as never).eq("id", v.id); if (error) throw error; },
    onSuccess: () => { toast.success("Salvo"); setEdit(false); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const trocar = async () => {
    const eq = nova || null;
    const aberto = hist.find((h) => !h.data_fim);
    if (aberto) await supabase.from("historico_equipes").update({ data_fim: data }).eq("id", aberto.id);
    await supabase.from("historico_equipes").insert({ veiculo_id: v.id, equipe_id: eq, data_inicio: data });
    await supabase.from("veiculos").update({ equipe_id: eq }).eq("id", v.id);
    toast.success("Equipe alterada"); onDone();
  };

  const excluir = async () => {
    if (!confirm("Excluir este veículo e todo o histórico?")) return;
    await supabase.from("veiculos").delete().eq("id", v.id);
    window.history.back();
  };

  if (edit) return <Card title="Editar veículo"><VehicleForm initial={v} onSubmit={(x) => salvar.mutate(x)} saving={salvar.isPending} /></Card>;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card title="Contrato">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Início" value={fmtDate(v.inicio_contrato)} />
            <Stat label="Fim" value={fmtDate(v.fim_contrato)} />
            <Stat label="Tempo decorrido" value={c ? `${c.decorridos} meses` : "—"} />
            <Stat label="Restante" value={c?.restantes != null ? `${c.restantes} meses` : "—"} />
            <Stat label="Valor" value={fmtMoney(v.valor_contrato)} />
            <Stat label="Km inicial" value={fmtKm(v.km_inicial)} />
            <Stat label="Km mensal contratado" value={fmtKm(v.km_mensal_contratado)} />
            <Stat label="Km atual" value={fmtKm(v.km_atual)} />
          </div>
          {c?.pct != null && <div className="mt-4 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${c.pct}%` }} /></div>}
        </Card>
        <Card title="Cobertura do seguro"><p className="whitespace-pre-wrap text-sm">{v.cobertura_seguro || "—"}</p></Card>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEdit(true)}>Editar informações</Button>
          <Button variant="ghost" className="text-destructive" onClick={excluir}><Trash2 className="h-4 w-4" /> Excluir</Button>
        </div>
      </div>
      <Card title="Equipe">
        <div className="mb-4 font-display text-xl font-semibold">{nome(v.equipe_id)}</div>
        <div className="space-y-2">
          <select className={sel} value={nova} onChange={(e) => setNova(e.target.value)}>
            <option value="">Sem equipe</option>
            {equipes.map((q) => <option key={q.id} value={q.id}>{q.nome}</option>)}
          </select>
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          <Button className="w-full" variant="secondary" onClick={trocar}>Mudar equipe</Button>
        </div>
        <h4 className="mb-2 mt-6 text-sm font-semibold text-muted-foreground">Histórico</h4>
        <ul className="space-y-2 text-sm">
          {hist.length === 0 && <li className="text-muted-foreground">Sem histórico</li>}
          {hist.map((h) => <li key={h.id} className="border-l-2 border-accent pl-3"><b>{nome(h.equipe_id)}</b><div className="text-xs text-muted-foreground">{fmtDate(h.data_inicio)} → {h.data_fim ? fmtDate(h.data_fim) : "atual"}</div></li>)}
        </ul>
      </Card>
    </div>
  );
}

function Km({ v, leit, onDone }: { v: Veiculo; leit: { id: string; mes: string; km: number }[]; onDone: () => void }) {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [km, setKm] = useState("");
  const k = kmComparativo(v);
  const contratado = v.km_mensal_contratado;
  const linhas = leit.map((l, i) => {
    const anterior = i === 0 ? v.km_inicial : leit[i - 1]!.km;
    return { ...l, rodado: l.km - anterior };
  });
  const add = async () => {
    if (!km) return;
    const { error } = await supabase.from("leituras_km").upsert({ veiculo_id: v.id, mes: mes + "-01", km: Number(km) }, { onConflict: "veiculo_id,mes" });
    if (error) { toast.error(error.message); return; }
    const maior = Math.max(Number(km), ...leit.map((l) => l.km));
    if (maior > v.km_atual) await supabase.from("veiculos").update({ km_atual: maior }).eq("id", v.id);
    setKm(""); onDone();
  };
  const del = async (id: string) => { await supabase.from("leituras_km").delete().eq("id", id); onDone(); };
  const max = Math.max(contratado ?? 0, ...linhas.map((l) => l.rodado), 1);

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Rodado desde a contratação" value={fmtKm(k.rodado)} />
          <Stat label="Esperado pelo contrato" value={fmtKm(k.esperado)} />
          <Stat label="Diferença" value={k.diff == null ? "—" : `${k.diff > 0 ? "+" : ""}${k.diff.toLocaleString("pt-BR")} km`} tone={k.diff != null && k.diff > 0 ? "text-destructive" : "text-accent"} />
          <Stat label="Contratado por mês" value={fmtKm(contratado)} />
        </div>
      </Card>
      <Card title="Comparativo mensal">
        <div className="mb-4 flex flex-wrap gap-2">
          <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-44" />
          <Input type="number" min={0} placeholder="Km no fim do mês (odômetro)" value={km} onChange={(e) => setKm(e.target.value)} className="w-60" />
          <Button onClick={add}>Registrar</Button>
        </div>
        {linhas.length === 0 ? <p className="text-sm text-muted-foreground">Registre o km de cada mês para ver o comparativo.</p> : (
          <div className="space-y-3">
            {linhas.map((l) => {
              const acima = contratado != null && l.rodado > contratado;
              return (
                <div key={l.id} className="grid grid-cols-[90px_1fr_auto] items-center gap-3 text-sm">
                  <span className="capitalize text-muted-foreground">{fmtMonth(l.mes)}</span>
                  <div className="relative h-6 rounded bg-muted">
                    <div className={`h-full rounded ${acima ? "bg-destructive/70" : "bg-accent"}`} style={{ width: `${Math.max(0, (l.rodado / max) * 100)}%` }} />
                    {contratado && <div className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `${(contratado / max) * 100}%` }} title="Contratado" />}
                  </div>
                  <span className="flex items-center gap-2 tabular-nums">
                    <b className={acima ? "text-destructive" : ""}>{l.rodado.toLocaleString("pt-BR")}</b>
                    {contratado && <span className="text-muted-foreground">/ {contratado.toLocaleString("pt-BR")}</span>}
                    <button onClick={() => del(l.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </span>
                </div>
              );
            })}
            <p className="pt-2 text-xs text-muted-foreground">Barra = km rodado no mês · linha = km mensal contratado</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function Manut({ v, lista, onDone }: { v: Veiculo; lista: { id: string; tipo: string; data: string; km: number | null; descricao: string | null; custo: number | null; proximo_km: number | null }[]; onDone: () => void }) {
  const [f, setF] = useState({ tipo: "oleo" as TipoManutencao, data: new Date().toISOString().slice(0, 10), km: String(v.km_atual), proximo_km: "", custo: "", descricao: "" });
  const [filtro, setFiltro] = useState<string>("todos");
  const ultimo = (t: TipoManutencao) => lista.filter((m) => m.tipo === t && m.km != null).sort((a, b) => (b.km ?? 0) - (a.km ?? 0))[0];
  const proximo = (t: "oleo" | "pneu") => { const m = ultimo(t); const int = t === "oleo" ? v.intervalo_oleo_km : v.intervalo_pneu_km; return m?.proximo_km ?? (int ? (m?.km ?? v.km_inicial) + int : null); };

  const add = async () => {
    const proxDefault = f.tipo === "oleo" && v.intervalo_oleo_km ? Number(f.km) + v.intervalo_oleo_km : f.tipo === "pneu" && v.intervalo_pneu_km ? Number(f.km) + v.intervalo_pneu_km : null;
    const { error } = await supabase.from("manutencoes").insert({
      veiculo_id: v.id, tipo: f.tipo, data: f.data, km: f.km ? Number(f.km) : null,
      proximo_km: f.proximo_km ? Number(f.proximo_km) : proxDefault, custo: f.custo ? Number(f.custo) : null, descricao: f.descricao.slice(0, 2000) || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Manutenção registrada"); setF({ ...f, proximo_km: "", custo: "", descricao: "" }); onDone();
  };
  const del = async (id: string) => { await supabase.from("manutencoes").delete().eq("id", id); onDone(); };
  const filtrada = filtro === "todos" ? lista : lista.filter((m) => m.tipo === filtro);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {(["oleo", "pneu"] as const).map((t) => {
          const p = proximo(t); const falta = p != null ? p - v.km_atual : null;
          return (
            <Card key={t}>
              <Stat label={`Próxima ${TIPOS_MANUTENCAO[t].toLowerCase()}`} value={fmtKm(p)} />
              <p className={`mt-1 text-sm ${falta != null && falta <= 0 ? "text-destructive" : falta != null && falta <= 1000 ? "text-warning-foreground" : "text-muted-foreground"}`}>
                {falta == null ? "Defina o intervalo" : falta <= 0 ? `Vencida há ${fmtKm(-falta)}` : `Faltam ${fmtKm(falta)}`}
              </p>
            </Card>
          );
        })}
      </div>
      <Card title="Registrar manutenção">
        <div className="grid gap-4 sm:grid-cols-3">
          <F label="Tipo"><select className={sel} value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as TipoManutencao })}>{Object.entries(TIPOS_MANUTENCAO).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></F>
          <F label="Data"><Input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></F>
          <F label="Km"><Input type="number" min={0} value={f.km} onChange={(e) => setF({ ...f, km: e.target.value })} /></F>
          <F label="Próxima troca (km) — opcional"><Input type="number" min={0} value={f.proximo_km} onChange={(e) => setF({ ...f, proximo_km: e.target.value })} /></F>
          <F label="Custo (R$)"><Input type="number" step="0.01" min={0} value={f.custo} onChange={(e) => setF({ ...f, custo: e.target.value })} /></F>
          <div className="sm:col-span-3"><F label="Descrição"><Textarea maxLength={2000} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></F></div>
        </div>
        <div className="mt-4 flex justify-end"><Button onClick={add}>Registrar</Button></div>
      </Card>
      <Card title="Histórico">
        <div className="mb-4 flex flex-wrap gap-1">
          {[["todos", "Todos"], ...Object.entries(TIPOS_MANUTENCAO)].map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k ?? "todos")} className={`rounded-full px-3 py-1 text-xs font-medium ${filtro === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
        {filtrada.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum registro.</p> : (
          <ul className="divide-y">
            {filtrada.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-4 py-3 text-sm">
                <div>
                  <div className="font-medium">{TIPOS_MANUTENCAO[m.tipo as TipoManutencao]} <span className="font-normal text-muted-foreground">· {fmtDate(m.data)} · {fmtKm(m.km)}</span></div>
                  {m.descricao && <p className="mt-1 text-muted-foreground">{m.descricao}</p>}
                  {m.proximo_km && <p className="text-xs text-muted-foreground">Próxima: {fmtKm(m.proximo_km)}</p>}
                </div>
                <div className="flex items-center gap-3">{fmtMoney(m.custo)}<button onClick={() => del(m.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Sin({ v, lista, onDone }: { v: Veiculo; lista: { id: string; data: string; motorista: string | null; relato: string | null; detalhamento: string | null; envolvidos: string | null }[]; onDone: () => void }) {
  const vazio = { data: new Date().toISOString().slice(0, 10), motorista: "", relato: "", detalhamento: "", envolvidos: "" };
  const [f, setF] = useState(vazio);
  const add = async () => {
    if (!f.motorista.trim() && !f.relato.trim()) { toast.error("Informe ao menos motorista ou relato"); return; }
    const { error } = await supabase.from("sinistros").insert({ veiculo_id: v.id, data: f.data, motorista: f.motorista.slice(0, 120), relato: f.relato.slice(0, 4000), detalhamento: f.detalhamento.slice(0, 4000), envolvidos: f.envolvidos.slice(0, 2000) });
    if (error) { toast.error(error.message); return; }
    toast.success("Sinistro registrado"); setF(vazio); onDone();
  };
  const del = async (id: string) => { if (confirm("Excluir sinistro?")) { await supabase.from("sinistros").delete().eq("id", id); onDone(); } };

  return (
    <div className="space-y-6">
      <Card title="Registrar sinistro">
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Data"><Input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></F>
          <F label="Motorista"><Input maxLength={120} value={f.motorista} onChange={(e) => setF({ ...f, motorista: e.target.value })} /></F>
          <F label="Relato" full><Textarea maxLength={4000} value={f.relato} onChange={(e) => setF({ ...f, relato: e.target.value })} /></F>
          <F label="Detalhamento (danos, local, B.O., etc.)" full><Textarea maxLength={4000} value={f.detalhamento} onChange={(e) => setF({ ...f, detalhamento: e.target.value })} /></F>
          <F label="Envolvidos" full><Textarea maxLength={2000} placeholder="Nomes, placas, contatos de terceiros…" value={f.envolvidos} onChange={(e) => setF({ ...f, envolvidos: e.target.value })} /></F>
        </div>
        <div className="mt-4 flex justify-end"><Button onClick={add}>Registrar</Button></div>
      </Card>
      {lista.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum sinistro registrado.</p> : lista.map((s) => (
        <Card key={s.id}>
          <div className="flex items-start justify-between">
            <div><div className="font-display font-semibold">{fmtDate(s.data)}</div><div className="text-sm text-muted-foreground">Motorista: {s.motorista || "—"}</div></div>
            <button onClick={() => del(s.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-muted-foreground">Relato</dt><dd className="whitespace-pre-wrap">{s.relato || "—"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Detalhamento</dt><dd className="whitespace-pre-wrap">{s.detalhamento || "—"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Envolvidos</dt><dd className="whitespace-pre-wrap">{s.envolvidos || "—"}</dd></div>
          </dl>
        </Card>
      ))}
    </div>
  );
}
