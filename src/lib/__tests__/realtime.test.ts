import { describe, expect, it, vi } from "vitest";
import { subscribeToProject, unsubscribeFromProject } from "@/lib/realtime";

type OnHandler = (payload?: unknown) => void;

function createChannel() {
  const handlers: OnHandler[] = [];

  const channel = {
    on: vi.fn((_type, _config, callback: OnHandler) => {
      handlers.push(callback);
      return channel;
    }),
    subscribe: vi.fn(() => channel),
  };

  return { channel, handlers };
}

describe("realtime", () => {
  it("subscribeToProject creates a channel with the expected filters", () => {
    const { channel } = createChannel();
    const supabase = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    };
    const onUpdate = vi.fn();

    const result = subscribeToProject(supabase as any, "project-123", onUpdate);

    expect(result).toBe(channel);
    expect(supabase.channel).toHaveBeenCalledWith("project-sync-project-123");
    expect(channel.on).toHaveBeenCalledTimes(5);
    expect(channel.on).toHaveBeenNthCalledWith(
      1,
      "postgres_changes",
      { event: "*", schema: "public", table: "projects", filter: "id=eq.project-123" },
      onUpdate,
    );
    expect(channel.on).toHaveBeenNthCalledWith(
      2,
      "postgres_changes",
      { event: "*", schema: "public", table: "messages", filter: "project_id=eq.project-123" },
      onUpdate,
    );
    expect(channel.on).toHaveBeenNthCalledWith(
      3,
      "postgres_changes",
      { event: "*", schema: "public", table: "canvas_items", filter: "project_id=eq.project-123" },
      onUpdate,
    );
    expect(channel.on).toHaveBeenNthCalledWith(
      4,
      "postgres_changes",
      { event: "*", schema: "public", table: "phases", filter: "project_id=eq.project-123" },
      onUpdate,
    );
    expect(channel.on).toHaveBeenNthCalledWith(
      5,
      "postgres_changes",
      { event: "*", schema: "public", table: "phase_tasks", filter: "project_id=eq.project-123" },
      onUpdate,
    );
    expect(channel.subscribe).toHaveBeenCalledTimes(1);
  });

  it("invokes the update callback for postgres change events", () => {
    const { channel, handlers } = createChannel();
    const supabase = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    };
    const onUpdate = vi.fn();

    subscribeToProject(supabase as any, "project-123", onUpdate);

    for (const handler of handlers) {
      handler({ eventType: "UPDATE" });
    }

    expect(onUpdate).toHaveBeenCalledTimes(5);
  });

  it("unsubscribeFromProject removes the channel", () => {
    const { channel } = createChannel();
    const supabase = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    };

    unsubscribeFromProject(supabase as any, channel as any);

    expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
  });

  it("returns early for nullish inputs", () => {
    const onUpdate = vi.fn();
    const { channel } = createChannel();
    const supabase = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    };

    expect(subscribeToProject(null, "project-123", onUpdate)).toBeNull();
    expect(subscribeToProject(supabase as any, undefined, onUpdate)).toBeNull();
    expect(subscribeToProject(supabase as any, "project-123", undefined)).toBeNull();

    unsubscribeFromProject(undefined, channel as any);
    unsubscribeFromProject(supabase as any, null);

    expect(supabase.channel).not.toHaveBeenCalled();
    expect(supabase.removeChannel).not.toHaveBeenCalled();
  });
});
