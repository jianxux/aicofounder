import { beforeEach, describe, expect, it, vi } from "vitest";

const createBrowserClientMock = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: createBrowserClientMock,
}));

const importSupabase = async () => {
  vi.resetModules();
  return import("@/lib/supabase");
};

describe("lib/supabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("reports configured and creates a browser client when env vars are present", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    createBrowserClientMock.mockReturnValue({ kind: "client" });

    const { createBrowserClient, isSupabaseConfigured } = await importSupabase();

    expect(isSupabaseConfigured()).toBe(true);
    expect(createBrowserClient()).toEqual({ kind: "client" });
    expect(createBrowserClientMock).toHaveBeenCalledWith("https://example.supabase.co", "anon-key");
  });

  it("reports unconfigured and returns null when env vars are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const { createBrowserClient, isSupabaseConfigured } = await importSupabase();

    expect(isSupabaseConfigured()).toBe(false);
    expect(createBrowserClient()).toBeNull();
    expect(createBrowserClientMock).not.toHaveBeenCalled();
  });
});
