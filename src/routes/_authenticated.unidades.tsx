import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, MapPin } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/unidades")({
  component: UnidadesPage,
});

const UNIDADE_TIPOS = ["UBS", "USF", "UPA", "CAPS", "Outros"] as const;

const schema = z.object({
  nome: z.string().trim().min(2).max(150),
  tipo: z.enum(UNIDADE_TIPOS),
  cnes: z.string().max(20).optional().nullable(),
  distrito_id: z.string().uuid(),
  endereco: z.string().max(255).optional().nullable(),
  bairro: z.string().max(120).optional().nullable(),
  telefone: z.string().max(40).optional().nullable(),
  email: z.string().email().max(255).optional().or(z.literal("")).nullable(),
  coordenador: z.string().max(120).optional().nullable(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  foto_url: z.string().url().max(500).optional().or(z.literal("")).nullable(),
  status: z.enum(["ativo", "inativo"]),
});

type Distrito = { id: string; nome: string; sigla: string; cor: string };
type Unidade = {
  id: string;
  nome: string;
  tipo: typeof UNIDADE_TIPOS[number];
  cnes: string | null;
  distrito_id: string;
  endereco: string | null;
  bairro: string | null;
  telefone: string | null;
  email: string | null;
  coordenador: string | null;
  cor: string;
  latitude: number | null;
  longitude: number | null;
  foto_url: string | null;
  status: "ativo" | "inativo";
};

const TIPO_COLORS: Record<string, string> = {
  UBS: "bg-primary/15 text-primary",
  USF: "bg-secondary/20 text-secondary",
  UPA: "bg-destructive/15 text-destructive",
  CAPS: "bg-warning/20 text-warning-foreground",
  Outros: "bg-muted text-muted-foreground",
};

function UnidadesPage() {
  const { canEdit } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterDistrito, setFilterDistrito] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Unidade | null>(null);
  const [toDelete, setToDelete] = useState<Unidade | null>(null);

  const { data: distritos } = useQuery({
    queryKey: ["distritos-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distritos")
        .select("id, nome, sigla, cor")
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return data as Distrito[];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["unidades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades")
        .select("*")
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return data as Unidade[];
    },
  });

  const distritoMap = useMemo(() => {
    const m = new Map<string, Distrito>();
    (distritos ?? []).forEach((d) => m.set(d.id, d));
    return m;
  }, [distritos]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.filter((u) => {
      if (filterDistrito !== "all" && u.distrito_id !== filterDistrito) return false;
      if (filterTipo !== "all" && u.tipo !== filterTipo) return false;
      if (!q) return true;
      return (
        u.nome.toLowerCase().includes(q) ||
        (u.cnes ?? "").toLowerCase().includes(q) ||
        (u.bairro ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, search, filterDistrito, filterTipo]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const lat = fd.get("latitude");
    const lng = fd.get("longitude");
    const payload = {
      nome: String(fd.get("nome") ?? "").trim(),
      tipo: fd.get("tipo") as typeof UNIDADE_TIPOS[number],
      cnes: (fd.get("cnes") as string) || null,
      distrito_id: String(fd.get("distrito_id") ?? ""),
      endereco: (fd.get("endereco") as string) || null,
      bairro: (fd.get("bairro") as string) || null,
      telefone: (fd.get("telefone") as string) || null,
      email: ((fd.get("email") as string) || "") || null,
      coordenador: (fd.get("coordenador") as string) || null,
      cor: String(fd.get("cor") ?? "#16A34A"),
      latitude: lat ? Number(lat) : null,
      longitude: lng ? Number(lng) : null,
      foto_url: ((fd.get("foto_url") as string) || "") || null,
      status: (fd.get("status") as "ativo" | "inativo") || "ativo",
    };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const data = {
      ...parsed.data,
      email: parsed.data.email || null,
      foto_url: parsed.data.foto_url || null,
    };
    if (editing) {
      const { error } = await supabase.from("unidades").update(data).eq("id", editing.id);
      if (error) return toast.error(error.message);
      await recordLog({ acao: "editar", entidade: "unidades", entidade_id: editing.id });
      toast.success("Unidade atualizada");
    } else {
      const { data: ins, error } = await supabase
        .from("unidades")
        .insert(data)
        .select()
        .single();
      if (error) return toast.error(error.message);
      await recordLog({ acao: "criar", entidade: "unidades", entidade_id: ins.id });
      toast.success("Unidade criada");
    }
    setOpen(false);
    setEditing(null);
    void qc.invalidateQueries({ queryKey: ["unidades"] });
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const { error } = await supabase
      .from("unidades")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", toDelete.id);
    if (error) return toast.error(error.message);
    await recordLog({ acao: "excluir", entidade: "unidades", entidade_id: toDelete.id });
    toast.success("Unidade removida");
    setToDelete(null);
    void qc.invalidateQueries({ queryKey: ["unidades"] });
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  return (
    <div>
      <PageHeader
        title="UBS / USF"
        subtitle="Unidades Básicas e de Saúde da Família"
        actions={
          canEdit && (
            <Dialog
              open={open}
              onOpenChange={(v) => {
                setOpen(v);
                if (!v) setEditing(null);
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={() => setEditing(null)}>
                  <Plus className="mr-2 h-4 w-4" /> Nova unidade
                </Button>
              </DialogTrigger>
              <UnidadeDialog
                editing={editing}
                distritos={distritos ?? []}
                onSubmit={handleSave}
              />
            </Dialog>
          )
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome, CNES ou bairro"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterDistrito} onValueChange={setFilterDistrito}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Distrito" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os distritos</SelectItem>
              {(distritos ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.sigla} — {d.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              {UNIDADE_TIPOS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma unidade encontrada.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((u) => {
            const d = distritoMap.get(u.distrito_id);
            return (
              <Card key={u.id} className="overflow-hidden border-border/60 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]">
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: u.cor }}
                />
                {u.foto_url && (
                  <img
                    src={u.foto_url}
                    alt={u.nome}
                    className="h-32 w-full object-cover"
                  />
                )}
                <CardContent className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{u.nome}</h3>
                    <Badge className={TIPO_COLORS[u.tipo]} variant="secondary">
                      {u.tipo}
                    </Badge>
                  </div>
                  {d && (
                    <p className="text-xs text-muted-foreground">
                      {d.sigla} — {d.nome}
                    </p>
                  )}
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {u.endereco && (
                      <p className="flex items-start gap-1.5">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {u.endereco}
                          {u.bairro && `, ${u.bairro}`}
                        </span>
                      </p>
                    )}
                    {u.coordenador && <p>Coord.: {u.coordenador}</p>}
                    {u.cnes && <p className="text-xs">CNES: {u.cnes}</p>}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant={u.status === "ativo" ? "default" : "secondary"}>
                      {u.status}
                    </Badge>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(u);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setToDelete(u)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover unidade?</AlertDialogTitle>
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

function UnidadeDialog({
  editing,
  distritos,
  onSubmit,
}: {
  editing: Unidade | null;
  distritos: Distrito[];
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar unidade" : "Nova unidade"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 grid gap-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={editing?.nome ?? ""} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tipo">Tipo *</Label>
            <Select name="tipo" defaultValue={editing?.tipo ?? "UBS"}>
              <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNIDADE_TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="cnes">CNES</Label>
            <Input id="cnes" name="cnes" defaultValue={editing?.cnes ?? ""} maxLength={20} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="distrito_id">Distrito *</Label>
            <Select name="distrito_id" defaultValue={editing?.distrito_id}>
              <SelectTrigger id="distrito_id"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {distritos.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.sigla} — {d.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="endereco">Endereço</Label>
          <Input id="endereco" name="endereco" defaultValue={editing?.endereco ?? ""} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="bairro">Bairro</Label>
            <Input id="bairro" name="bairro" defaultValue={editing?.bairro ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="coordenador">Coordenador</Label>
            <Input id="coordenador" name="coordenador" defaultValue={editing?.coordenador ?? ""} />
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
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="latitude">Latitude</Label>
            <Input id="latitude" name="latitude" type="number" step="any" defaultValue={editing?.latitude ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="longitude">Longitude</Label>
            <Input id="longitude" name="longitude" type="number" step="any" defaultValue={editing?.longitude ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cor">Cor</Label>
            <Input id="cor" name="cor" type="color" defaultValue={editing?.cor ?? "#16A34A"} className="h-9 p-1" />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="foto_url">URL da foto</Label>
          <Input id="foto_url" name="foto_url" type="url" defaultValue={editing?.foto_url ?? ""} placeholder="https://..." />
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
          <Button type="submit">{editing ? "Salvar" : "Criar unidade"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
