import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/equipes")({
  component: () => <Stub title="Equipes" subtitle="Cadastro de equipes vinculadas às unidades" />,
});

function Stub({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Construction className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold">Em construção</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            O esquema deste módulo já está pronto no banco. A interface chega na próxima
            iteração, seguindo o mesmo padrão visual de Distritos e Unidades.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
