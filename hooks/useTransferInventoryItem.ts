import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

/** Dispatch: an in_warehouse item is checked out to a technician. */
export function useTransferInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      technicianId,
    }: {
      itemId: string;
      technicianId: string;
    }) => {
      const { error } = await supabase
        .from("inventory_items")
        .update({ status: "with_technician", current_owner_id: technicianId })
        .eq("id", itemId)
        .eq("status", "in_warehouse")
        .select()
        .single();

      if (error) {
        throw new Error(
          error.code === "PGRST116"
            ? "This item is no longer in the warehouse — someone else may have just dispatched it."
            : error.message
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
    },
  });
}
