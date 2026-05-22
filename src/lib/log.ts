import { supabase } from "@/integrations/supabase/client";

export async function recordLog(params: {
  acao: "criar" | "editar" | "excluir";
  entidade: string;
  entidade_id?: string;
  detalhes?: Record<string, unknown>;
}) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", data.user.id)
    .maybeSingle();
  await supabase.from("logs_alteracoes").insert({
    user_id: data.user.id,
    user_nome: profile?.nome ?? data.user.email ?? null,
    acao: params.acao,
    entidade: params.entidade,
    entidade_id: params.entidade_id ?? null,
    detalhes: (params.detalhes ?? null) as never,
  });
}
