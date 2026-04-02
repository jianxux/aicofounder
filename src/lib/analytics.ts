"use client";

export type AnalyticsEventData = Record<string, unknown>;

export type AnalyticsEventRow = {
  id: string;
  user_id: string | null;
  session_id: string;
  event: string;
  data: AnalyticsEventData | null;
  ip: string | null;
  created_at: string;
};

export type AnalyticsRange = "today" | "7d" | "30d" | "all";

type TrackEventOptions = {
  transport?: "fetch" | "beacon";
};

type EventPayload = {
  user_id: string | null;
  session_id: string;
  event: string;
  data: AnalyticsEventData;
};

const SESSION_STORAGE_KEY = "analytics-session-id";

function getSupabaseAnalyticsConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    restUrl: `${supabaseUrl}/rest/v1/events`,
  };
}

function isBrowser() {
  return typeof window !== "undefined";
}

function generateSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }

  const randomPart = Math.random().toString(16).slice(2);
  return `${Date.now().toString(16)}${randomPart}`;
}

export function getSessionId() {
  if (!isBrowser()) {
    return "";
  }

  const existingSessionId = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

  if (existingSessionId) {
    return existingSessionId;
  }

  const sessionId = generateSessionId();
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  return sessionId;
}

function buildEventData(data: AnalyticsEventData = {}) {
  const locationData =
    isBrowser() && window.location
      ? {
          page: window.location.pathname,
          url: window.location.href,
        }
      : {};

  const screenData =
    isBrowser() && window.screen
      ? {
          screen_width: window.screen.width,
          screen_height: window.screen.height,
        }
      : {};

  const navigatorData =
    typeof navigator !== "undefined"
      ? {
          user_agent: navigator.userAgent,
        }
      : {};

  const referrerData =
    typeof document !== "undefined"
      ? {
          referrer: document.referrer || null,
        }
      : {};

  return {
    ...locationData,
    ...referrerData,
    ...navigatorData,
    ...screenData,
    ...data,
  };
}

function buildPayload(eventName: string, data?: AnalyticsEventData): EventPayload {
  return {
    user_id: null,
    session_id: getSessionId(),
    event: eventName,
    data: buildEventData(data),
  };
}

function buildHeaders(apikey: string) {
  return {
    "Content-Type": "application/json",
    apikey,
    Authorization: `Bearer ${apikey}`,
    Prefer: "return=minimal",
  };
}

async function sendWithFetch(url: string, apikey: string, payload: EventPayload) {
  await fetch(url, {
    method: "POST",
    headers: buildHeaders(apikey),
    body: JSON.stringify(payload),
    keepalive: true,
  });
}

function sendWithBeacon(url: string, payload: EventPayload) {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") {
    return false;
  }

  try {
    const body = new Blob([JSON.stringify(payload)], { type: "application/json" });
    return navigator.sendBeacon(url, body);
  } catch {
    return false;
  }
}

export async function trackEvent(
  eventName: string,
  data?: AnalyticsEventData,
  options: TrackEventOptions = {},
) {
  const config = getSupabaseAnalyticsConfig();

  if (!config || !isBrowser()) {
    return;
  }

  const payload = buildPayload(eventName, data);

  if (options.transport === "beacon") {
    const beaconSent = sendWithBeacon(config.restUrl, payload);

    if (beaconSent) {
      return;
    }
  }

  try {
    await sendWithFetch(config.restUrl, config.supabaseAnonKey, payload);
  } catch {
    // Best-effort analytics should never interrupt the UI.
  }
}

export async function trackPageUnload(data?: AnalyticsEventData) {
  await trackEvent("page_unload", data, { transport: "beacon" });
}

function getRangeStart(range: AnalyticsRange, now = new Date()) {
  if (range === "all") {
    return null;
  }

  const start = new Date(now);

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }

  const days = range === "7d" ? 7 : 30;
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

export async function fetchAnalyticsEvents(range: AnalyticsRange, limit = 5000): Promise<AnalyticsEventRow[]> {
  const config = getSupabaseAnalyticsConfig();

  if (!config) {
    return [];
  }

  const params = new URLSearchParams({
    select: "id,user_id,session_id,event,data,ip,created_at",
    order: "created_at.desc",
    limit: `${limit}`,
  });

  const rangeStart = getRangeStart(range);

  if (rangeStart) {
    params.set("created_at", `gte.${rangeStart}`);
  }

  try {
    const response = await fetch(`${config.restUrl}?${params.toString()}`, {
      method: "GET",
      headers: buildHeaders(config.supabaseAnonKey),
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as AnalyticsEventRow[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function isAnalyticsConfigured() {
  return Boolean(getSupabaseAnalyticsConfig());
}
