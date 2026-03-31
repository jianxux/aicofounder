import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

type ProjectSyncClient = Pick<SupabaseClient, "channel" | "removeChannel">;

export function subscribeToProject(
  supabaseClient: ProjectSyncClient | null | undefined,
  projectId: string | null | undefined,
  onUpdate: (() => void) | null | undefined,
): RealtimeChannel | null {
  if (!supabaseClient || !projectId || !onUpdate) {
    return null;
  }

  const channel = supabaseClient.channel(`project-sync-${projectId}`);
  const tables = ["messages", "canvas_items", "phases", "phase_tasks"] as const;

  channel.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "projects", filter: `id=eq.${projectId}` },
    onUpdate,
  );

  for (const table of tables) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter: `project_id=eq.${projectId}` },
      onUpdate,
    );
  }

  channel.subscribe();
  return channel;
}

export function unsubscribeFromProject(
  supabaseClient: ProjectSyncClient | null | undefined,
  channel: RealtimeChannel | null | undefined,
): void {
  if (!supabaseClient || !channel) {
    return;
  }

  void supabaseClient.removeChannel(channel);
}
