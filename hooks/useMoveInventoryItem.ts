import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { ItemStatus } from "../types/database.types";

export interface MoveInventoryItemInput {
  itemId: string;
  status: ItemStatus;
  ownerId: string | null;
}

/** Free-form relocation — set an item's status/owner directly, no guided flow. */
export function useMoveInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, status, ownerId }: MoveInventoryItemInput) => {
      // `.select()` matters for more than the return value: RLS doesn't raise
      // on UPDATE, it just narrows the row set to zero. Without asking for the
      // updated row back, PostgREST answers 204 with error === null, so a
      // blocked write would report success and the UI would refetch unchanged
      // data — the modal closes and nothing happens.
      const { data, error } = await supabase
        .from("inventory_items")
        .update({ status, current_owner_id: ownerId })
        .eq("id", itemId)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error(
          "That item couldn't be updated — it may have been deleted, or you may not have permission to change it."
        );
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
    },
  });
}
