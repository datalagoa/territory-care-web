import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Activity, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const credSchema = z.object({
  email: z.string().email("Email inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(128),
});

const signupSchema = credSchema.extend({
  nome: z.string().trim().min(2, "Informe seu nome").max(120),
});

function LoginPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/dashboard", replace: true });
  }, [session, loading, navigate]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = credSchema.safeParse({
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bem-vindo de volta!");
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      nome: fd.get("nome"),
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome: parsed.data.nome },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada! Verifique seu email para confirmar.");
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Falha no Google Sign-In");
      setBusy(false);
    }
  }

  async function handleReset() {
    const email = prompt("Informe seu email para recuperação:");
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) toast.error(error.message);
    else toast.success("Email de recuperação enviado.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(at_top,var(--accent)_0%,var(--background)_60%)] px-4">
      <div className="grid w-full max-w-5xl items-center gap-8 md:grid-cols-2">
        <div className="hidden flex-col gap-6 md:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-elevated)]">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">GeoSaúde Territorial</h1>
              <p className="text-sm text-muted-foreground">
                Gestão Territorial Inteligente da Atenção Básica
              </p>
            </div>
          </div>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Cadastro de UBS/USF, distritos sanitários, equipes e áreas territoriais
            do Distrito Sanitário Lagoa — Campo Grande/MS.
          </p>
          <ul className="grid gap-2 text-sm text-muted-foreground">
            <li>• Estrutura preparada para integração GIS (PostGIS + Leaflet)</li>
            <li>• Permissões por distrito e perfil</li>
            <li>• Auditoria e logs do sistema</li>
          </ul>
        </div>

        <Card className="border-border/60 shadow-[var(--shadow-elevated)]">
          <CardHeader>
            <div className="flex items-center gap-2 md:hidden">
              <Activity className="h-5 w-5 text-primary" />
              <span className="font-semibold">GeoSaúde Territorial</span>
            </div>
            <h2 className="text-xl font-semibold">Acessar o sistema</h2>
            <p className="text-sm text-muted-foreground">
              Entre com email/senha ou Google
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                <form onSubmit={handleLogin} className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="li-email">Email</Label>
                    <Input id="li-email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="li-pass">Senha</Label>
                    <Input id="li-pass" name="password" type="password" required autoComplete="current-password" />
                  </div>
                  <Button type="submit" disabled={busy} className="w-full">
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    Esqueci minha senha
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSignup} className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="su-nome">Nome completo</Label>
                    <Input id="su-nome" name="nome" required maxLength={120} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" name="email" type="email" required />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="su-pass">Senha</Label>
                    <Input id="su-pass" name="password" type="password" required minLength={6} />
                  </div>
                  <Button type="submit" disabled={busy} className="w-full">
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase text-muted-foreground">ou</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button
              variant="outline"
              onClick={handleGoogle}
              disabled={busy}
              className="w-full"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"/>
              </svg>
              Continuar com Google
            </Button>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              <Link to="/" className="hover:text-primary">Voltar ao início</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
