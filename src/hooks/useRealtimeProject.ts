"use client";

import { useEffect, useRef } from "react";
import { subscribeToProject, unsubscribeFromProject } from "@/lib/realtime";
import { createBrowserClient } from "@/lib/supabase";

export function useRealtimeProject(projectId: string, onRemoteUpdate: () => void) {
  const onRemoteUpdateRef = useRef(onRemoteUpdate);

  useEffect(() => {
    onRemoteUpdateRef.current = onRemoteUpdate;
  }, [onRemoteUpdate]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const supabase = createBrowserClient();

    if (!supabase) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const handleRemoteUpdate = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        timeoutId = null;
        onRemoteUpdateRef.current();
      }, 300);
    };

    const channel = subscribeToProject(supabase, projectId, handleRemoteUpdate);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      unsubscribeFromProject(supabase, channel);
    };
  }, [projectId]);
}
