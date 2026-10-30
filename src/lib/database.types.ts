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
      atelier: {
        Row: {
          created_at: string
          devise: string
          id: string
          nom: string
          telephone: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          created_at?: string
          devise?: string
          id?: string
          nom: string
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          created_at?: string
          devise?: string
          id?: string
          nom?: string
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      atelier_membre: {
        Row: {
          actif: boolean
          atelier_id: string
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          actif?: boolean
          atelier_id: string
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          actif?: boolean
          atelier_id?: string
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atelier_membre_atelier_id_fkey"
            columns: ["atelier_id"]
            isOneToOne: false
            referencedRelation: "atelier"
            referencedColumns: ["id"]
          },
        ]
      }
      client: {
        Row: {
          atelier_id: string
          created_at: string
          id: string
          nom: string
          notes: string | null
          telephone: string | null
          updated_at: string
        }
        Insert: {
          atelier_id: string
          created_at?: string
          id?: string
          nom: string
          notes?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          atelier_id?: string
          created_at?: string
          id?: string
          nom?: string
          notes?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_atelier_id_fkey"
            columns: ["atelier_id"]
            isOneToOne: false
            referencedRelation: "atelier"
            referencedColumns: ["id"]
          },
        ]
      }
      commande: {
        Row: {
          atelier_id: string
          client_id: string
          created_at: string
          created_by: string | null
          date_commande: string
          date_livraison: string | null
          id: string
          prix_fcfa: number
          reference: string
          statut: string
          updated_at: string
          vetement: string
        }
        Insert: {
          atelier_id: string
          client_id: string
          created_at?: string
          created_by?: string | null
          date_commande?: string
          date_livraison?: string | null
          id?: string
          prix_fcfa: number
          reference: string
          statut?: string
          updated_at?: string
          vetement: string
        }
        Update: {
          atelier_id?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          date_commande?: string
          date_livraison?: string | null
          id?: string
          prix_fcfa?: number
          reference?: string
          statut?: string
          updated_at?: string
          vetement?: string
        }
        Relationships: [
          {
            foreignKeyName: "commande_atelier_id_client_id_fkey"
            columns: ["atelier_id", "client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["atelier_id", "id"]
          },
        ]
      }
      mensuration: {
        Row: {
          atelier_id: string
          client_id: string
          created_at: string
          created_by: string | null
          date_mesure: string
          id: string
          note: string | null
          valeurs: Json
        }
        Insert: {
          atelier_id: string
          client_id: string
          created_at?: string
          created_by?: string | null
          date_mesure: string
          id?: string
          note?: string | null
          valeurs: Json
        }
        Update: {
          atelier_id?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          date_mesure?: string
          id?: string
          note?: string | null
          valeurs?: Json
        }
        Relationships: [
          {
            foreignKeyName: "mensuration_atelier_id_client_id_fkey"
            columns: ["atelier_id", "client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["atelier_id", "id"]
          },
        ]
      }
      paiement: {
        Row: {
          atelier_id: string
          cle_idempotence: string
          commande_id: string
          created_at: string
          created_by: string | null
          date_paiement: string
          id: string
          montant_fcfa: number
          note: string | null
          statut: string
        }
        Insert: {
          atelier_id: string
          cle_idempotence: string
          commande_id: string
          created_at?: string
          created_by?: string | null
          date_paiement?: string
          id?: string
          montant_fcfa: number
          note?: string | null
          statut?: string
        }
        Update: {
          atelier_id?: string
          cle_idempotence?: string
          commande_id?: string
          created_at?: string
          created_by?: string | null
          date_paiement?: string
          id?: string
          montant_fcfa?: number
          note?: string | null
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "paiement_atelier_id_commande_id_fkey"
            columns: ["atelier_id", "commande_id"]
            isOneToOne: false
            referencedRelation: "commande"
            referencedColumns: ["atelier_id", "id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_atelier: {
        Args: { p_nom: string; p_telephone?: string; p_ville?: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
