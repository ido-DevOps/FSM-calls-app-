import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

/** Receiving: a defective_returned item physically arrives back at the warehouse. */
export function useReceiveInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("inventory_items")
        .update({ status: "in_warehouse", current_owner_id: null })
        .eq("id", itemId)
        .eq("status", "defective_returned")
        .select()
        .single();

      if (error) {
        throw new Error(
          error.code === "PGRST116"
            ? "This item isn't marked as defective/returned anymore."
            : error.message
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
    },
  });
}
