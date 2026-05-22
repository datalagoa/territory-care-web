import { createFileRoute } from "@tanstack/react-router";
import { FileBarChart } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

const reports = [
  { title: "UBS por Distrito", desc: "Quantitativo de unidades por distrito sanitário." },
  { title: "Equipes por Unidade", desc: "Distribuição de equipes nas unidades." },
  { title: "Áreas por UBS", desc: "Áreas territoriais sob responsabilidade de cada unidade." },
  { title: "Cobertura Territorial", desc: "População e famílias cobertas por área." },
  { title: "Usuários Ativos", desc: "Acessos recentes ao sistema." },
];

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: () => (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Exportação em PDF e Excel — em desenvolvimento"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <Card key={r.title}>
            <CardContent className="flex gap-3 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileBarChart className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium">{r.title}</h3>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  ),
});
