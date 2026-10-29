import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { AdminOnly } from "@/components/Access";
import { Box } from "@/components/Box";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [
    { title: "Clientes e endereços — Frota" }, { name: "description", content: "Cadastro de clientes e dos endereços atendidos pela frota." },
    { property: "og:title", content: "Clientes e endereços — Frota" }, { property: "og:description", content: "Cadastro de clientes e dos endereços atendidos pela frota." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AppShell><Clientes /></AppShell>,
});

type Excluir = { id: string; nome: string; enderecos: number; etapa: 1 | 2 } | null;

function Clientes() {
  const qc = useQueryClient();
  const [cli, setCli] = useState({ nome: "", documento: "", telefone: "", email: "" });
  const [end, setEnd] = useState({ cliente_id: "", descricao: "", logradouro: "", cidade: "", uf: "", cep: "" });
  const [excluir, setExcluir] = useState<Excluir>(null);
  const { data } = useQuery({
    queryKey: ["clientes-enderecos"],
    queryFn: async () => {
      const [c, e] = await Promise.all([
        supabase.from("clientes").select("*").order("nome"),
        supabase.from("enderecos").select("*").order("created_at"),
      ]);
      if (c.error) throw c.error;
      if (e.error) throw e.error;
      return { clientes: c.data, enderecos: e.data };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["clientes-enderecos"] });
  const addCli = useMutation({
    mutationFn: async () => {
      if (!cli.nome.trim()) throw new Error("Informe o nome do cliente");
      const { error } = await supabase.from("clientes").insert({ nome: cli.nome.trim(), documento: cli.documento.trim() || null, telefone: cli.telefone.trim() || null, email: cli.email.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => { setCli({ nome: "", documento: "", telefone: "", email: "" }); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const addEnd = useMutation({
    mutationFn: async () => {
      if (!end.logradouro.trim()) throw new Error("Informe o endereço");
      const { error } = await supabase.from("enderecos").insert({ cliente_id: end.cliente_id || null, descricao: end.descricao.trim() || null, logradouro: end.logradouro.trim(), cidade: end.cidade.trim() || null, uf: end.uf.trim().toUpperCase() || null, cep: end.cep.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => { setEnd({ cliente_id: end.cliente_id, descricao: "", logradouro: "", cidade: "", uf: "", cep: "" }); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delCli = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("clientes").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Cliente excluído. Os endereços foram mantidos sem cliente."); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delEnd = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("enderecos").delete().eq("id", id); if (error) throw error; },
    onSuccess: refresh,
  });
  const nomeCliente = (id: string | null) => data?.clientes.find((c) => c.id === id)?.nome;

  return <div className="space-y-6">
    <h1 className="text-3xl font-semibold">Clientes e endereços</h1>
    <Box title="Clientes">
      <AdminOnly><form onSubmit={(e) => { e.preventDefault(); addCli.mutate(); }} className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Nome / razão social" maxLength={120} value={cli.nome} onChange={(e) => setCli({ ...cli, nome: e.target.value })} />
        <Input className="max-w-[11rem]" placeholder="CNPJ / CPF" maxLength={20} value={cli.documento} onChange={(e) => setCli({ ...cli, documento: e.target.value })} />
        <Input className="max-w-[11rem]" placeholder="Telefone" maxLength={30} value={cli.telefone} onChange={(e) => setCli({ ...cli, telefone: e.target.value })} />
        <Input className="max-w-[14rem]" type="email" placeholder="E-mail" maxLength={120} value={cli.email} onChange={(e) => setCli({ ...cli, email: e.target.value })} />
        <Button disabled={addCli.isPending}>Adicionar cliente</Button>
      </form></AdminOnly>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-2">Cliente</th><th>Documento</th><th>Contato</th><th>Endereços</th><th /></tr></thead><tbody>
        {data?.clientes.map((c) => { const n = data.enderecos.filter((e) => e.cliente_id === c.id).length; return <tr key={c.id} className="border-b">
          <td className="py-2 font-medium">{c.nome}</td><td>{c.documento ?? "—"}</td><td>{[c.telefone, c.email].filter(Boolean).join(" · ") || "—"}</td><td>{n}</td>
          <td className="text-right"><AdminOnly><button aria-label="Excluir cliente" onClick={() => setExcluir({ id: c.id, nome: c.nome, enderecos: n, etapa: 1 })} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></AdminOnly></td></tr>; })}
        {!data?.clientes.length && <tr><td colSpan={5} className="py-3 text-muted-foreground">Nenhum cliente.</td></tr>}
      </tbody></table></div>
    </Box>
    <Box title="Endereços">
      <AdminOnly><form onSubmit={(e) => { e.preventDefault(); addEnd.mutate(); }} className="mb-4 flex flex-wrap gap-2">
        <select aria-label="Cliente" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={end.cliente_id} onChange={(e) => setEnd({ ...end, cliente_id: e.target.value })}>
          <option value="">Sem cliente</option>{data?.clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <Input className="max-w-[10rem]" placeholder="Identificação (ex.: Matriz)" maxLength={60} value={end.descricao} onChange={(e) => setEnd({ ...end, descricao: e.target.value })} />
        <Input className="max-w-xs" placeholder="Rua, número, bairro" maxLength={200} value={end.logradouro} onChange={(e) => setEnd({ ...end, logradouro: e.target.value })} />
        <Input className="max-w-[10rem]" placeholder="Cidade" maxLength={80} value={end.cidade} onChange={(e) => setEnd({ ...end, cidade: e.target.value })} />
        <Input className="w-16" placeholder="UF" maxLength={2} value={end.uf} onChange={(e) => setEnd({ ...end, uf: e.target.value })} />
        <Input className="max-w-[8rem]" placeholder="CEP" maxLength={9} value={end.cep} onChange={(e) => setEnd({ ...end, cep: e.target.value })} />
        <Button disabled={addEnd.isPending}>Adicionar endereço</Button>
      </form></AdminOnly>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-2">Endereço</th><th>Cidade/UF</th><th>CEP</th><th>Cliente</th><th /></tr></thead><tbody>
        {data?.enderecos.map((e) => <tr key={e.id} className="border-b">
          <td className="py-2">{e.descricao ? <b>{e.descricao}: </b> : null}{e.logradouro}</td><td>{[e.cidade, e.uf].filter(Boolean).join("/") || "—"}</td><td>{e.cep ?? "—"}</td>
          <td>{nomeCliente(e.cliente_id) ?? <span className="text-muted-foreground">Sem cliente</span>}</td>
          <td className="text-right"><AdminOnly><button aria-label="Excluir endereço" onClick={() => confirm("Excluir este endereço?") && delEnd.mutate(e.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></AdminOnly></td></tr>)}
        {!data?.enderecos.length && <tr><td colSpan={5} className="py-3 text-muted-foreground">Nenhum endereço.</td></tr>}
      </tbody></table></div>
    </Box>
    <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{excluir?.etapa === 1 ? `Excluir o cliente ${excluir?.nome}?` : "Confirmação final"}</AlertDialogTitle>
          <AlertDialogDescription>{excluir?.etapa === 1
            ? `Este cliente tem ${excluir?.enderecos} endereço(s) associado(s). Os endereços NÃO serão apagados, ficarão como "Sem cliente".`
            : `Tem certeza absoluta? A exclusão de ${excluir?.nome} não pode ser desfeita.`}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(ev) => {
            if (!excluir) return;
            if (excluir.etapa === 1) { ev.preventDefault(); setExcluir({ ...excluir, etapa: 2 }); }
            else delCli.mutate(excluir.id);
          }}>{excluir?.etapa === 1 ? "Continuar" : "Excluir definitivamente"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
