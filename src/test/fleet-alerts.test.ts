import { describe, expect, it } from "vitest";
import { alertas, kmMensal, type Veiculo } from "@/lib/fleet";

const vehicle = { id: "v", inicio_contrato: "2026-01-01", km_inicial: 1000, km_atual: 2000, km_mensal_contratado: 1000, intervalo_oleo_km: 2000, intervalo_pneu_km: 4000 } as Veiculo;
describe("Alertas mensais e revisão", () => {
  it("avisa ao ultrapassar o limite mensal", () => {
    const a = alertas(vehicle, [], [{ veiculo_id: "v", mes: "2026-01-01", km: 2200 }]);
    expect(a.some((x) => x.texto.includes("Km mensal excedido"))).toBe(true);
  });
  it("não avisa quando dentro do limite", () => {
    expect(alertas(vehicle, [], [{ veiculo_id: "v", mes: "2026-01-01", km: 2000 }]).some((x) => x.texto.includes("Km mensal excedido"))).toBe(false);
  });
  it("não considera uma lacuna de vários meses como um mês", () => {
    expect(kmMensal(vehicle, [{ veiculo_id: "v", mes: "2026-03-01", km: 4000 }])).toEqual([]);
  });
  it("considera meses consecutivos e ignora outros veículos", () => {
    expect(kmMensal(vehicle, [{ veiculo_id: "v", mes: "2026-02-01", km: 2000 }, { veiculo_id: "v", mes: "2026-03-01", km: 3500 }, { veiculo_id: "outro", mes: "2026-04-01", km: 9999 }])).toEqual([{ mes: "2026-03-01", rodado: 1500 }]);
  });
  it("avisa a 1.000 km da troca", () => {
    expect(alertas(vehicle, []).some((x) => x.texto === "Troca de óleo em 1.000 km")).toBe(true);
  });
  it("avisa quando a troca venceu", () => {
    expect(alertas({ ...vehicle, km_atual: 3100 }, []).some((x) => x.tipo === "erro" && x.texto.includes("Troca de óleo vencida"))).toBe(true);
  });
});