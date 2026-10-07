import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { projecaoKm } from "./fleet";

export type AnaliseVeiculo = {
  veiculo_id: string;
  risco: "alto" | "medio" | "baixo";
  motivo: string;
  acoes: string[];
};
export type AnaliseRisco = { resumo: string; veiculos: AnaliseVeiculo[] };

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["resumo", "veiculos"],
  properties: {
    resumo: { type: "string" },
    veiculos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["veiculo_id", "risco", "motivo", "acoes"],
        properties: {
          veiculo_id: { type: "string" },
          risco: { type: "string", enum: ["alto", "medio", "baixo"] },
          motivo: { type: "string" },
          acoes: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

export const analisarRisco = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AnaliseRisco> => {
    const sb = context.supabase;
    const { data: allowed, error: roleError } = await sb.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !allowed) throw new Error("Somente o administrador pode solicitar uma análise.");
    const [v, l, e] = await Promise.all([
      sb.from("veiculos").select("*"),
      sb.from("leituras_km").select("*").order("mes"),
      sb.from("equipes").select("id, nome"),
    ]);
    if (v.error) throw new Error(v.error.message);
    const equipes = new Map((e.data ?? []).map((x) => [x.id, x.nome]));
    const dados = (v.data ?? []).map((x) => {
      const lt = (l.data ?? []).filter((r) => r.veiculo_id === x.id);
      return {
        veiculo_id: x.id,
        placa: x.placa,
        modelo: x.modelo,
        equipe: x.equipe_id ? equipes.get(x.equipe_id) ?? null : null,
        km_mensal_contratado: x.km_mensal_contratado,
        inicio_contrato: x.inicio_contrato,
        fim_contrato: x.fim_contrato,
        leituras_mensais: lt.map((r) => ({ mes: r.mes.slice(0, 7), km: r.km })),
        projecao: projecaoKm(x, lt),
      };
    });
    if (dados.length === 0) return { resumo: "Nenhum veículo cadastrado.", veiculos: [] };

    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) throw new Error("Chave de IA não configurada.");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText, Output, jsonSchema } = await import("ai");
    const { createLovableAiGatewayRunIdFetch } = await import("./run-id.server");
    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      instructions:
        "Você é analista de frota corporativa. Para cada veículo, avalie o risco de exceder o limite de km contratado até o fim do contrato, usando leituras mensais (odômetro acumulado) e a projeção calculada. Classifique risco alto/medio/baixo, explique o motivo em 1-2 frases objetivas com números, e recomende de 1 a 3 ações práticas (ex.: rodízio entre equipes, renegociar franquia, restringir uso, revisar rotas). Sem dados suficientes = baixo com ação de registrar leituras. Responda em português do Brasil. Use exatamente os veiculo_id recebidos.",
      messages: [{ role: "user", content: JSON.stringify({ hoje: new Date().toISOString().slice(0, 10), veiculos: dados }) }],
      output: Output.object({ schema: jsonSchema<AnaliseRisco>(schema as never) }),
      maxRetries: 0,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    try {
      return (await result.output) as AnaliseRisco;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 429) throw new Error("Muitas solicitações à IA. Tente novamente em instantes.");
      if (status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
      if (status === 403) throw new Error("Acesso à IA bloqueado para este workspace.");
      console.error(err);
      throw new Error("Não foi possível concluir a análise de IA.");
    }
  });
