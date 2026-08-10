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
      // Same reason as useMoveInventoryItem: a DELETE blocked by RLS returns
      // 204 with no error, so without `.select()` a refused delete looks
      // exactly like a successful one.
      const { data, error } = await supabase
        .from("inventory_items")
        .delete()
        .eq("id", itemId)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error(
          "That item couldn't be deleted — it may already be gone, or you may not have permission to delete it."
        );
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
    },
  });
}
