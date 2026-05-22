import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  MapPinned,
  Hospital,
  Users2,
  Map as MapIcon,
  UserCog,
  Users,
  Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

async function fetchDashboard() {
  const [distritos, unidades, equipes, areas, perfis, logs] = await Promise.all([
    supabase.from("distritos").select("id, nome, sigla, cor", { count: "exact" }),
    supabase.from("unidades").select("id, nome, distrito_id, tipo", { count: "exact" }),
    supabase.from("equipes").select("id", { count: "exact", head: true }),
    supabase.from("areas_territoriais").select("populacao_estimada", { count: "exact" }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("logs_alteracoes")
      .select("id, user_nome, acao, entidade, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const populacao = (areas.data ?? []).reduce(
    (sum, a) => sum + (a.populacao_estimada ?? 0),
    0,
  );

  // unidades por distrito
  const byDistrito = new Map<string, number>();
  (unidades.data ?? []).forEach((u) => {
    byDistrito.set(u.distrito_id, (byDistrito.get(u.distrito_id) ?? 0) + 1);
  });
  const chartData = (distritos.data ?? []).map((d) => ({
    name: d.sigla,
    unidades: byDistrito.get(d.id) ?? 0,
    fill: d.cor,
  }));

  return {
    counts: {
      distritos: distritos.count ?? 0,
      unidades: unidades.count ?? 0,
      equipes: equipes.count ?? 0,
      areas: areas.count ?? 0,
      usuarios: perfis.count ?? 0,
      populacao,
    },
    chartData,
    logs: logs.data ?? [],
    distritos: distritos.data ?? [],
  };
}

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral da territorialização da Atenção Básica"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          : (
            <>
              <StatCard label="Distritos" value={data!.counts.distritos} icon={<MapPinned className="h-5 w-5" />} />
              <StatCard label="UBS / USF" value={data!.counts.unidades} icon={<Hospital className="h-5 w-5" />} tone="secondary" />
              <StatCard label="Equipes" value={data!.counts.equipes} icon={<Users2 className="h-5 w-5" />} />
              <StatCard label="Áreas" value={data!.counts.areas} icon={<MapIcon className="h-5 w-5" />} tone="secondary" />
              <StatCard label="Usuários" value={data!.counts.usuarios} icon={<UserCog className="h-5 w-5" />} tone="muted" />
              <StatCard
                label="População Coberta"
                value={data!.counts.populacao.toLocaleString("pt-BR")}
                icon={<Users className="h-5 w-5" />}
                tone="warning"
              />
            </>
          )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-base font-semibold">Unidades por Distrito</h2>
            <p className="text-xs text-muted-foreground">
              Distribuição de UBS/USF nos distritos sanitários cadastrados.
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : data!.chartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data!.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <RTooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="unidades" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Mapa Territorial</h2>
            <p className="text-xs text-muted-foreground">
              Integração GIS prevista para próxima fase.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-[linear-gradient(135deg,var(--accent)_0%,var(--background)_100%)] text-center">
              <MapIcon className="mb-2 h-10 w-10 text-primary/60" />
              <p className="text-sm font-medium">Mapa interativo</p>
              <p className="text-xs text-muted-foreground">
                PostGIS + Leaflet (em breve)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Últimas alterações</h2>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40" />
            ) : data!.logs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma atividade registrada ainda.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data!.logs.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        <span className="font-medium">{l.user_nome ?? "Sistema"}</span>{" "}
                        <span className="text-muted-foreground">
                          {l.acao} em {l.entidade}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(l.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Distritos cadastrados</h2>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40" />
            ) : data!.distritos.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum distrito cadastrado.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data!.distritos.map((d) => (
                  <Badge
                    key={d.id}
                    variant="outline"
                    className="gap-2 border-border/60 px-3 py-1.5 text-sm"
                  >
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: d.cor }}
                    />
                    {d.nome} <span className="text-muted-foreground">({d.sigla})</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      Sem dados ainda — cadastre distritos e unidades.
    </div>
  );
}
