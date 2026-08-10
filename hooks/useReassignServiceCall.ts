import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

/** Admin/warehouse action: change (or clear) who a call is assigned to. */
export function useReassignServiceCall(callId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (technicianId: string | null) => {
      const { error } = await supabase
        .from("service_calls")
        .update({ assigned_technician_id: technicianId })
        .eq("id", callId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_calls"] });
    },
  });
}
