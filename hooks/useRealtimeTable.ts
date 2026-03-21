/**
 * Supabase Realtime subscription — production-safe with cleanup.
 * Use for TAT queue, fridge alerts, operational alerts.
 */

import { useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

function sanitize(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/^["']+|["']+$/g, "").trim();
}

const supabaseUrl = sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = sanitize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function useRealtimeTable<T>(
  table: string,
  filter: string,
  onInsert: (row: T) => void,
  onUpdate?: (row: T) => void
) {
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);

  useEffect(() => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const channel = supabase
      .channel(`${table}:${filter}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table,
          filter,
        },
        (payload) => onInsert(payload.new as T)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table,
          filter,
        },
        (payload) => onUpdate?.(payload.new as T)
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, onInsert, onUpdate]);
}
