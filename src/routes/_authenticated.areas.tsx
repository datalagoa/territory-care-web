import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Map as MapIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { recordLog } from "@/lib/log";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

export const Route = createFileRoute("/_authenticated/areas")({
  component: AreasPage,
});

const schema = z.object({
  nome: z.string().trim().min(2).max(150),
  codigo: z.string().max(40).optional().nullable(),
  distrito_id: z.string().uuid(),
  unidade_id: z.string().uuid().optional().nullable(),
  equipe_id: z.string().uuid().optional().nullable(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  populacao_estimada: z.number().int().min(0).max(9_999_999),
  qtd_familias: z.number().int().min(0).max(9_999_999),
  observacoes: z.string().max(1000).optional().nullable(),
  status: z.enum(["ativo", "inativo"]),
});

type Distrito = { id: string; nome: string; sigla: string };
type Unidade = { id: string; nome: string; distrito_id: string };
type Equipe = { id: string; nome: string; unidade_id: string };

type Area = {
  id: string;
  nome: string;
  codigo: string | null;
  distrito_id: string;
  unidade_id: string | null;
  equipe_id: string | null;
  cor: string;
  populacao_estimada: number;
  qtd_familias: number;
  observacoes: string | null;
  status: "ativo" | "inativo";
};

function AreasPage() {
  const { canEdit } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterDistrito, setFilterDistrito] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Area | null>(null);
  const [toDelete, setToDelete] = useState<Area | null>(null);

  const { data: distritos } = useQuery({
    queryKey: ["distritos-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distritos").select("id, nome, sigla").is("deleted_at", null).order("nome");
      if (error) throw error;
      return data as Distrito[];
    },
  });
  const { data: unidades } = useQuery({
    queryKey: ["unidades-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades").select("id, nome, distrito_id").is("deleted_at", null).order("nome");
      if (error) throw error;
      return data as Unidade[];
    },
  });
  const { data: equipes } = useQuery({
    queryKey: ["equipes-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipes").select("id, nome, unidade_id").is("deleted_at", null).order("nome");
      if (error) throw error;
      return data as Equipe[];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas_territoriais").select("*").is("deleted_at", null).order("nome");
      if (error) throw error;
      return data as Area[];
    },
  });

  const distritoMap = useMemo(() => new Map((distritos ?? []).map((d) => [d.id, d])), [distritos]);
  const unidadeMap = useMemo(() => new Map((unidades ?? []).map((u) => [u.id, u])), [unidades]);
  const equipeMap = useMemo(() => new Map((equipes ?? []).map((e) => [e.id, e])), [equipes]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.filter((a) => {
      if (filterDistrito !== "all" && a.distrito_id !== filterDistrito) return false;
      if (!q) return true;
      return a.nome.toLowerCase().includes(q) || (a.codigo ?? "").toLowerCase().includes(q);
    });
  }, [data, search, filterDistrito]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      nome: String(fd.get("nome") ?? "").trim(),
      codigo: (fd.get("codigo") as string) || null,
      distrito_id: String(fd.get("distrito_id") ?? ""),
      unidade_id: (fd.get("unidade_id") as string) || null,
      equipe_id: (fd.get("equipe_id") as string) || null,
      cor: String(fd.get("cor") ?? "#2563EB"),
      populacao_estimada: Number(fd.get("populacao_estimada") ?? 0),
      qtd_familias: Number(fd.get("qtd_familias") ?? 0),
      observacoes: (fd.get("observacoes") as string) || null,
      status: (fd.get("status") as "ativo" | "inativo") || "ativo",
    };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    if (editing) {
      const { error } = await supabase.from("areas_territoriais").update(parsed.data).eq("id", editing.id);
      if (error) return toast.error(error.message);
      await recordLog({ acao: "editar", entidade: "areas_territoriais", entidade_id: editing.id });
      toast.success("Área atualizada");
    } else {
      const { data: ins, error } = await supabase
        .from("areas_territoriais").insert(parsed.data).select().single();
      if (error) return toast.error(error.message);
      await recordLog({ acao: "criar", entidade: "areas_territoriais", entidade_id: ins.id });
      toast.success("Área criada");
    }
    setOpen(false);
    setEditing(null);
    void qc.invalidateQueries({ queryKey: ["areas"] });
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const { error } = await supabase
      .from("areas_territoriais")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", toDelete.id);
    if (error) return toast.error(error.message);
    await recordLog({ acao: "excluir", entidade: "areas_territoriais", entidade_id: toDelete.id });
    toast.success("Área removida");
    setToDelete(null);
    void qc.invalidateQueries({ queryKey: ["areas"] });
  }

  return (
    <div>
      <PageHeader
        title="Áreas Territoriais"
        subtitle="Delimitação territorial das áreas de cobertura — pronta para integração GIS"
        actions={
          canEdit && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditing(null)}>
                  <Plus className="mr-2 h-4 w-4" /> Nova área
                </Button>
              </DialogTrigger>
              <AreaDialog
                editing={editing}
                distritos={distritos ?? []}
                unidades={unidades ?? []}
                equipes={equipes ?? []}
                onSubmit={handleSave}
              />
            </Dialog>
          )
        }
      />

      <Card className="mb-4 border-dashed">
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <MapIcon className="h-5 w-5 text-primary" />
          <span>
            O campo <code className="rounded bg-muted px-1.5 py-0.5 text-xs">geojson</code> da tabela
            está pronto para receber polígonos. A camada Leaflet será adicionada na evolução GIS (Cursor IA).
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome ou código"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterDistrito} onValueChange={setFilterDistrito}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Distrito" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos distritos</SelectItem>
                {(distritos ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.sigla} — {d.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma área cadastrada.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((a) => {
                const d = distritoMap.get(a.distrito_id);
                const u = a.unidade_id ? unidadeMap.get(a.unidade_id) : null;
                const e = a.equipe_id ? equipeMap.get(a.equipe_id) : null;
                return (
                  <Card key={a.id} className="overflow-hidden">
                    <div className="h-1.5 w-full" style={{ backgroundColor: a.cor }} />
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold leading-tight">{a.nome}</h3>
                          {a.codigo && <p className="text-xs text-muted-foreground">Cód. {a.codigo}</p>}
                        </div>
                        <Badge variant={a.status === "ativo" ? "default" : "secondary"}>{a.status}</Badge>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {d && <p>Distrito: <span className="text-foreground">{d.sigla}</span></p>}
                        {u && <p>Unidade: <span className="text-foreground">{u.nome}</span></p>}
                        {e && <p>Equipe: <span className="text-foreground">{e.nome}</span></p>}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-muted/50 p-2 text-center">
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">População</p>
                          <p className="font-semibold">{a.populacao_estimada.toLocaleString("pt-BR")}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Famílias</p>
                          <p className="font-semibold">{a.qtd_familias.toLocaleString("pt-BR")}</p>
                        </div>
                      </div>
                      {canEdit && (
                        <div className="mt-3 flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(a); setOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setToDelete(a)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover área?</AlertDialogTitle>
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

function AreaDialog({
  editing, distritos, unidades, equipes, onSubmit,
}: {
  editing: Area | null;
  distritos: Distrito[];
  unidades: Unidade[];
  equipes: Equipe[];
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => unknown;
}) {
  const [distritoId, setDistritoId] = useState<string | undefined>(editing?.distrito_id);
  const [unidadeId, setUnidadeId] = useState<string | undefined>(editing?.unidade_id ?? undefined);

  const unidadesFiltradas = unidades.filter((u) => !distritoId || u.distrito_id === distritoId);
  const equipesFiltradas = equipes.filter((e) => !unidadeId || e.unidade_id === unidadeId);

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar área" : "Nova área"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="grid gap-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 grid gap-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={editing?.nome ?? ""} required maxLength={150} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="codigo">Código</Label>
            <Input id="codigo" name="codigo" defaultValue={editing?.codigo ?? ""} maxLength={40} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="distrito_id">Distrito *</Label>
            <Select name="distrito_id" value={distritoId} onValueChange={(v) => { setDistritoId(v); setUnidadeId(undefined); }}>
              <SelectTrigger id="distrito_id"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {distritos.map((d) => (<SelectItem key={d.id} value={d.id}>{d.sigla}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="unidade_id">Unidade</Label>
            <Select name="unidade_id" value={unidadeId ?? ""} onValueChange={(v) => setUnidadeId(v || undefined)}>
              <SelectTrigger id="unidade_id"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {unidadesFiltradas.map((u) => (<SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="equipe_id">Equipe</Label>
            <Select name="equipe_id" defaultValue={editing?.equipe_id ?? ""}>
              <SelectTrigger id="equipe_id"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {equipesFiltradas.map((e) => (<SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="populacao_estimada">População</Label>
            <Input id="populacao_estimada" name="populacao_estimada" type="number" min={0} defaultValue={editing?.populacao_estimada ?? 0} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="qtd_familias">Famílias</Label>
            <Input id="qtd_familias" name="qtd_familias" type="number" min={0} defaultValue={editing?.qtd_familias ?? 0} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cor">Cor</Label>
            <Input id="cor" name="cor" type="color" defaultValue={editing?.cor ?? "#2563EB"} className="h-9 p-1" />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea id="observacoes" name="observacoes" defaultValue={editing?.observacoes ?? ""} maxLength={1000} />
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
        <DialogFooter>
          <Button type="submit">{editing ? "Salvar" : "Criar área"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
