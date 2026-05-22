export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      areas_territoriais: {
        Row: {
          codigo: string | null
          cor: string
          created_at: string
          deleted_at: string | null
          distrito_id: string
          equipe_id: string | null
          geojson: Json | null
          id: string
          nome: string
          observacoes: string | null
          populacao_estimada: number
          qtd_familias: number
          status: Database["public"]["Enums"]["entity_status"]
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          codigo?: string | null
          cor?: string
          created_at?: string
          deleted_at?: string | null
          distrito_id: string
          equipe_id?: string | null
          geojson?: Json | null
          id?: string
          nome: string
          observacoes?: string | null
          populacao_estimada?: number
          qtd_familias?: number
          status?: Database["public"]["Enums"]["entity_status"]
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string | null
          cor?: string
          created_at?: string
          deleted_at?: string | null
          distrito_id?: string
          equipe_id?: string | null
          geojson?: Json | null
          id?: string
          nome?: string
          observacoes?: string | null
          populacao_estimada?: number
          qtd_familias?: number
          status?: Database["public"]["Enums"]["entity_status"]
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_territoriais_distrito_id_fkey"
            columns: ["distrito_id"]
            isOneToOne: false
            referencedRelation: "distritos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_territoriais_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_territoriais_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      distritos: {
        Row: {
          cor: string
          created_at: string
          deleted_at: string | null
          descricao: string | null
          email: string | null
          id: string
          nome: string
          responsavel: string | null
          sigla: string
          status: Database["public"]["Enums"]["entity_status"]
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cor?: string
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          email?: string | null
          id?: string
          nome: string
          responsavel?: string | null
          sigla: string
          status?: Database["public"]["Enums"]["entity_status"]
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cor?: string
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          email?: string | null
          id?: string
          nome?: string
          responsavel?: string | null
          sigla?: string
          status?: Database["public"]["Enums"]["entity_status"]
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      equipes: {
        Row: {
          codigo_esus: string | null
          created_at: string
          deleted_at: string | null
          id: string
          nome: string
          qtd_acs: number
          responsavel: string | null
          status: Database["public"]["Enums"]["entity_status"]
          tipo: string | null
          unidade_id: string
          updated_at: string
        }
        Insert: {
          codigo_esus?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome: string
          qtd_acs?: number
          responsavel?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tipo?: string | null
          unidade_id: string
          updated_at?: string
        }
        Update: {
          codigo_esus?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome?: string
          qtd_acs?: number
          responsavel?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tipo?: string | null
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_alteracoes: {
        Row: {
          acao: Database["public"]["Enums"]["log_acao"]
          created_at: string
          detalhes: Json | null
          entidade: string
          entidade_id: string | null
          id: string
          user_id: string | null
          user_nome: string | null
        }
        Insert: {
          acao: Database["public"]["Enums"]["log_acao"]
          created_at?: string
          detalhes?: Json | null
          entidade: string
          entidade_id?: string | null
          id?: string
          user_id?: string | null
          user_nome?: string | null
        }
        Update: {
          acao?: Database["public"]["Enums"]["log_acao"]
          created_at?: string
          detalhes?: Json | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          user_id?: string | null
          user_nome?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          distrito_id: string | null
          email: string
          id: string
          nome: string
          status: Database["public"]["Enums"]["entity_status"]
          telefone: string | null
          ultimo_acesso: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          distrito_id?: string | null
          email: string
          id: string
          nome: string
          status?: Database["public"]["Enums"]["entity_status"]
          telefone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          distrito_id?: string | null
          email?: string
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["entity_status"]
          telefone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_distrito_id_fkey"
            columns: ["distrito_id"]
            isOneToOne: false
            referencedRelation: "distritos"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          bairro: string | null
          cnes: string | null
          coordenador: string | null
          cor: string
          created_at: string
          deleted_at: string | null
          distrito_id: string
          email: string | null
          endereco: string | null
          foto_url: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          status: Database["public"]["Enums"]["entity_status"]
          telefone: string | null
          tipo: Database["public"]["Enums"]["unidade_tipo"]
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cnes?: string | null
          coordenador?: string | null
          cor?: string
          created_at?: string
          deleted_at?: string | null
          distrito_id: string
          email?: string | null
          endereco?: string | null
          foto_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
          status?: Database["public"]["Enums"]["entity_status"]
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["unidade_tipo"]
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cnes?: string | null
          coordenador?: string | null
          cor?: string
          created_at?: string
          deleted_at?: string | null
          distrito_id?: string
          email?: string | null
          endereco?: string | null
          foto_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          status?: Database["public"]["Enums"]["entity_status"]
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["unidade_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_distrito_id_fkey"
            columns: ["distrito_id"]
            isOneToOne: false
            referencedRelation: "distritos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_distrito_id: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin_geral" | "gestor_distrital" | "tecnico" | "visualizador"
      entity_status: "ativo" | "inativo"
      log_acao: "criar" | "editar" | "excluir"
      unidade_tipo: "UBS" | "USF" | "UPA" | "CAPS" | "Outros"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin_geral", "gestor_distrital", "tecnico", "visualizador"],
      entity_status: ["ativo", "inativo"],
      log_acao: ["criar", "editar", "excluir"],
      unidade_tipo: ["UBS", "USF", "UPA", "CAPS", "Outros"],
    },
  },
} as const
