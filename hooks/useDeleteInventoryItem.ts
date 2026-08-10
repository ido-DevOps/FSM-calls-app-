import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

/**
 * Permanently removes an inventory item. Any component_replacements row
 * referencing it as new_item_id keeps its history — that FK is
 * ON DELETE SET NULL, so deleting a part doesn't erase the swap record,
 * it just loses the live link to the (now-gone) inventory row.
 */
export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("inventory_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
    },
  });
}
