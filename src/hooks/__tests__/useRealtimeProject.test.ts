import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRealtimeProject } from "@/hooks/useRealtimeProject";
import { subscribeToProject, unsubscribeFromProject } from "@/lib/realtime";
import { createBrowserClient } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  createBrowserClient: vi.fn(),
}));

vi.mock("@/lib/realtime", () => ({
  subscribeToProject: vi.fn(),
  unsubscribeFromProject: vi.fn(),
}));

describe("useRealtimeProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("subscribes on mount and unsubscribes on unmount", () => {
    const supabase = { id: "client" };
    const channel = { id: "channel" };
    const onRemoteUpdate = vi.fn();

    vi.mocked(createBrowserClient).mockReturnValue(supabase as any);
    vi.mocked(subscribeToProject).mockReturnValue(channel as any);

    const { unmount } = renderHook(() => useRealtimeProject("project-1", onRemoteUpdate));

    expect(subscribeToProject).toHaveBeenCalledWith(supabase, "project-1", expect.any(Function));

    unmount();

    expect(unsubscribeFromProject).toHaveBeenCalledWith(supabase, channel);
  });

  it("does nothing when supabase is not configured", () => {
    const onRemoteUpdate = vi.fn();
    vi.mocked(createBrowserClient).mockReturnValue(null as any);

    const { unmount } = renderHook(() => useRealtimeProject("project-1", onRemoteUpdate));

    unmount();

    expect(subscribeToProject).not.toHaveBeenCalled();
    expect(unsubscribeFromProject).not.toHaveBeenCalled();
  });

  it("debounces multiple rapid events into a single callback", () => {
    const supabase = { id: "client" };
    const channel = { id: "channel" };
    const onRemoteUpdate = vi.fn();
    let subscriptionHandler: (() => void) | null = null;

    vi.mocked(createBrowserClient).mockReturnValue(supabase as any);
    vi.mocked(subscribeToProject).mockImplementation((_client, _projectId, handler) => {
      subscriptionHandler = handler;
      return channel as any;
    });

    renderHook(() => useRealtimeProject("project-1", onRemoteUpdate));

    subscriptionHandler?.();
    subscriptionHandler?.();
    subscriptionHandler?.();

    vi.advanceTimersByTime(299);
    expect(onRemoteUpdate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onRemoteUpdate).toHaveBeenCalledTimes(1);
  });

  it("cancels pending debounce work on cleanup", () => {
    const supabase = { id: "client" };
    const channel = { id: "channel" };
    const onRemoteUpdate = vi.fn();
    let subscriptionHandler: (() => void) | null = null;

    vi.mocked(createBrowserClient).mockReturnValue(supabase as any);
    vi.mocked(subscribeToProject).mockImplementation((_client, _projectId, handler) => {
      subscriptionHandler = handler;
      return channel as any;
    });

    const { unmount } = renderHook(() => useRealtimeProject("project-1", onRemoteUpdate));

    subscriptionHandler?.();
    unmount();
    vi.runAllTimers();

    expect(onRemoteUpdate).not.toHaveBeenCalled();
    expect(unsubscribeFromProject).toHaveBeenCalledWith(supabase, channel);
  });
});
