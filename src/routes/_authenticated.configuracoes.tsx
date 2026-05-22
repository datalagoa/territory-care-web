import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { profile } = useAuth();
  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Identidade visual e preferências do sistema"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Identidade do sistema</h2>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex items-center gap-3 rounded-md border border-border p-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">GeoSaúde Territorial</p>
                <p className="text-xs text-muted-foreground">
                  Gestão Territorial Inteligente da Atenção Básica
                </p>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Nome do sistema</Label>
              <Input defaultValue="GeoSaúde Territorial" disabled />
            </div>
            <div className="grid gap-1.5">
              <Label>Subtítulo</Label>
              <Input
                defaultValue="Gestão Territorial Inteligente da Atenção Básica"
                disabled
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Personalização de logo, cores e tema chega na próxima iteração.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Seu perfil</h2>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input defaultValue={profile?.nome ?? ""} disabled />
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input defaultValue={profile?.email ?? ""} disabled />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
