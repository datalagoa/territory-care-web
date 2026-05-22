import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: () => (
    <div>
      <PageHeader title="Usuários" subtitle="Gestão de usuários e perfis de acesso" />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Construction className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold">Em construção</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Atribuição de perfis (Admin Geral, Gestor Distrital, Técnico, Visualizador) e
            vínculo a distritos já está garantida no backend via RLS.
          </p>
        </CardContent>
      </Card>
    </div>
  ),
});
