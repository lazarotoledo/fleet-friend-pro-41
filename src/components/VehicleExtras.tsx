import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { F } from "@/components/VehicleForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtMoney } from "@/lib/fleet";

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return <section className="rounded-xl border bg-card p-5 shadow-card">{title && <h3 className="mb-4 font-semibold">{title}</h3>}{children}</section>;
}
const Del = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="text-muted-foreground hover:text-destructive" aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>
);

function useLista<T extends "acessorios" | "multas" | "arquivos_veiculo">(tabela: T, veiculoId: string, extra?: string) {
  return useQuery({
    queryKey: [tabela, veiculoId, extra],
    queryFn: async () => {
      let q = supabase.from(tabela).select("*").eq("veiculo_id", veiculoId);
      if (extra) q = q.eq("categoria", extra);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function Acessorios({ veiculoId }: { veiculoId: string }) {
  const qc = useQueryClient();
  const { data = [] } = useLista("acessorios", veiculoId);
  const vazio = { nome: "", patrimonio: "", observacao: "" };
  const [f, setF] = useState(vazio);
  const add = async () => {
    if (!f.nome.trim()) return toast.error("Informe o item");
    const { error } = await supabase.from("acessorios").insert({ veiculo_id: veiculoId, nome: f.nome.slice(0, 120), patrimonio: f.patrimonio.slice(0, 60) || null, observacao: f.observacao.slice(0, 500) || null });
    if (error) return toast.error(error.message);
    setF(vazio); qc.invalidateQueries({ queryKey: ["acessorios"] });
  };
  const del = async (id: string) => { await supabase.from("acessorios").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["acessorios"] }); };
  return (
    <div className="space-y-6">
      <Card title="Adicionar acessório da empresa">
        <div className="grid gap-4 sm:grid-cols-3">
          <F label="Item"><Input maxLength={120} placeholder="Ex.: escada, kit ferramentas" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></F>
          <F label="Nº patrimônio"><Input maxLength={60} value={f.patrimonio} onChange={(e) => setF({ ...f, patrimonio: e.target.value })} /></F>
          <F label="Observação"><Input maxLength={500} value={f.observacao} onChange={(e) => setF({ ...f, observacao: e.target.value })} /></F>
        </div>
        <div className="mt-4 flex justify-end"><Button onClick={add}>Adicionar</Button></div>
      </Card>
      <Card title="Acessórios no veículo">
        {data.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum acessório.</p> : (
          <ul className="divide-y">{data.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-4 py-3 text-sm">
              <div><span className="font-medium">{a.nome}</span>{a.patrimonio && <span className="text-muted-foreground"> · Patrimônio {a.patrimonio}</span>}{a.observacao && <p className="text-muted-foreground">{a.observacao}</p>}</div>
              <Del onClick={() => del(a.id)} />
            </li>))}
          </ul>)}
      </Card>
    </div>
  );
}

export function Multas({ veiculoId }: { veiculoId: string }) {
  const qc = useQueryClient();
  const { data = [] } = useLista("multas", veiculoId);
  const vazio = { data_hora: "", local: "", motorista: "", valor: "", infracao: "" };
  const [f, setF] = useState(vazio);
  const add = async () => {
    if (!f.data_hora) return toast.error("Informe data e hora");
    const { error } = await supabase.from("multas").insert({ veiculo_id: veiculoId, data_hora: new Date(f.data_hora).toISOString(), local: f.local.slice(0, 200) || null, motorista: f.motorista.slice(0, 120) || null, valor: f.valor ? Number(f.valor) : null, infracao: f.infracao.slice(0, 300) || null });
    if (error) return toast.error(error.message);
    toast.success("Multa registrada"); setF(vazio); qc.invalidateQueries({ queryKey: ["multas"] });
  };
  const del = async (id: string) => { if (confirm("Excluir multa?")) { await supabase.from("multas").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["multas"] }); } };
  const total = data.reduce((s, m) => s + Number(m.valor ?? 0), 0);
  return (
    <div className="space-y-6">
      <Card title="Registrar multa">
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Data e hora"><Input type="datetime-local" value={f.data_hora} onChange={(e) => setF({ ...f, data_hora: e.target.value })} /></F>
          <F label="Local"><Input maxLength={200} value={f.local} onChange={(e) => setF({ ...f, local: e.target.value })} /></F>
          <F label="Motorista"><Input maxLength={120} value={f.motorista} onChange={(e) => setF({ ...f, motorista: e.target.value })} /></F>
          <F label="Valor (R$)"><Input type="number" step="0.01" min={0} value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} /></F>
          <F label="Qual multa (infração)" full><Input maxLength={300} value={f.infracao} onChange={(e) => setF({ ...f, infracao: e.target.value })} /></F>
        </div>
        <div className="mt-4 flex justify-end"><Button onClick={add}>Registrar</Button></div>
      </Card>
      <Card title={`Multas · total ${fmtMoney(total)}`}>
        {data.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma multa.</p> : (
          <ul className="divide-y">{data.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-4 py-3 text-sm">
              <div>
                <div className="font-medium">{m.infracao || "Multa"}</div>
                <div className="text-muted-foreground">{new Date(m.data_hora).toLocaleString("pt-BR")} · {m.local || "—"} · Motorista: {m.motorista || "—"}</div>
              </div>
              <div className="flex items-center gap-3">{fmtMoney(m.valor)}<Del onClick={() => del(m.id)} /></div>
            </li>))}
          </ul>)}
      </Card>
    </div>
  );
}

/** Salva o arquivo escolhendo a pasta (rede interna) quando o navegador permite; senão, baixa normalmente. */
async function salvarNaPasta(blob: Blob, nome: string) {
  const w = window as unknown as { showSaveFilePicker?: (o: { suggestedName: string }) => Promise<{ createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }> }> };
  if (w.showSaveFilePicker) {
    try {
      const h = await w.showSaveFilePicker({ suggestedName: nome });
      const s = await h.createWritable(); await s.write(blob); await s.close();
      toast.success("Arquivo salvo"); return;
    } catch (e) { if ((e as Error).name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = nome; a.click();
  URL.revokeObjectURL(url);
}

export function Arquivos({ veiculoId, categoria }: { veiculoId: string; categoria: "checklist" | "documento" }) {
  const qc = useQueryClient();
  const { data = [] } = useLista("arquivos_veiculo", veiculoId, categoria);
  const [enviando, setEnviando] = useState(false);
  const fotos = categoria === "checklist";

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setEnviando(true);
    const { data: u } = await supabase.auth.getUser();
    for (const file of Array.from(files)) {
      const caminho = `${u.user!.id}/${veiculoId}/${categoria}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("frota").upload(caminho, file);
      if (up.error) { toast.error(up.error.message); continue; }
      await supabase.from("arquivos_veiculo").insert({ veiculo_id: veiculoId, categoria, nome: file.name.slice(0, 200), caminho });
    }
    setEnviando(false); toast.success("Enviado"); qc.invalidateQueries({ queryKey: ["arquivos_veiculo"] });
  };
  const baixar = async (caminho: string, nome: string) => {
    const { data: b, error } = await supabase.storage.from("frota").download(caminho);
    if (error) return toast.error(error.message);
    await salvarNaPasta(b, nome);
  };
  const del = async (id: string, caminho: string) => {
    if (!confirm("Excluir arquivo?")) return;
    await supabase.storage.from("frota").remove([caminho]);
    await supabase.from("arquivos_veiculo").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["arquivos_veiculo"] });
  };

  return (
    <div className="space-y-6">
      <Card title={fotos ? "Fotos do checklist" : "Documentos do veículo"}>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-sm text-muted-foreground hover:bg-muted">
          <Upload className="h-4 w-4" /> {enviando ? "Enviando…" : fotos ? "Adicionar fotos" : "Adicionar documentos (PDF, imagem…)"}
          <input type="file" multiple hidden accept={fotos ? "image/*" : undefined} disabled={enviando} onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
        </label>
        {fotos && <p className="mt-2 text-xs text-muted-foreground">O questionário do checklist entra aqui quando você enviar as perguntas.</p>}
      </Card>
      <Card>
        {data.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum arquivo.</p> : (
          <ul className="divide-y">{data.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-4 py-3 text-sm">
              <div><div className="font-medium">{a.nome}</div><div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</div></div>
              <div className="flex items-center gap-3">
                <Button size="sm" variant="outline" onClick={() => baixar(a.caminho, a.nome)}><Download className="mr-1 h-4 w-4" />Salvar na pasta</Button>
                <Del onClick={() => del(a.id, a.caminho)} />
              </div>
            </li>))}
          </ul>)}
      </Card>
    </div>
  );
}
