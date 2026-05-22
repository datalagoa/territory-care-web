import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin_geral" | "gestor_distrital" | "tecnico" | "visualizador";

export interface Profile {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  distrito_id: string | null;
  status: "ativo" | "inativo";
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin_geral: "Administrador Geral",
  gestor_distrital: "Gestor Distrital",
  tecnico: "Técnico",
  visualizador: "Visualizador",
};

export function roleLabel(r: AppRole) {
  return ROLE_LABELS[r];
}

export function useAuth(): AuthState & {
  signOut: () => Promise<void>;
  hasRole: (r: AppRole) => boolean;
  canEdit: boolean;
} {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        // defer extra calls to avoid deadlocks
        setTimeout(() => {
          void loadProfileAndRoles(s.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        void loadProfileAndRoles(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfileAndRoles(uid: string) {
    const [{ data: prof }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((prof as Profile) ?? null);
    setRoles((roleRows ?? []).map((r) => r.role as AppRole));
    setLoading(false);
  }

  const hasRole = (r: AppRole) => roles.includes(r);
  const canEdit = hasRole("admin_geral") || hasRole("gestor_distrital") || hasRole("tecnico");

  return {
    session,
    user: session?.user ?? null,
    profile,
    roles,
    loading,
    hasRole,
    canEdit,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
}
