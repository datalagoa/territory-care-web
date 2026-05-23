import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, FileBarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
});

type Row = Record<string, string | number>;

function toCSV(rows: Row[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(";"),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(";")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function RelatoriosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["relatorios"],
    queryFn: async () => {
      const [distritos, unidades, equipes, areas] = await Promise.all([
        supabase.from("distritos").select("id, nome, sigla").is("deleted_at", null),
        supabase.from("unidades").select("id, nome, tipo, distrito_id").is("deleted_at", null),
        supabase.from("equipes").select("id, nome, tipo, unidade_id, qtd_acs").is("deleted_at", null),
        supabase.from("areas_territoriais").select("id, nome, distrito_id, unidade_id, populacao_estimada, qtd_familias").is("deleted_at", null),
      ]);
      return {
        distritos: distritos.data ?? [],
        unidades: unidades.data ?? [],
        equipes: equipes.data ?? [],
        areas: areas.data ?? [],
      };
    },
  });

  const ubsPorDistrito = useMemo<Row[]>(() => {
    if (!data) return [];
    return data.distritos.map((d) => {
      const us = data.unidades.filter((u) => u.distrito_id === d.id);
      const unidadeIds = new Set(us.map((u) => u.id));
      const eq = data.equipes.filter((e) => unidadeIds.has(e.unidade_id));
      const ar = data.areas.filter((a) => a.distrito_id === d.id);
      return {
        Distrito: d.nome,
        Sigla: d.sigla,
        Unidades: us.length,
        Equipes: eq.length,
        Areas: ar.length,
        Populacao: ar.reduce((s, a) => s + (a.populacao_estimada ?? 0), 0),
        Familias: ar.reduce((s, a) => s + (a.qtd_familias ?? 0), 0),
      };
    });
  }, [data]);

  const equipesPorUnidade = useMemo<Row[]>(() => {
    if (!data) return [];
    return data.unidades.map((u) => {
      const d = data.distritos.find((x) => x.id === u.distrito_id);
      const eq = data.equipes.filter((e) => e.unidade_id === u.id);
      return {
        Unidade: u.nome,
        Tipo: u.tipo,
        Distrito: d?.sigla ?? "—",
        Equipes: eq.length,
        ACS: eq.reduce((s, e) => s + (e.qtd_acs ?? 0), 0),
      };
    });
  }, [data]);

  const cobertura = useMemo<Row[]>(() => {
    if (!data) return [];
    return data.areas.map((a) => {
      const d = data.distritos.find((x) => x.id === a.distrito_id);
      const u = data.unidades.find((x) => x.id === a.unidade_id);
      return {
        Area: a.nome,
        Distrito: d?.sigla ?? "—",
        Unidade: u?.nome ?? "—",
        Populacao: a.populacao_estimada,
        Familias: a.qtd_familias,
      };
    });
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Visão consolidada e exportação em CSV (Excel compatível)"
      />

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          <ReportCard
            title="UBS / USF por Distrito"
            description="Cobertura agregada por distrito sanitário"
            rows={ubsPorDistrito}
            filename="ubs-por-distrito.csv"
          />
          <ReportCard
            title="Equipes por Unidade"
            description="Distribuição de equipes e Agentes Comunitários"
            rows={equipesPorUnidade}
            filename="equipes-por-unidade.csv"
          />
          <ReportCard
            title="Cobertura Territorial"
            description="População e famílias por área de cobertura"
            rows={cobertura}
            filename="cobertura-territorial.csv"
          />
        </div>
      )}
    </div>
  );
}

function ReportCard({
  title, description, rows, filename,
}: {
  title: string;
  description: string;
  rows: Row[];
  filename: string;
}) {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileBarChart className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toCSV(rows, filename)}
          disabled={rows.length === 0}
        >
          <Download className="mr-2 h-4 w-4" /> CSV
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sem dados ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((h) => (<TableHead key={h}>{h}</TableHead>))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    {headers.map((h) => (
                      <TableCell key={h} className="text-sm">
                        {typeof r[h] === "number" ? (r[h] as number).toLocaleString("pt-BR") : r[h]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
