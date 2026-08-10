import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { InventoryItem } from "../types/database.types";

export interface NewInventoryItemInput {
  serial_number: string;
  model_name: string;
  category: string;
}

function describeLocation(status: string, ownerName: string | null | undefined) {
  if (ownerName) return `with ${ownerName}`;
  switch (status) {
    case "in_warehouse":
      return "in the warehouse";
    case "installed":
      return "installed at a job site";
    case "defective_returned":
      return "marked defective, awaiting receipt";
    default:
      return status.replace("_", " ");
  }
}

/** New stock arriving from a supplier — enters the system as in_warehouse, unowned. */
export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NewInventoryItemInput): Promise<InventoryItem> => {
      const serial = input.serial_number.trim();

      // Check first so the error can say *where* the duplicate already is,
      // not just that it exists — the DB's unique constraint alone can't
      // tell you that.
      const { data: existing } = await supabase
        .from("inventory_items")
        .select("status, current_owner:profiles(full_name)")
        .eq("serial_number", serial)
        .maybeSingle();

      if (existing) {
        const owner = Array.isArray(existing.current_owner)
          ? existing.current_owner[0]
          : existing.current_owner;
        throw new Error(
          `${serial} is already registered — currently ${describeLocation(existing.status, owner?.full_name)}.`
        );
      }

      const { data, error } = await supabase
        .from("inventory_items")
        .insert({
          serial_number: serial,
          model_name: input.model_name.trim(),
          category: input.category.trim() || null,
          status: "in_warehouse",
        })
        .select()
        .single();

      if (error) {
        // Fallback for the rare race where two adds happen at the same instant.
        throw new Error(
          error.code === "23505"
            ? `${serial} was just registered by someone else.`
            : error.message
        );
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
    },
  });
}
