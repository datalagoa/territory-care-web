import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/areas")({
  component: AreasPage,
});

function AreasPage() {
  return (
    <div>
      <PageHeader
        title="Áreas Territoriais"
        subtitle="Delimitação territorial — preparada para integração GIS futura"
      />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Construction className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold">Estrutura GIS preparada</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            A tabela <code className="rounded bg-muted px-1.5 py-0.5 text-xs">areas_territoriais</code> já
            possui campo <code className="rounded bg-muted px-1.5 py-0.5 text-xs">geojson</code> (JSONB),
            relações com distrito/unidade/equipe, cor, população e famílias.
            A interface CRUD + visualização Leaflet chega na próxima fase no Cursor IA.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
