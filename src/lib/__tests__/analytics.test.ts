import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("lib/analytics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    window.sessionStorage.clear();

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");

    Object.defineProperty(window, "screen", {
      configurable: true,
      value: {
        width: 1440,
        height: 900,
      },
    });

    Object.defineProperty(document, "referrer", {
      configurable: true,
      value: "https://referrer.example",
    });

    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("trackEvent sends the expected payload to Supabase REST", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { trackEvent } = await import("@/lib/analytics");

    await trackEvent("cta_click", { button: "hero_get_started_free" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/events",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: "public-anon-key",
          Authorization: "Bearer public-anon-key",
          Prefer: "return=minimal",
        }),
      }),
    );

    const request = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(request?.body as string);

    expect(body.user_id).toBeNull();
    expect(body.event).toBe("cta_click");
    expect(body.session_id).toMatch(/^[a-f0-9-]+$/i);
    expect(body.data).toEqual(
      expect.objectContaining({
        button: "hero_get_started_free",
        page: "/",
        url: window.location.href,
        referrer: "https://referrer.example",
        user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        screen_width: 1440,
        screen_height: 900,
      }),
    );
  });

  it("generates and persists a session_id for the browser session", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { trackEvent } = await import("@/lib/analytics");

    await trackEvent("page_view");
    await trackEvent("dashboard_view");

    const firstPayload = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    const secondPayload = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);

    expect(firstPayload.session_id).toBeTruthy();
    expect(secondPayload.session_id).toBe(firstPayload.session_id);
    expect(window.sessionStorage.getItem("analytics-session-id")).toBe(firstPayload.session_id);
  });

  it("falls back to fetch when sendBeacon cannot deliver a page unload event", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const sendBeaconMock = vi.fn().mockReturnValue(false);
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: sendBeaconMock,
    });

    const { trackPageUnload } = await import("@/lib/analytics");

    await trackPageUnload({ reason: "navigation" });

    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fallbackPayload = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(fallbackPayload.event).toBe("page_unload");
    expect(fallbackPayload.data).toEqual(expect.objectContaining({ reason: "navigation" }));
  });

  it("no-ops when Supabase analytics is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { trackEvent } = await import("@/lib/analytics");

    await trackEvent("page_view");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem("analytics-session-id")).toBeNull();
  });
});
