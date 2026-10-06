import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Equipe = T["equipes"]["Row"];
export type Veiculo = T["veiculos"]["Row"];
export type Historico = T["historico_equipes"]["Row"];
export type Leitura = T["leituras_km"]["Row"];
export type Manutencao = T["manutencoes"]["Row"];
export type Sinistro = T["sinistros"]["Row"];

export const TIPOS_MANUTENCAO = {
  oleo: "Troca de óleo",
  pneu: "Troca de pneu",
  mecanica: "Mecânica",
  avaria: "Avaria",
} as const;
export type TipoManutencao = keyof typeof TIPOS_MANUTENCAO;

export const fmtKm = (n?: number | null) =>
  n == null ? "—" : `${n.toLocaleString("pt-BR")} km`;
export const fmtMoney = (n?: number | null) =>
  n == null ? "—" : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtDate = (d?: string | null) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";
export const fmtMonth = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" });

function monthsBetween(a: Date, b: Date) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + (b.getDate() >= a.getDate() ? 0 : -1);
}

export function contrato(v: Veiculo) {
  if (!v.inicio_contrato) return null;
  const ini = new Date(v.inicio_contrato + "T00:00:00");
  const hoje = new Date();
  const decorridos = Math.max(0, monthsBetween(ini, hoje));
  if (!v.fim_contrato) return { decorridos, total: null, restantes: null, pct: null };
  const fim = new Date(v.fim_contrato + "T00:00:00");
  const total = Math.max(1, monthsBetween(ini, fim));
  const restantes = Math.max(0, monthsBetween(hoje, fim));
  return { decorridos, total, restantes, pct: Math.min(100, (decorridos / total) * 100) };
}

/** Km esperado até hoje pelo contrato vs rodado */
export function kmComparativo(v: Veiculo) {
  const c = contrato(v);
  const rodado = v.km_atual - v.km_inicial;
  if (!c || !v.km_mensal_contratado) return { rodado, esperado: null, diff: null };
  const dias = (Date.now() - new Date(v.inicio_contrato + "T00:00:00").getTime()) / 86400000;
  const esperado = Math.round((dias / 30.44) * v.km_mensal_contratado);
  return { rodado, esperado, diff: rodado - esperado };
}

export type Alerta = { tipo: "erro" | "aviso"; texto: string };

export function alertas(v: Veiculo, manut: Manutencao[]): Alerta[] {
  const out: Alerta[] = [];
  const ultimo = (t: TipoManutencao, intervalo: number | null) => {
    const m = manut
      .filter((x) => x.veiculo_id === v.id && x.tipo === t && x.km != null)
      .sort((a, b) => (b.km ?? 0) - (a.km ?? 0))[0];
    const proximo = m?.proximo_km ?? (intervalo ? (m?.km ?? v.km_inicial) + intervalo : null);
    return proximo;
  };
  const check = (label: string, prox: number | null) => {
    if (prox == null) return;
    const falta = prox - v.km_atual;
    if (falta <= 0) out.push({ tipo: "erro", texto: `${label} vencida (${fmtKm(-falta)} atrasado)` });
    else if (falta <= 1000) out.push({ tipo: "aviso", texto: `${label} em ${fmtKm(falta)}` });
  };
  check("Troca de óleo", ultimo("oleo", v.intervalo_oleo_km));
  check("Troca de pneu", ultimo("pneu", v.intervalo_pneu_km));
  const k = kmComparativo(v);
  if (k.diff != null && k.esperado) {
    if (k.diff > 0) out.push({ tipo: k.diff > k.esperado * 0.1 ? "erro" : "aviso", texto: `Acima do km contratado em ${fmtKm(k.diff)}` });
  }
  const c = contrato(v);
  if (c?.restantes != null && c.restantes <= 2) out.push({ tipo: "aviso", texto: c.restantes === 0 ? "Contrato vencendo/vencido" : `Contrato termina em ${c.restantes} mês(es)` });
  return out;
}

/** Projeção de km até o fim do contrato a partir das leituras mensais (odômetro). */
export function projecaoKm(v: Veiculo, leituras: Leitura[]) {
  const ls = [...leituras].sort((a, b) => a.mes.localeCompare(b.mes));
  const pontos = [{ km: v.km_inicial }, ...ls.map((l) => ({ km: l.km }))];
  const deltas = pontos.slice(1).map((p, i) => p.km - pontos[i]!.km).filter((d) => d >= 0);
  const recentes = deltas.slice(-3);
  const mediaMensal = recentes.length ? Math.round(recentes.reduce((a, b) => a + b, 0) / recentes.length) : null;
  const c = contrato(v);
  const limiteTotal = c?.total && v.km_mensal_contratado ? c.total * v.km_mensal_contratado : null;
  const kmAtual = Math.max(v.km_atual, ls.at(-1)?.km ?? 0);
  const rodado = kmAtual - v.km_inicial;
  const projetadoTotal = mediaMensal != null && c?.restantes != null ? rodado + mediaMensal * c.restantes : null;
  const excesso = projetadoTotal != null && limiteTotal != null ? projetadoTotal - limiteTotal : null;
  return { mediaMensal, rodado, limiteTotal, projetadoTotal, excesso, mesesRestantes: c?.restantes ?? null };
}
