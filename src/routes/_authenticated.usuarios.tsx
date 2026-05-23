import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, UserCog, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, roleLabel, type AppRole } from "@/hooks/use-auth";
import { recordLog } from "@/lib/log";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
});

const ROLES: AppRole[] = ["admin_geral", "gestor_distrital", "tecnico", "visualizador"];

type Profile = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  distrito_id: string | null;
  status: "ativo" | "inativo";
  ultimo_acesso: string | null;
};

type Distrito = { id: string; nome: string; sigla: string };

function UsuariosPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin_geral");
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Profile | null>(null);

  const { data: distritos } = useQuery({
    queryKey: ["distritos-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distritos").select("id, nome, sigla").is("deleted_at", null).order("nome");
      if (error) throw error;
      return data as Distrito[];
    },
    enabled: isAdmin,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, nome, email, telefone, distrito_id, status, ultimo_acesso")
        .order("nome");
      if (error) throw error;
      const { data: rolesRows } = await supabase.from("user_roles").select("user_id, role");
      const roleMap = new Map<string, AppRole[]>();
      (rolesRows ?? []).forEach((r) => {
        const list = roleMap.get(r.user_id) ?? [];
        list.push(r.role as AppRole);
        roleMap.set(r.user_id, list);
      });
      return (profiles as Profile[]).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
    },
    enabled: isAdmin,
  });

  const distritoMap = useMemo(() => new Map((distritos ?? []).map((d) => [d.id, d])), [distritos]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    if (!q) return data;
    return data.filter((u) =>
      u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [data, search]);

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Usuários" subtitle="Gestão de usuários e perfis" />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <ShieldAlert className="h-10 w-10 text-destructive" />
            <h2 className="text-lg font-semibold">Acesso restrito</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Apenas o Administrador Geral pode gerenciar usuários e perfis de acesso.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function saveUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    const role = fd.get("role") as AppRole;
    const distrito_id = (fd.get("distrito_id") as string) || null;
    const status = (fd.get("status") as "ativo" | "inativo") || "ativo";

    const { error: pErr } = await supabase
      .from("profiles")
      .update({ distrito_id, status })
      .eq("id", editing.id);
    if (pErr) return toast.error(pErr.message);

    const { error: dErr } = await supabase.from("user_roles").delete().eq("user_id", editing.id);
    if (dErr) return toast.error(dErr.message);
    const { error: iErr } = await supabase.from("user_roles").insert({ user_id: editing.id, role });
    if (iErr) return toast.error(iErr.message);

    await recordLog({
      acao: "editar",
      entidade: "profiles",
      entidade_id: editing.id,
      detalhes: { role, distrito_id, status },
    });
    toast.success("Usuário atualizado");
    setEditing(null);
    void qc.invalidateQueries({ queryKey: ["usuarios"] });
  }

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle="Atribuição de perfis e distritos"
      />
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome ou email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Distrito</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => {
                    const d = u.distrito_id ? distritoMap.get(u.distrito_id) : null;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="font-medium">{u.nome}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.length === 0 ? (
                              <Badge variant="outline">sem perfil</Badge>
                            ) : (
                              u.roles.map((r) => (
                                <Badge key={r} variant="secondary">{roleLabel(r)}</Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{d ? `${d.sigla} — ${d.nome}` : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={u.status === "ativo" ? "default" : "secondary"}>
                            {u.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => setEditing(u)}>
                            <UserCog className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={saveUser} className="grid gap-3">
              <div className="rounded-md border border-border p-3">
                <p className="font-medium">{editing.nome}</p>
                <p className="text-xs text-muted-foreground">{editing.email}</p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="role">Perfil de acesso *</Label>
                <Select name="role" defaultValue={(editing as Profile & { roles: AppRole[] }).roles[0] ?? "visualizador"}>
                  <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="distrito_id">Distrito vinculado</Label>
                <Select name="distrito_id" defaultValue={editing.distrito_id ?? ""}>
                  <SelectTrigger id="distrito_id"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {(distritos ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.sigla} — {d.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Define o escopo de dados visíveis (RLS) para Gestor e Técnico.
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={editing.status}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit">Salvar alterações</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
