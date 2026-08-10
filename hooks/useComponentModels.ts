import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export interface ComponentModel {
  id: string;
  category: string;
  model_name: string;
}

/** The model catalog — one row per (category, model), used for the Add Item dropdowns. */
export function useComponentModels() {
  return useQuery({
    queryKey: ["component_models"],
    queryFn: async (): Promise<ComponentModel[]> => {
      const { data, error } = await supabase
        .from("component_models")
        .select("id, category, model_name")
        .order("category", { ascending: true })
        .order("model_name", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}
