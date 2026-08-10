import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { ComponentReplacement } from "../types/database.types";

export interface ComponentReplacementWithRelations extends ComponentReplacement {
  new_item: { model_name: string; serial_number: string } | null;
  technician: { full_name: string | null } | null;
}

/** Replacement history already logged for a call, newest first. */
export function useCallReplacements(callId: string | undefined) {
  return useQuery({
    queryKey: ["component_replacements", callId],
    queryFn: async (): Promise<ComponentReplacementWithRelations[]> => {
      const { data, error } = await supabase
        .from("component_replacements")
        .select("*, new_item:inventory_items(model_name, serial_number), technician:profiles(full_name)")
        .eq("call_id", callId as string)
        .order("replaced_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as ComponentReplacementWithRelations[];
    },
    enabled: !!callId,
  });
}
