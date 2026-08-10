// ============================================================================
// Solaris FSM — Database Types
// Mirrors supabase/migrations/20260101000000_init_schema.sql
// ============================================================================

export type UserRole = "admin" | "warehouse_manager" | "technician";

export type CallStatus =
  | "open"
  | "in_progress"
  | "pending_parts"
  | "completed"
  | "cancelled";

export type ItemStatus =
  | "in_warehouse"
  | "with_technician"
  | "installed"
  | "defective_returned";

export type PhotoType =
  | "before_repair"
  | "defective_part"
  | "new_part"
  | "production_proof"
  | "general";

export interface Profile {
  id: string; // uuid, FK -> auth.users.id
  full_name: string | null;
  role: UserRole;
  phone: string | null;
  created_at: string; // timestamptz
}

export interface InventoryItem {
  id: string; // uuid
  serial_number: string;
  model_name: string;
  category: string | null;
  status: ItemStatus;
  current_owner_id: string | null; // uuid, FK -> profiles.id
  created_at: string; // timestamptz
}

export interface ServiceCall {
  id: string; // uuid
  call_number: string; // e.g. "SC-000123"
  customer_name: string;
  address: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  status: CallStatus;
  assigned_technician_id: string | null; // uuid, FK -> profiles.id
  work_description: string | null;
  created_at: string; // timestamptz
  closed_at: string | null; // timestamptz
}

export interface CallPhoto {
  id: string; // uuid
  call_id: string; // uuid, FK -> service_calls.id
  photo_type: PhotoType;
  image_url: string;
  uploaded_at: string; // timestamptz
}

export interface ComponentReplacement {
  id: string; // uuid
  call_id: string; // uuid, FK -> service_calls.id
  old_item_serial: string | null;
  new_item_id: string | null; // uuid, FK -> inventory_items.id
  technician_id: string | null; // uuid, FK -> profiles.id
  replaced_at: string; // timestamptz
}

// ============================================================================
// Supabase-style generated Database interface
// Enables: createClient<Database>(url, key)
// ============================================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Omit<Profile, "id">> & { id: string };
        Update: Partial<Profile>;
      };
      inventory_items: {
        Row: InventoryItem;
        Insert: Partial<Omit<InventoryItem, "id" | "created_at">> & {
          serial_number: string;
          model_name: string;
        };
        Update: Partial<InventoryItem>;
      };
      service_calls: {
        Row: ServiceCall;
        Insert: Partial<
          Omit<ServiceCall, "id" | "call_number" | "created_at">
        > & {
          customer_name: string;
        };
        Update: Partial<ServiceCall>;
      };
      call_photos: {
        Row: CallPhoto;
        Insert: Partial<Omit<CallPhoto, "id" | "uploaded_at">> & {
          call_id: string;
          image_url: string;
        };
        Update: Partial<CallPhoto>;
      };
      component_replacements: {
        Row: ComponentReplacement;
        Insert: Partial<Omit<ComponentReplacement, "id" | "replaced_at">> & {
          call_id: string;
        };
        Update: Partial<ComponentReplacement>;
      };
    };
    Enums: {
      user_role: UserRole;
      call_status: CallStatus;
      item_status: ItemStatus;
      photo_type: PhotoType;
    };
  };
}
