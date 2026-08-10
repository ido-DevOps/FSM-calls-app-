import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types/database.types";

/** All technician profiles — for assignment and dispatch pickers. */
export function useTechnicians() {
  return useQuery({
    queryKey: ["profiles", "technicians"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "technician")
        .order("full_name", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}
