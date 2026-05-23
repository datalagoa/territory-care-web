import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Users2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { recordLog } from "@/lib/log";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/equipes")({
  component: EquipesPage,
});

const TIPOS = ["eSF", "eAP", "eSB", "NASF", "eCR", "Outros"] as const;

const schema = z.object({
  nome: z.string().trim().min(2).max(120),
  tipo: z.string().min(1).max(40),
  unidade_id: z.string().uuid(),
  codigo_esus: z.string().max(40).optional().nullable(),
  responsavel: z.string().max(120).optional().nullable(),
  qtd_acs: z.number().int().min(0).max(999),
  status: z.enum(["ativo", "inativo"]),
});

type Unidade = { id: string; nome: string; tipo: string; distrito_id: string };
type Equipe = {
  id: string;
  nome: string;
  tipo: string | null;
  unidade_id: string;
  codigo_esus: string | null;
  responsavel: string | null;
  qtd_acs: number;
  status: "ativo" | "inativo";
};

function EquipesPage() {
  const { canEdit } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterUnidade, setFilterUnidade] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Equipe | null>(null);
  const [toDelete, setToDelete] = useState<Equipe | null>(null);

  const { data: unidades } = useQuery({
    queryKey: ["unidades-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades")
        .select("id, nome, tipo, distrito_id")
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return data as Unidade[];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["equipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipes")
        .select("*")
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return data as Equipe[];
    },
  });

  const unidadeMap = useMemo(() => {
    const m = new Map<string, Unidade>();
    (unidades ?? []).forEach((u) => m.set(u.id, u));
    return m;
  }, [unidades]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.filter((e) => {
      if (filterUnidade !== "all" && e.unidade_id !== filterUnidade) return false;
      if (!q) return true;
      return (
        e.nome.toLowerCase().includes(q) ||
        (e.tipo ?? "").toLowerCase().includes(q) ||
        (e.codigo_esus ?? "").toLowerCase().includes(q) ||
        (e.responsavel ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, search, filterUnidade]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      nome: String(fd.get("nome") ?? "").trim(),
      tipo: String(fd.get("tipo") ?? "eSF"),
      unidade_id: String(fd.get("unidade_id") ?? ""),
      codigo_esus: (fd.get("codigo_esus") as string) || null,
      responsavel: (fd.get("responsavel") as string) || null,
      qtd_acs: Number(fd.get("qtd_acs") ?? 0),
      status: (fd.get("status") as "ativo" | "inativo") || "ativo",
    };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    if (editing) {
      const { error } = await supabase.from("equipes").update(parsed.data).eq("id", editing.id);
      if (error) return toast.error(error.message);
      await recordLog({ acao: "editar", entidade: "equipes", entidade_id: editing.id });
      toast.success("Equipe atualizada");
    } else {
      const { data: ins, error } = await supabase.from("equipes").insert(parsed.data).select().single();
      if (error) return toast.error(error.message);
      await recordLog({ acao: "criar", entidade: "equipes", entidade_id: ins.id });
      toast.success("Equipe criada");
    }
    setOpen(false);
    setEditing(null);
    void qc.invalidateQueries({ queryKey: ["equipes"] });
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const { error } = await supabase
      .from("equipes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", toDelete.id);
    if (error) return toast.error(error.message);
    await recordLog({ acao: "excluir", entidade: "equipes", entidade_id: toDelete.id });
    toast.success("Equipe removida");
    setToDelete(null);
    void qc.invalidateQueries({ queryKey: ["equipes"] });
  }

  return (
    <div>
      <PageHeader
        title="Equipes"
        subtitle="Equipes de saúde vinculadas às unidades"
        actions={
          canEdit && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditing(null)}>
                  <Plus className="mr-2 h-4 w-4" /> Nova equipe
                </Button>
              </DialogTrigger>
              <EquipeDialog editing={editing} unidades={unidades ?? []} onSubmit={handleSave} />
            </Dialog>
          )
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar equipe, código eSUS ou responsável"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterUnidade} onValueChange={setFilterUnidade}>
              <SelectTrigger className="w-[240px]"><SelectValue placeholder="Unidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas unidades</SelectItem>
                {(unidades ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipe</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-center">ACS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhuma equipe encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((e) => {
                    const u = unidadeMap.get(e.unidade_id);
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 font-medium">
                            <Users2 className="h-4 w-4 text-muted-foreground" />
                            {e.nome}
                          </div>
                          {e.codigo_esus && (
                            <p className="text-xs text-muted-foreground">eSUS: {e.codigo_esus}</p>
                          )}
                        </TableCell>
                        <TableCell><Badge variant="outline">{e.tipo ?? "—"}</Badge></TableCell>
                        <TableCell className="text-sm">{u?.nome ?? "—"}</TableCell>
                        <TableCell className="text-sm">{e.responsavel ?? "—"}</TableCell>
                        <TableCell className="text-center font-medium">{e.qtd_acs}</TableCell>
                        <TableCell>
                          <Badge variant={e.status === "ativo" ? "default" : "secondary"}>
                            {e.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canEdit && (
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setEditing(e); setOpen(true); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setToDelete(e)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
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

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              "{toDelete?.nome}" será marcada como removida.
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

function EquipeDialog({
  editing, unidades, onSubmit,
}: {
  editing: Equipe | null;
  unidades: Unidade[];
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => unknown;
}) {
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar equipe" : "Nova equipe"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="grid gap-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 grid gap-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={editing?.nome ?? ""} required maxLength={120} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tipo">Tipo *</Label>
            <Select name="tipo" defaultValue={editing?.tipo ?? "eSF"}>
              <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="unidade_id">Unidade *</Label>
          <Select name="unidade_id" defaultValue={editing?.unidade_id}>
            <SelectTrigger id="unidade_id"><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
            <SelectContent>
              {unidades.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="codigo_esus">Código eSUS / INE</Label>
            <Input id="codigo_esus" name="codigo_esus" defaultValue={editing?.codigo_esus ?? ""} maxLength={40} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="qtd_acs">Qtd. ACS</Label>
            <Input id="qtd_acs" name="qtd_acs" type="number" min={0} max={999} defaultValue={editing?.qtd_acs ?? 0} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="responsavel">Responsável</Label>
            <Input id="responsavel" name="responsavel" defaultValue={editing?.responsavel ?? ""} maxLength={120} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={editing?.status ?? "ativo"}>
              <SelectTrigger id="status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">{editing ? "Salvar" : "Criar equipe"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
