import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import type { ComponentReplacement } from "../types/database.types";

interface LogReplacementInput {
  newItemId: string;
  oldItemSerial: string;
}

/**
 * Logs a component swap via the `log_component_replacement` RPC, which
 * updates both inventory_items rows and inserts the replacement record in
 * a single transaction (see supabase/migrations/20260101010000_*.sql).
 */
export function useLogComponentReplacement(callId: string) {
  const queryClient = useQueryClient();
  const technicianId = useAuthStore((s) => s.profile?.id);

  return useMutation({
    mutationFn: async ({
      newItemId,
      oldItemSerial,
    }: LogReplacementInput): Promise<ComponentReplacement> => {
      if (!technicianId) throw new Error("You're not signed in.");

      const { data, error } = await supabase.rpc("log_component_replacement", {
        p_call_id: callId,
        p_new_item_id: newItemId,
        p_old_item_serial: oldItemSerial.trim(),
        p_technician_id: technicianId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
      queryClient.invalidateQueries({ queryKey: ["component_replacements", callId] });
    },
  });
}
