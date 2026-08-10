import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { ServiceCall } from "../types/database.types";

/** Service calls assigned to a specific technician, newest first. */
export function useMyServiceCalls(technicianId: string | undefined) {
  return useQuery({
    queryKey: ["service_calls", "mine", technicianId],
    queryFn: async (): Promise<ServiceCall[]> => {
      const { data, error } = await supabase
        .from("service_calls")
        .select("*")
        .eq("assigned_technician_id", technicianId as string)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!technicianId,
  });
}
