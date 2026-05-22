import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { recordLog } from "@/lib/log";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/distritos")({
  component: DistritosPage,
});

const schema = z.object({
  nome: z.string().trim().min(2).max(120),
  sigla: z.string().trim().min(1).max(20).regex(/^[A-Za-z0-9 _-]+$/),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  descricao: z.string().max(500).optional().nullable(),
  responsavel: z.string().max(120).optional().nullable(),
  telefone: z.string().max(40).optional().nullable(),
  email: z.string().email().max(255).optional().or(z.literal("")).nullable(),
  status: z.enum(["ativo", "inativo"]),
});

type Distrito = {
  id: string;
  nome: string;
  sigla: string;
  cor: string;
  descricao: string | null;
  responsavel: string | null;
  telefone: string | null;
  email: string | null;
  status: "ativo" | "inativo";
  created_at: string;
};

function DistritosPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin_geral");
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Distrito | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Distrito | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["distritos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distritos")
        .select("*")
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return data as Distrito[];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.filter(
      (d) =>
        d.nome.toLowerCase().includes(q) ||
        d.sigla.toLowerCase().includes(q) ||
        (d.responsavel ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(d: Distrito) {
    setEditing(d);
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      nome: String(fd.get("nome") ?? "").trim(),
      sigla: String(fd.get("sigla") ?? "").trim().toUpperCase(),
      cor: String(fd.get("cor") ?? "#0F766E"),
      descricao: (fd.get("descricao") as string) || null,
      responsavel: (fd.get("responsavel") as string) || null,
      telefone: (fd.get("telefone") as string) || null,
      email: ((fd.get("email") as string) || "") || null,
      status: (fd.get("status") as "ativo" | "inativo") || "ativo",
    };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const data = { ...parsed.data, email: parsed.data.email || null };
    if (editing) {
      const { error } = await supabase.from("distritos").update(data).eq("id", editing.id);
      if (error) return toast.error(error.message);
      await recordLog({ acao: "editar", entidade: "distritos", entidade_id: editing.id });
      toast.success("Distrito atualizado");
    } else {
      const { data: ins, error } = await supabase
        .from("distritos")
        .insert(data)
        .select()
        .single();
      if (error) return toast.error(error.message);
      await recordLog({ acao: "criar", entidade: "distritos", entidade_id: ins.id });
      toast.success("Distrito criado");
    }
    setOpen(false);
    void qc.invalidateQueries({ queryKey: ["distritos"] });
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const { error } = await supabase
      .from("distritos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", toDelete.id);
    if (error) return toast.error(error.message);
    await recordLog({ acao: "excluir", entidade: "distritos", entidade_id: toDelete.id });
    toast.success("Distrito removido");
    setToDelete(null);
    void qc.invalidateQueries({ queryKey: ["distritos"] });
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  return (
    <div>
      <PageHeader
        title="Distritos Sanitários"
        subtitle="Cadastro e gerenciamento dos distritos sanitários"
        actions={
          isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNew}>
                  <Plus className="mr-2 h-4 w-4" /> Novo distrito
                </Button>
              </DialogTrigger>
              <DistritoDialog editing={editing} onSubmit={handleSave} />
            </Dialog>
          )
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome, sigla ou responsável"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Distrito</TableHead>
                  <TableHead>Sigla</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum distrito encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: d.cor }}
                          />
                          <span className="font-medium">{d.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>{d.sigla}</TableCell>
                      <TableCell>{d.responsavel ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.email ?? d.telefone ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.status === "ativo" ? "default" : "secondary"}>
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin && (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setToDelete(d)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover distrito?</AlertDialogTitle>
            <AlertDialogDescription>
              O distrito "{toDelete?.nome}" será marcado como removido. Esta ação pode
              ser revertida pelo administrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DistritoDialog({
  editing,
  onSubmit,
}: {
  editing: Distrito | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar distrito" : "Novo distrito"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="grid gap-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 grid gap-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={editing?.nome ?? ""} required maxLength={120} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sigla">Sigla *</Label>
            <Input id="sigla" name="sigla" defaultValue={editing?.sigla ?? ""} required maxLength={20} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea id="descricao" name="descricao" defaultValue={editing?.descricao ?? ""} maxLength={500} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="responsavel">Responsável</Label>
            <Input id="responsavel" name="responsavel" defaultValue={editing?.responsavel ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cor">Cor padrão</Label>
            <Input id="cor" name="cor" type="color" defaultValue={editing?.cor ?? "#0F766E"} className="h-9 p-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" name="telefone" defaultValue={editing?.telefone ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={editing?.email ?? ""} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={editing?.status ?? "ativo"}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="submit">{editing ? "Salvar alterações" : "Criar distrito"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
