import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { CallStatus, ServiceCall } from "../types/database.types";

/** Transitions a service call's status (e.g. "Start Repair" -> in_progress). */
export function useUpdateCallStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (status: CallStatus): Promise<ServiceCall> => {
      const patch: Partial<ServiceCall> = { status };
      if (status === "completed") {
        patch.closed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("service_calls")
        .update(patch)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["service_calls", id], updated);
      queryClient.invalidateQueries({ queryKey: ["service_calls", "mine"] });
    },
  });
}
