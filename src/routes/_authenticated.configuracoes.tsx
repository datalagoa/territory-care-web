import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Activity, Save, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth, roleLabel } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { profile, roles, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState(profile?.nome ?? "");
  const [telefone, setTelefone] = useState(profile?.telefone ?? "");

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nome: nome.trim(), telefone: telefone.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
  }

  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Identidade visual, perfil e preferências"
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
          <CardContent>
            <form onSubmit={saveProfile} className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={120}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Email</Label>
                <Input defaultValue={profile?.email ?? ""} disabled />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  maxLength={40}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Perfil de acesso</Label>
                <div className="flex flex-wrap gap-1">
                  {roles.length === 0 ? (
                    <Badge variant="outline">sem perfil</Badge>
                  ) : (
                    roles.map((r) => (
                      <Badge key={r} variant="secondary" className="gap-1">
                        <ShieldCheck className="h-3 w-3" /> {roleLabel(r)}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar perfil"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
