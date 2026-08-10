import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { ServiceCall } from "../types/database.types";

export interface ServiceCallWithTechnician extends ServiceCall {
  assigned_technician: { full_name: string | null } | null;
}

const QUERY_KEY = ["service_calls", "all"];

/**
 * Every service call, for the admin dispatch overview. Stays live via a
 * Supabase Realtime subscription (see supabase/migrations/20260101030000_*.sql,
 * which adds service_calls to the realtime publication) instead of relying
 * on manual pull-to-refresh.
 */
export function useAllServiceCalls() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<ServiceCallWithTechnician[]> => {
      const { data, error } = await supabase
        .from("service_calls")
        .select("*, assigned_technician:profiles(full_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as ServiceCallWithTechnician[];
    },
  });

  useEffect(() => {
    // A fixed channel name caused a real crash: Supabase's realtime client
    // keys channels by topic, so remounting this hook (navigating away and
    // back, Fast Refresh, etc.) before the previous channel finished
    // tearing down meant a second `.on()` landed on an already-subscribed
    // channel, which throws. A unique name per mount makes that impossible.
    const channel = supabase
      .channel(`service_calls_overview_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_calls" },
        () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
