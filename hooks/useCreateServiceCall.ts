import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { ServiceCall } from "../types/database.types";

export interface NewServiceCallInput {
  customer_name: string;
  address: string;
  work_description: string;
  assigned_technician_id: string | null;
}

export function useCreateServiceCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NewServiceCallInput): Promise<ServiceCall> => {
      const { data, error } = await supabase
        .from("service_calls")
        .insert({
          customer_name: input.customer_name.trim(),
          address: input.address.trim() || null,
          work_description: input.work_description.trim() || null,
          assigned_technician_id: input.assigned_technician_id,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_calls"] });
    },
  });
}
