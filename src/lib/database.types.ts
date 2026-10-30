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
      achat_fournisseur: {
        Row: {
          atelier_id: string
          created_at: string
          created_by: string | null
          date_annulation: string | null
          date_commande: string
          date_reception: string | null
          fournisseur_id: string
          id: string
          motif_annulation: string | null
          note: string | null
          reference: string
          statut: string
        }
        Insert: {
          atelier_id: string
          created_at?: string
          created_by?: string | null
          date_annulation?: string | null
          date_commande?: string
          date_reception?: string | null
          fournisseur_id: string
          id?: string
          motif_annulation?: string | null
          note?: string | null
          reference: string
          statut?: string
        }
        Update: {
          atelier_id?: string
          created_at?: string
          created_by?: string | null
          date_annulation?: string | null
          date_commande?: string
          date_reception?: string | null
          fournisseur_id?: string
          id?: string
          motif_annulation?: string | null
          note?: string | null
          reference?: string
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "achat_fournisseur_atelier_id_fkey"
            columns: ["atelier_id"]
            isOneToOne: false
            referencedRelation: "atelier"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achat_fournisseur_fk"
            columns: ["atelier_id", "fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseur"
            referencedColumns: ["atelier_id", "id"]
          },
        ]
      }
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
          etape_retouche: string | null
          id: string
          mensuration_snapshot: Json | null
          mensuration_snapshot_date: string | null
          prix_fcfa: number
          reference: string
          statut: string
          type_travail: string
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
          etape_retouche?: string | null
          id?: string
          mensuration_snapshot?: Json | null
          mensuration_snapshot_date?: string | null
          prix_fcfa: number
          reference: string
          statut?: string
          type_travail?: string
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
          etape_retouche?: string | null
          id?: string
          mensuration_snapshot?: Json | null
          mensuration_snapshot_date?: string | null
          prix_fcfa?: number
          reference?: string
          statut?: string
          type_travail?: string
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
      depense: {
        Row: {
          annulee_le: string | null
          atelier_id: string
          categorie: string
          created_at: string
          created_by: string | null
          date_depense: string
          description: string
          id: string
          montant_fcfa: number
          motif_annulation: string | null
        }
        Insert: {
          annulee_le?: string | null
          atelier_id: string
          categorie: string
          created_at?: string
          created_by?: string | null
          date_depense?: string
          description: string
          id?: string
          montant_fcfa: number
          motif_annulation?: string | null
        }
        Update: {
          annulee_le?: string | null
          atelier_id?: string
          categorie?: string
          created_at?: string
          created_by?: string | null
          date_depense?: string
          description?: string
          id?: string
          montant_fcfa?: number
          motif_annulation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "depense_atelier_id_fkey"
            columns: ["atelier_id"]
            isOneToOne: false
            referencedRelation: "atelier"
            referencedColumns: ["id"]
          },
        ]
      }
      fournisseur: {
        Row: {
          actif: boolean
          atelier_id: string
          categorie: string | null
          contact: string | null
          created_at: string
          created_by: string | null
          id: string
          nom: string
          note: string | null
          telephone: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          actif?: boolean
          atelier_id: string
          categorie?: string | null
          contact?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nom: string
          note?: string | null
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          actif?: boolean
          atelier_id?: string
          categorie?: string | null
          contact?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nom?: string
          note?: string | null
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fournisseur_atelier_id_fkey"
            columns: ["atelier_id"]
            isOneToOne: false
            referencedRelation: "atelier"
            referencedColumns: ["id"]
          },
        ]
      }
      ligne_achat_fournisseur: {
        Row: {
          achat_id: string
          article_id: string
          atelier_id: string
          cout_unitaire_fcfa: number
          created_at: string
          id: string
          nom_article: string
          quantite: number
          unite: string
        }
        Insert: {
          achat_id: string
          article_id: string
          atelier_id: string
          cout_unitaire_fcfa: number
          created_at?: string
          id?: string
          nom_article: string
          quantite: number
          unite: string
        }
        Update: {
          achat_id?: string
          article_id?: string
          atelier_id?: string
          cout_unitaire_fcfa?: number
          created_at?: string
          id?: string
          nom_article?: string
          quantite?: number
          unite?: string
        }
        Relationships: [
          {
            foreignKeyName: "ligne_achat_article_fk"
            columns: ["atelier_id", "article_id"]
            isOneToOne: false
            referencedRelation: "stock_article"
            referencedColumns: ["atelier_id", "id"]
          },
          {
            foreignKeyName: "ligne_achat_parent_fk"
            columns: ["atelier_id", "achat_id"]
            isOneToOne: false
            referencedRelation: "achat_fournisseur"
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
      paiement_fournisseur: {
        Row: {
          achat_id: string
          atelier_id: string
          cle_idempotence: string
          created_at: string
          created_by: string | null
          date_paiement: string
          id: string
          montant_fcfa: number
          note: string | null
        }
        Insert: {
          achat_id: string
          atelier_id: string
          cle_idempotence: string
          created_at?: string
          created_by?: string | null
          date_paiement?: string
          id?: string
          montant_fcfa: number
          note?: string | null
        }
        Update: {
          achat_id?: string
          atelier_id?: string
          cle_idempotence?: string
          created_at?: string
          created_by?: string | null
          date_paiement?: string
          id?: string
          montant_fcfa?: number
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paiement_fournisseur_achat_fk"
            columns: ["atelier_id", "achat_id"]
            isOneToOne: false
            referencedRelation: "achat_fournisseur"
            referencedColumns: ["atelier_id", "id"]
          },
        ]
      }
      profil_fournisseur: {
        Row: {
          atelier_id: string
          categorie: string
          created_at: string
          created_by: string | null
          description: string
          nom_boutique: string
          nom_contact: string
          nom_entreprise: string
          telephone: string
          updated_at: string
          ville: string
        }
        Insert: {
          atelier_id: string
          categorie?: string
          created_at?: string
          created_by?: string | null
          description?: string
          nom_boutique?: string
          nom_contact?: string
          nom_entreprise: string
          telephone?: string
          updated_at?: string
          ville?: string
        }
        Update: {
          atelier_id?: string
          categorie?: string
          created_at?: string
          created_by?: string | null
          description?: string
          nom_boutique?: string
          nom_contact?: string
          nom_entreprise?: string
          telephone?: string
          updated_at?: string
          ville?: string
        }
        Relationships: [
          {
            foreignKeyName: "profil_fournisseur_atelier_id_fkey"
            columns: ["atelier_id"]
            isOneToOne: true
            referencedRelation: "atelier"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_article: {
        Row: {
          atelier_id: string
          created_at: string
          id: string
          nom: string
          seuil_alerte: number
          unite: string
        }
        Insert: {
          atelier_id: string
          created_at?: string
          id?: string
          nom: string
          seuil_alerte?: number
          unite: string
        }
        Update: {
          atelier_id?: string
          created_at?: string
          id?: string
          nom?: string
          seuil_alerte?: number
          unite?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_article_atelier_id_fkey"
            columns: ["atelier_id"]
            isOneToOne: false
            referencedRelation: "atelier"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_mouvement: {
        Row: {
          article_id: string
          atelier_id: string
          cle_idempotence: string
          created_at: string
          created_by: string | null
          date_mouvement: string
          id: string
          note: string | null
          quantite: number
          type: string
        }
        Insert: {
          article_id: string
          atelier_id: string
          cle_idempotence: string
          created_at?: string
          created_by?: string | null
          date_mouvement?: string
          id?: string
          note?: string | null
          quantite: number
          type: string
        }
        Update: {
          article_id?: string
          atelier_id?: string
          cle_idempotence?: string
          created_at?: string
          created_by?: string | null
          date_mouvement?: string
          id?: string
          note?: string | null
          quantite?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_mouvement_article_atelier_fkey"
            columns: ["atelier_id", "article_id"]
            isOneToOne: false
            referencedRelation: "stock_article"
            referencedColumns: ["atelier_id", "id"]
          },
          {
            foreignKeyName: "stock_mouvement_atelier_id_fkey"
            columns: ["atelier_id"]
            isOneToOne: false
            referencedRelation: "atelier"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_commande_with_initial_payment: {
        Args: {
          p_acompte_initial: number
          p_atelier_id: string
          p_client_id: string
          p_date_commande: string
          p_date_livraison: string
          p_etape_retouche: string
          p_mensuration_snapshot: Json
          p_mensuration_snapshot_date: string
          p_payment_key: string
          p_prix: number
          p_reference: string
          p_statut: string
          p_type_travail: string
          p_vetement: string
        }
        Returns: {
          commande_id: string
          reference: string
        }[]
      }
      create_stock_article_with_opening: {
        Args: {
          p_atelier_id: string
          p_cle_idempotence: string
          p_date: string
          p_nom: string
          p_quantite_initiale: number
          p_seuil: number
          p_unite: string
        }
        Returns: {
          article_id: string
        }[]
      }
      create_stock_movements_batch: {
        Args: { p_atelier_id: string; p_movements: Json }
        Returns: number
      }
      create_supplier_purchase: {
        Args: {
          p_atelier_id: string
          p_date_commande: string
          p_fournisseur_id: string
          p_lignes: Json
          p_note: string
          p_reference: string
        }
        Returns: {
          achat_id: string
        }[]
      }
      receive_supplier_purchase: {
        Args: {
          p_achat_id: string
          p_atelier_id: string
          p_date_reception: string
        }
        Returns: number
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
