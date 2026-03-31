import { afterEach, describe, expect, it, vi } from "vitest";

const createServerClientMock = vi.fn();
const cookiesMock = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

describe("createServerSupabaseClient", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    }

    if (originalAnonKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
    }

    createServerClientMock.mockReset();
    cookiesMock.mockReset();
  });

  it("returns null when env vars are not set", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { createServerSupabaseClient } = await import("@/lib/supabase-server");

    await expect(createServerSupabaseClient()).resolves.toBeNull();
    expect(cookiesMock).not.toHaveBeenCalled();
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("creates a server client when env vars are set", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    const cookieStore = {
      getAll: vi.fn(() => [{ name: "sb", value: "token" }]),
      set: vi.fn(),
    };
    const client = { auth: {} };

    cookiesMock.mockResolvedValue(cookieStore);
    createServerClientMock.mockReturnValue(client);

    const { createServerSupabaseClient } = await import("@/lib/supabase-server");

    await expect(createServerSupabaseClient()).resolves.toBe(client);
    expect(cookiesMock).toHaveBeenCalledTimes(1);
    expect(createServerClientMock).toHaveBeenCalledTimes(1);

    const [url, anonKey, options] = createServerClientMock.mock.calls[0] as [
      string,
      string,
      {
        cookies: {
          getAll: () => unknown;
          setAll: (
            cookiesToSet: Array<{
              name: string;
              value: string;
              options?: Record<string, unknown>;
            }>,
          ) => void;
        };
      },
    ];

    expect(url).toBe("https://example.supabase.co");
    expect(anonKey).toBe("anon-key");
    expect(options.cookies.getAll()).toEqual([{ name: "sb", value: "token" }]);

    options.cookies.setAll([
      {
        name: "sb-access-token",
        value: "next-token",
        options: { httpOnly: true },
      },
      {
        name: "sb-refresh-token",
        value: "refresh-token",
      },
    ]);

    expect(cookieStore.set).toHaveBeenNthCalledWith(
      1,
      "sb-access-token",
      "next-token",
      { httpOnly: true },
    );
    expect(cookieStore.set).toHaveBeenNthCalledWith(
      2,
      "sb-refresh-token",
      "refresh-token",
      undefined,
    );
  });
});
