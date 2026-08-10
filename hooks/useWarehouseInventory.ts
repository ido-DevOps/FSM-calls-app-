import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { InventoryItem } from "../types/database.types";

export interface InventoryItemWithOwner extends InventoryItem {
  current_owner: { full_name: string | null } | null;
}

/** Every inventory item, warehouse and warehouse-manager/admin views. */
export function useWarehouseInventory() {
  return useQuery({
    queryKey: ["inventory_items", "all"],
    queryFn: async (): Promise<InventoryItemWithOwner[]> => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*, current_owner:profiles(full_name)")
        .order("model_name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as InventoryItemWithOwner[];
    },
  });
}
