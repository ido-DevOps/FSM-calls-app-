import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { ServiceCall } from "../types/database.types";

/** A single service call by id, for the call details screen. */
export function useServiceCall(id: string | undefined) {
  return useQuery({
    queryKey: ["service_calls", id],
    queryFn: async (): Promise<ServiceCall> => {
      const { data, error } = await supabase
        .from("service_calls")
        .select("*")
        .eq("id", id as string)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
