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
      const { error } = await supabase
        .from("inventory_items")
        .update({ status, current_owner_id: ownerId })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
    },
  });
}
