import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const importAnalytics = async () => {
  vi.resetModules();
  return import("@/lib/analytics");
};

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

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: crypto,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("trackEvent sends the expected payload to Supabase REST", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { trackEvent } = await importAnalytics();

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

    const { trackEvent } = await importAnalytics();

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

    const { trackPageUnload } = await importAnalytics();

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

    const { trackEvent } = await importAnalytics();

    await trackEvent("page_view");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem("analytics-session-id")).toBeNull();
  });

  it("uses an existing session id when one is already stored", async () => {
    window.sessionStorage.setItem("analytics-session-id", "persisted-session");

    const { getSessionId } = await importAnalytics();

    expect(getSessionId()).toBe("persisted-session");
  });

  it("falls back to a time-based session id when crypto.randomUUID is unavailable", async () => {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: undefined,
    });
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    vi.spyOn(Math, "random").mockReturnValue(0.123456789);

    const { getSessionId } = await importAnalytics();

    expect(getSessionId()).toBe("18bcfe568001f9add3739635f");
  });

  it("uses beacon transport without fetch when sendBeacon succeeds", async () => {
    const fetchMock = vi.fn();
    const sendBeaconMock = vi.fn().mockReturnValue(true);
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: sendBeaconMock,
    });

    const { trackPageUnload } = await importAnalytics();

    await trackPageUnload({ reason: "tab-close" });

    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to fetch when beacon transport is unavailable", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: undefined,
    });

    const { trackPageUnload } = await importAnalytics();

    await trackPageUnload({ reason: "refresh" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to fetch when sendBeacon throws", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn(() => {
        throw new Error("beacon failed");
      }),
    });

    const { trackPageUnload } = await importAnalytics();

    await trackPageUnload({ reason: "navigation" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("swallows fetch errors for best-effort analytics", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network failed"));
    vi.stubGlobal("fetch", fetchMock);

    const { trackEvent } = await importAnalytics();

    await expect(trackEvent("page_view")).resolves.toBeUndefined();
  });

  it("fetches analytics events for a 7-day range", async () => {
    const rows = [
      {
        id: "event-1",
        user_id: null,
        session_id: "session-1",
        event: "page_view",
        data: { page: "/" },
        ip: null,
        created_at: "2024-01-10T10:00:00.000Z",
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(rows),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchAnalyticsEvents } = await importAnalytics();

    await expect(fetchAnalyticsEvents("7d", 25)).resolves.toEqual(rows);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("limit=25"),
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
      }),
    );
    expect(fetchMock.mock.calls[0]?.[0]).toContain("created_at=gte.");
  });

  it("fetches analytics events without a created_at filter for the all-time range", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([]),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchAnalyticsEvents } = await importAnalytics();

    await expect(fetchAnalyticsEvents("all")).resolves.toEqual([]);
    expect(fetchMock.mock.calls[0]?.[0]).not.toContain("created_at=gte.");
  });

  it("returns an empty list when the analytics fetch response is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchAnalyticsEvents } = await importAnalytics();

    await expect(fetchAnalyticsEvents("today")).resolves.toEqual([]);
  });

  it("returns an empty list when the analytics response is not an array", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ rows: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchAnalyticsEvents } = await importAnalytics();

    await expect(fetchAnalyticsEvents("30d")).resolves.toEqual([]);
  });

  it("returns an empty list when analytics fetching throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    const { fetchAnalyticsEvents } = await importAnalytics();

    await expect(fetchAnalyticsEvents("30d")).resolves.toEqual([]);
  });

  it("reports whether analytics is configured", async () => {
    const { isAnalyticsConfigured } = await importAnalytics();

    expect(isAnalyticsConfigured()).toBe(true);

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const analyticsWithoutConfig = await importAnalytics();

    expect(analyticsWithoutConfig.isAnalyticsConfigured()).toBe(false);
  });
});
