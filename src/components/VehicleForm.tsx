import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { Veiculo } from "@/lib/fleet";

export type VeiculoInput = Partial<Omit<Veiculo, "id" | "user_id" | "created_at">>;

const num = (v: string) => (v === "" ? null : Number(v));

export function useEquipes() {
  return useQuery({
    queryKey: ["equipes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipes").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function VehicleForm({ initial, onSubmit, saving }: { initial?: VeiculoInput; onSubmit: (v: VeiculoInput) => void; saving?: boolean }) {
  const [v, setV] = useState<VeiculoInput>({ rastreado: false, km_inicial: 0, intervalo_oleo_km: 10000, intervalo_pneu_km: 40000, ...initial });
  const { data: equipes = [] } = useEquipes();
  const set = (k: keyof VeiculoInput, val: unknown) => setV((p) => ({ ...p, [k]: val }));
  const isNew = !initial?.placa;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const placa = (v.placa ?? "").trim().toUpperCase();
        if (!placa || placa.length > 10) return;
        onSubmit({ ...v, placa, km_atual: v.km_atual ?? v.km_inicial ?? 0 });
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <F label="Placa *"><Input required maxLength={10} value={v.placa ?? ""} onChange={(e) => set("placa", e.target.value)} /></F>
      <F label="Modelo"><Input maxLength={80} value={v.modelo ?? ""} onChange={(e) => set("modelo", e.target.value)} /></F>
      <F label="Cor"><Input maxLength={30} value={v.cor ?? ""} onChange={(e) => set("cor", e.target.value)} /></F>
      {isNew && (
        <F label="Equipe">
          <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={v.equipe_id ?? ""} onChange={(e) => set("equipe_id", e.target.value || null)}>
            <option value="">Sem equipe</option>
            {equipes.map((q) => <option key={q.id} value={q.id}>{q.nome}</option>)}
          </select>
        </F>
      )}
      <div className="flex items-center gap-3 sm:col-span-2">
        <Switch checked={!!v.rastreado} onCheckedChange={(c) => set("rastreado", c)} /> <Label>Veículo rastreado</Label>
      </div>
      <F label="Km inicial (contratação)"><Input type="number" min={0} value={v.km_inicial ?? ""} onChange={(e) => set("km_inicial", num(e.target.value) ?? 0)} /></F>
      <F label="Km mensal contratado"><Input type="number" min={0} value={v.km_mensal_contratado ?? ""} onChange={(e) => set("km_mensal_contratado", num(e.target.value))} /></F>
      <F label="Início do contrato"><Input type="date" value={v.inicio_contrato ?? ""} onChange={(e) => set("inicio_contrato", e.target.value || null)} /></F>
      <F label="Fim do contrato"><Input type="date" value={v.fim_contrato ?? ""} onChange={(e) => set("fim_contrato", e.target.value || null)} /></F>
      <F label="Valor do contrato (opcional)"><Input type="number" step="0.01" min={0} value={v.valor_contrato ?? ""} onChange={(e) => set("valor_contrato", num(e.target.value))} /></F>
      <div />
      <F label="Intervalo troca de óleo (km)"><Input type="number" min={0} value={v.intervalo_oleo_km ?? ""} onChange={(e) => set("intervalo_oleo_km", num(e.target.value))} /></F>
      <F label="Intervalo troca de pneu (km)"><Input type="number" min={0} value={v.intervalo_pneu_km ?? ""} onChange={(e) => set("intervalo_pneu_km", num(e.target.value))} /></F>
      <F label="Condições do contrato" full><Textarea maxLength={2000} value={v.condicoes ?? ""} onChange={(e) => set("condicoes", e.target.value)} /></F>
      <F label="Cobertura do seguro" full><Textarea maxLength={2000} value={v.cobertura_seguro ?? ""} onChange={(e) => set("cobertura_seguro", e.target.value)} /></F>
      <div className="sm:col-span-2 flex justify-end"><Button disabled={saving}>Salvar</Button></div>
    </form>
  );
}

export function F({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}><Label>{label}</Label>{children}</div>;
}
