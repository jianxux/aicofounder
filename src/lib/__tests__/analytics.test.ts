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

  it("uses authenticated keepalive fetch for Supabase page unload events", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const sendBeaconMock = vi.fn().mockReturnValue(true);
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: sendBeaconMock,
    });

    const { trackPageUnload } = await importAnalytics();

    await trackPageUnload({ reason: "navigation" });

    expect(sendBeaconMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/events",
      expect.objectContaining({
        keepalive: true,
        headers: expect.objectContaining({
          apikey: "public-anon-key",
          Authorization: "Bearer public-anon-key",
        }),
      }),
    );
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

  it("uses beacon transport without fetch when a same-origin beacon endpoint is configured", async () => {
    const fetchMock = vi.fn();
    const sendBeaconMock = vi.fn().mockReturnValue(true);
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_BEACON_URL", "/api/analytics/beacon");
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

  it("falls back to fetch when configured beacon transport is unavailable", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_BEACON_URL", "/api/analytics/beacon");
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: undefined,
    });

    const { trackPageUnload } = await importAnalytics();

    await trackPageUnload({ reason: "refresh" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to fetch when configured sendBeacon throws", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_BEACON_URL", "/api/analytics/beacon");
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

  it("computes artifact flow metrics with deduped creations and follow-up edits", async () => {
    const { getArtifactFlowMetrics } = await importAnalytics();

    const metrics = getArtifactFlowMetrics([
      {
        id: "intake-1",
        user_id: null,
        session_id: "session-1",
        event: "artifact_intake_submitted",
        data: { project_id: "project-1" },
        ip: null,
        created_at: "2025-01-10T00:00:00.000Z",
      },
      {
        id: "create-1",
        user_id: null,
        session_id: "session-1",
        event: "artifact_created",
        data: { project_id: "project-1", artifact_id: "artifact-validation-scorecard", artifact_type: "validation-scorecard" },
        ip: null,
        created_at: "2025-01-10T00:01:00.000Z",
      },
      {
        id: "create-1-repeat",
        user_id: null,
        session_id: "session-1",
        event: "artifact_created",
        data: { project_id: "project-1", artifact_id: "artifact-validation-scorecard", artifact_type: "validation-scorecard" },
        ip: null,
        created_at: "2025-01-10T00:02:00.000Z",
      },
      {
        id: "edit-1",
        user_id: null,
        session_id: "session-1",
        event: "artifact_followup_edit",
        data: { project_id: "project-1", artifact_id: "artifact-validation-scorecard", artifact_type: "validation-scorecard" },
        ip: null,
        created_at: "2025-01-10T00:03:00.000Z",
      },
      {
        id: "edit-1-repeat",
        user_id: null,
        session_id: "session-1",
        event: "artifact_followup_edit",
        data: { project_id: "project-1", artifact_id: "artifact-validation-scorecard", artifact_type: "validation-scorecard" },
        ip: null,
        created_at: "2025-01-10T00:04:00.000Z",
      },
      {
        id: "switch-1",
        user_id: null,
        session_id: "session-1",
        event: "workspace_artifact_switched",
        data: { project_id: "project-1", artifact_id: "artifact-customer-research-memo", artifact_type: "customer-research-memo" },
        ip: null,
        created_at: "2025-01-10T00:05:00.000Z",
      },
    ]);

    expect(metrics).toEqual({
      intakeSubmittedCount: 1,
      intakeSubmittedProjectsWithArtifactCreationCount: 1,
      artifactCreatedCount: 1,
      artifactsWithFollowUpEditsCount: 1,
      workspaceArtifactSwitchCount: 1,
      artifactCreationRate: 1,
      followUpEditRate: 1,
      artifactCreationRateNumerator: 1,
      artifactCreationRateDenominator: 1,
      followUpEditRateNumerator: 1,
      followUpEditRateDenominator: 1,
    });
  });

  it("handles empty analytics, malformed payloads, repeated edits, and legacy events gracefully", async () => {
    const { getArtifactFlowMetrics } = await importAnalytics();

    expect(getArtifactFlowMetrics([])).toEqual({
      intakeSubmittedCount: 0,
      intakeSubmittedProjectsWithArtifactCreationCount: 0,
      artifactCreatedCount: 0,
      artifactsWithFollowUpEditsCount: 0,
      workspaceArtifactSwitchCount: 0,
      artifactCreationRate: null,
      followUpEditRate: null,
      artifactCreationRateNumerator: 0,
      artifactCreationRateDenominator: 0,
      followUpEditRateNumerator: 0,
      followUpEditRateDenominator: 0,
    });

    const metrics = getArtifactFlowMetrics([
      {
        id: "legacy",
        user_id: null,
        session_id: "session-legacy",
        event: "project_created",
        data: { project_id: "legacy-project" },
        ip: null,
        created_at: "2025-01-10T00:00:00.000Z",
      },
      {
        id: "bad-intake",
        user_id: null,
        session_id: "",
        event: "artifact_intake_submitted",
        data: null,
        ip: null,
        created_at: "2025-01-10T00:01:00.000Z",
      },
      {
        id: "fallback-create",
        user_id: null,
        session_id: "session-2",
        event: "artifact_created",
        data: { artifact_type: "customer-research-memo" },
        ip: null,
        created_at: "2025-01-10T00:02:00.000Z",
      },
      {
        id: "orphan-edit",
        user_id: null,
        session_id: "session-3",
        event: "artifact_followup_edit",
        data: { artifact_type: "validation-scorecard" },
        ip: null,
        created_at: "2025-01-10T00:03:00.000Z",
      },
      {
        id: "bad-switch",
        user_id: null,
        session_id: "session-4",
        event: "workspace_artifact_switched",
        data: { previous_artifact_id: "artifact-validation-scorecard" },
        ip: null,
        created_at: "2025-01-10T00:04:00.000Z",
      },
    ]);

    expect(metrics).toEqual({
      intakeSubmittedCount: 0,
      intakeSubmittedProjectsWithArtifactCreationCount: 0,
      artifactCreatedCount: 1,
      artifactsWithFollowUpEditsCount: 0,
      workspaceArtifactSwitchCount: 0,
      artifactCreationRate: null,
      followUpEditRate: 0,
      artifactCreationRateNumerator: 0,
      artifactCreationRateDenominator: 0,
      followUpEditRateNumerator: 0,
      followUpEditRateDenominator: 1,
    });
  });

  it("uses project-level intake conversion when one intake creates multiple artifacts", async () => {
    const { getArtifactFlowMetrics } = await importAnalytics();

    const metrics = getArtifactFlowMetrics([
      {
        id: "intake-1",
        user_id: null,
        session_id: "session-1",
        event: "artifact_intake_submitted",
        data: { project_id: "project-1" },
        ip: null,
        created_at: "2025-01-10T00:00:00.000Z",
      },
      {
        id: "create-1",
        user_id: null,
        session_id: "session-1",
        event: "artifact_created",
        data: { project_id: "project-1", artifact_id: "artifact-1", artifact_type: "validation-scorecard" },
        ip: null,
        created_at: "2025-01-10T00:01:00.000Z",
      },
      {
        id: "create-2",
        user_id: null,
        session_id: "session-1",
        event: "artifact_created",
        data: { project_id: "project-1", artifact_id: "artifact-2", artifact_type: "customer-research-memo" },
        ip: null,
        created_at: "2025-01-10T00:02:00.000Z",
      },
      {
        id: "edit-1",
        user_id: null,
        session_id: "session-1",
        event: "artifact_followup_edit",
        data: { project_id: "project-1", artifact_id: "artifact-2", artifact_type: "customer-research-memo" },
        ip: null,
        created_at: "2025-01-10T00:03:00.000Z",
      },
    ]);

    expect(metrics).toEqual({
      intakeSubmittedCount: 1,
      intakeSubmittedProjectsWithArtifactCreationCount: 1,
      artifactCreatedCount: 2,
      artifactsWithFollowUpEditsCount: 1,
      workspaceArtifactSwitchCount: 0,
      artifactCreationRate: 1,
      followUpEditRate: 0.5,
      artifactCreationRateNumerator: 1,
      artifactCreationRateDenominator: 1,
      followUpEditRateNumerator: 1,
      followUpEditRateDenominator: 2,
    });
  });
});
