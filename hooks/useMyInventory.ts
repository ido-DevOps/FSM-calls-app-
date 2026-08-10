import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { InventoryItem } from "../types/database.types";

/** Components currently checked out to a technician — swap candidates. */
export function useMyInventory(technicianId: string | undefined) {
  return useQuery({
    queryKey: ["inventory_items", "with_technician", technicianId],
    queryFn: async (): Promise<InventoryItem[]> => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("status", "with_technician")
        .eq("current_owner_id", technicianId as string)
        .order("model_name", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!technicianId,
  });
}
