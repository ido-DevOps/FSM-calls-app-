import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { CallPhoto } from "../types/database.types";

/** Photos already uploaded for a call, oldest first (stable grid order). */
export function useCallPhotos(callId: string | undefined) {
  return useQuery({
    queryKey: ["call_photos", callId],
    queryFn: async (): Promise<CallPhoto[]> => {
      const { data, error } = await supabase
        .from("call_photos")
        .select("*")
        .eq("call_id", callId as string)
        .order("uploaded_at", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!callId,
  });
}
