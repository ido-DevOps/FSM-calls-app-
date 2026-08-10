// ============================================================================
// Solaris FSM — Database Types
//
// GENERATED from the live schema, do not hand-edit the Database type below.
// Regenerate after any migration with:
//
//     npx supabase gen types typescript --local > types/database.types.ts
//
// (then re-append the convenience aliases at the bottom of this file)
//
// This file used to be hand-written and was subtly malformed: postgrest-js
// requires each table to carry a `Relationships` key and the schema to carry
// `Views`/`Functions`. Without them the schema failed its `GenericSchema`
// constraint, so `.insert()` resolved to `never[]`, `.update()` to `never`,
// and every row type to `never` — 38 TypeScript errors, and zero real
// checking of column names or RPC arguments.
// ============================================================================

// >>> GENERATED START — everything between these markers is the verbatim
// output of `npm run db:types`. Do not hand-edit; CI diffs it against a fresh
// generation and fails if they drift.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      call_photos: {
        Row: {
          call_id: string
          id: string
          image_url: string
          photo_type: Database["public"]["Enums"]["photo_type"]
          uploaded_at: string
        }
        Insert: {
          call_id: string
          id?: string
          image_url: string
          photo_type?: Database["public"]["Enums"]["photo_type"]
          uploaded_at?: string
        }
        Update: {
          call_id?: string
          id?: string
          image_url?: string
          photo_type?: Database["public"]["Enums"]["photo_type"]
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_photos_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "service_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      component_models: {
        Row: {
          category: string
          created_at: string
          id: string
          model_name: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          model_name: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          model_name?: string
        }
        Relationships: []
      }
      component_replacements: {
        Row: {
          call_id: string
          id: string
          new_item_id: string | null
          old_item_serial: string | null
          replaced_at: string
          technician_id: string | null
        }
        Insert: {
          call_id: string
          id?: string
          new_item_id?: string | null
          old_item_serial?: string | null
          replaced_at?: string
          technician_id?: string | null
        }
        Update: {
          call_id?: string
          id?: string
          new_item_id?: string | null
          old_item_serial?: string | null
          replaced_at?: string
          technician_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "component_replacements_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "service_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_replacements_new_item_id_fkey"
            columns: ["new_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_replacements_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          created_at: string
          current_owner_id: string | null
          id: string
          model_name: string
          serial_number: string
          status: Database["public"]["Enums"]["item_status"]
        }
        Insert: {
          category?: string | null
          created_at?: string
          current_owner_id?: string | null
          id?: string
          model_name: string
          serial_number: string
          status?: Database["public"]["Enums"]["item_status"]
        }
        Update: {
          category?: string | null
          created_at?: string
          current_owner_id?: string | null
          id?: string
          model_name?: string
          serial_number?: string
          status?: Database["public"]["Enums"]["item_status"]
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_current_owner_id_fkey"
            columns: ["current_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      service_calls: {
        Row: {
          address: string | null
          assigned_technician_id: string | null
          call_number: string
          closed_at: string | null
          created_at: string
          customer_name: string
          gps_lat: number | null
          gps_lng: number | null
          id: string
          status: Database["public"]["Enums"]["call_status"]
          work_description: string | null
        }
        Insert: {
          address?: string | null
          assigned_technician_id?: string | null
          call_number?: string
          closed_at?: string | null
          created_at?: string
          customer_name: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          status?: Database["public"]["Enums"]["call_status"]
          work_description?: string | null
        }
        Update: {
          address?: string | null
          assigned_technician_id?: string | null
          call_number?: string
          closed_at?: string | null
          created_at?: string
          customer_name?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          status?: Database["public"]["Enums"]["call_status"]
          work_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_calls_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      log_component_replacement: {
        Args: {
          p_call_id: string
          p_new_item_id: string
          p_old_item_serial: string
          p_technician_id: string
        }
        Returns: {
          call_id: string
          id: string
          new_item_id: string | null
          old_item_serial: string | null
          replaced_at: string
          technician_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "component_replacements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      call_status:
        | "open"
        | "in_progress"
        | "pending_parts"
        | "completed"
        | "cancelled"
      item_status:
        | "in_warehouse"
        | "with_technician"
        | "installed"
        | "defective_returned"
      photo_type:
        | "before_repair"
        | "defective_part"
        | "new_part"
        | "production_proof"
        | "general"
      user_role: "admin" | "warehouse_manager" | "technician"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      call_status: [
        "open",
        "in_progress",
        "pending_parts",
        "completed",
        "cancelled",
      ],
      item_status: [
        "in_warehouse",
        "with_technician",
        "installed",
        "defective_returned",
      ],
      photo_type: [
        "before_repair",
        "defective_part",
        "new_part",
        "production_proof",
        "general",
      ],
      user_role: ["admin", "warehouse_manager", "technician"],
    },
  },
} as const



// <<< GENERATED END

// ============================================================================
// Convenience aliases — what the app actually imports.
// Derived from the generated types above, so they can never drift again.
// ============================================================================

export type UserRole = Database["public"]["Enums"]["user_role"];
export type CallStatus = Database["public"]["Enums"]["call_status"];
export type ItemStatus = Database["public"]["Enums"]["item_status"];
export type PhotoType = Database["public"]["Enums"]["photo_type"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ServiceCall = Database["public"]["Tables"]["service_calls"]["Row"];
export type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];
export type CallPhoto = Database["public"]["Tables"]["call_photos"]["Row"];
export type ComponentReplacement =
  Database["public"]["Tables"]["component_replacements"]["Row"];
export type ComponentModel = Database["public"]["Tables"]["component_models"]["Row"];
