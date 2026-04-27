import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const createServerClientMock = vi.fn();
const cookiesMock = vi.fn();
const exchangeCodeForSessionMock = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

describe("GET /auth/callback", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    cookiesMock.mockResolvedValue({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    });

    createServerClientMock.mockReturnValue({
      auth: {
        exchangeCodeForSession: exchangeCodeForSessionMock,
      },
    });
  });

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
  });

  it("redirects missing code to a safe internal next path", async () => {
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(
      new NextRequest("http://localhost/auth/callback?next=/project/42?view=plan"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/project/42?view=plan");
  });

  it("redirects external and protocol-relative next values to /dashboard", async () => {
    const { GET } = await import("@/app/auth/callback/route");

    const externalResponse = await GET(
      new NextRequest("http://localhost/auth/callback?next=https://evil.example/path"),
    );
    expect(externalResponse.headers.get("location")).toBe("http://localhost/dashboard");

    const protocolRelativeResponse = await GET(
      new NextRequest("http://localhost/auth/callback?next=//evil.example/path"),
    );
    expect(protocolRelativeResponse.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("uses sanitized redirect when Supabase config is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(
      new NextRequest("http://localhost/auth/callback?code=abc123&next=https://evil.example/path"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("exchanges auth code and redirects to sanitized internal next path", async () => {
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(
      new NextRequest("http://localhost/auth/callback?code=abc123&next=/project/99"),
    );

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("abc123");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/project/99");
  });
});
