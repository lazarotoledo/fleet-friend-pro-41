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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      acessorios: {
        Row: {
          created_at: string
          id: string
          nome: string
          observacao: string | null
          patrimonio: string | null
          user_id: string
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          observacao?: string | null
          patrimonio?: string | null
          user_id?: string
          veiculo_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          observacao?: string | null
          patrimonio?: string | null
          user_id?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acessorios_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      arquivos_veiculo: {
        Row: {
          caminho: string
          categoria: string
          created_at: string
          id: string
          nome: string
          user_id: string
          veiculo_id: string
        }
        Insert: {
          caminho: string
          categoria: string
          created_at?: string
          id?: string
          nome: string
          user_id?: string
          veiculo_id: string
        }
        Update: {
          caminho?: string
          categoria?: string
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arquivos_veiculo_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      equipes: {
        Row: {
          created_at: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      historico_equipes: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string
          equipe_id: string | null
          id: string
          user_id: string
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          equipe_id?: string | null
          id?: string
          user_id?: string
          veiculo_id: string
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          equipe_id?: string | null
          id?: string
          user_id?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_equipes_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_equipes_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      leituras_km: {
        Row: {
          created_at: string
          id: string
          km: number
          mes: string
          user_id: string
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          km: number
          mes: string
          user_id?: string
          veiculo_id: string
        }
        Update: {
          created_at?: string
          id?: string
          km?: number
          mes?: string
          user_id?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leituras_km_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes: {
        Row: {
          condutor: string | null
          created_at: string
          custo: number | null
          data: string
          descricao: string | null
          id: string
          km: number | null
          proximo_km: number | null
          tipo: string
          user_id: string
          veiculo_id: string
        }
        Insert: {
          condutor?: string | null
          created_at?: string
          custo?: number | null
          data?: string
          descricao?: string | null
          id?: string
          km?: number | null
          proximo_km?: number | null
          tipo: string
          user_id?: string
          veiculo_id: string
        }
        Update: {
          condutor?: string | null
          created_at?: string
          custo?: number | null
          data?: string
          descricao?: string | null
          id?: string
          km?: number | null
          proximo_km?: number | null
          tipo?: string
          user_id?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      multas: {
        Row: {
          created_at: string
          data_hora: string
          id: string
          infracao: string | null
          local: string | null
          motorista: string | null
          user_id: string
          valor: number | null
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          data_hora: string
          id?: string
          infracao?: string | null
          local?: string | null
          motorista?: string | null
          user_id?: string
          valor?: number | null
          veiculo_id: string
        }
        Update: {
          created_at?: string
          data_hora?: string
          id?: string
          infracao?: string | null
          local?: string | null
          motorista?: string | null
          user_id?: string
          valor?: number | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "multas_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      sinistros: {
        Row: {
          created_at: string
          data: string
          detalhamento: string | null
          envolvidos: string | null
          id: string
          motorista: string | null
          relato: string | null
          user_id: string
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          data?: string
          detalhamento?: string | null
          envolvidos?: string | null
          id?: string
          motorista?: string | null
          relato?: string | null
          user_id?: string
          veiculo_id: string
        }
        Update: {
          created_at?: string
          data?: string
          detalhamento?: string | null
          envolvidos?: string | null
          id?: string
          motorista?: string | null
          relato?: string | null
          user_id?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sinistros_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          cobertura_seguro: string | null
          condicoes: string | null
          cor: string | null
          created_at: string
          equipe_id: string | null
          fim_contrato: string | null
          id: string
          inicio_contrato: string | null
          intervalo_oleo_km: number | null
          intervalo_pneu_km: number | null
          km_atual: number
          km_inicial: number
          km_mensal_contratado: number | null
          modelo: string | null
          placa: string
          rastreado: boolean
          user_id: string
          valor_contrato: number | null
        }
        Insert: {
          cobertura_seguro?: string | null
          condicoes?: string | null
          cor?: string | null
          created_at?: string
          equipe_id?: string | null
          fim_contrato?: string | null
          id?: string
          inicio_contrato?: string | null
          intervalo_oleo_km?: number | null
          intervalo_pneu_km?: number | null
          km_atual?: number
          km_inicial?: number
          km_mensal_contratado?: number | null
          modelo?: string | null
          placa: string
          rastreado?: boolean
          user_id?: string
          valor_contrato?: number | null
        }
        Update: {
          cobertura_seguro?: string | null
          condicoes?: string | null
          cor?: string | null
          created_at?: string
          equipe_id?: string | null
          fim_contrato?: string | null
          id?: string
          inicio_contrato?: string | null
          intervalo_oleo_km?: number | null
          intervalo_pneu_km?: number | null
          km_atual?: number
          km_inicial?: number
          km_mensal_contratado?: number | null
          modelo?: string | null
          placa?: string
          rastreado?: boolean
          user_id?: string
          valor_contrato?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "consultor"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "consultor"],
    },
  },
} as const
