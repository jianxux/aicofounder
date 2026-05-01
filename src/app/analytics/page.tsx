"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ARTIFACT_CREATED_EVENT,
  ARTIFACT_FOLLOW_UP_EDIT_EVENT,
  ARTIFACT_INTAKE_SUBMITTED_EVENT,
  WORKSPACE_ARTIFACT_SWITCHED_EVENT,
  type ArtifactFlowMetrics,
  type AnalyticsEventRow,
  type AnalyticsRange,
  fetchAnalyticsEvents,
  getArtifactFlowMetrics,
  isAnalyticsConfigured,
} from "@/lib/analytics";

const PAGE_BACKGROUND = "#ffffff";
const CARD_BACKGROUND = "#f5f5f4";
const CARD_BORDER = "#d6d3d1";
const TEXT_PRIMARY = "#1c1917";
const TEXT_MUTED = "#78716c";

const RANGE_OPTIONS: Array<{ label: string; value: AnalyticsRange }> = [
  { label: "Today", value: "today" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "All time", value: "all" },
];

type MetricCard = {
  label: string;
  value: string;
  helper: string;
};

type BreakdownRow = {
  label: string;
  count: number;
};

type GuidanceRow = {
  title: string;
  signal: string;
  recommendation: string;
};

const LOW_ARTIFACT_CREATION_RATE_THRESHOLD = 0.5;
const LOW_FOLLOW_UP_EDIT_RATE_THRESHOLD = 0.5;
const VALIDATION_SCORECARD_TYPE = "validation-scorecard";
const CUSTOMER_RESEARCH_MEMO_TYPE = "customer-research-memo";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}

function truncateSessionId(sessionId: string) {
  if (sessionId.length <= 12) {
    return sessionId;
  }

  return `${sessionId.slice(0, 8)}...`;
}

function getPageLabel(event: AnalyticsEventRow) {
  const page = typeof event.data?.page === "string" ? event.data.page : undefined;

  if (page) {
    return page;
  }

  const url = typeof event.data?.url === "string" ? event.data.url : undefined;

  if (!url) {
    return "Unknown";
  }

  try {
    return new URL(url).pathname || "Unknown";
  } catch {
    return url;
  }
}

function isMobileUserAgent(userAgent: string) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

function getDeviceLabel(event: AnalyticsEventRow) {
  const userAgent = typeof event.data?.user_agent === "string" ? event.data.user_agent : "";
  return isMobileUserAgent(userAgent) ? "Mobile" : "Desktop";
}

function getLast14DaysPageViews(events: AnalyticsEventRow[]) {
  const counts = new Map<string, number>();
  const now = new Date();

  for (let index = 13; index >= 0; index -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - index);
    const key = day.toISOString().slice(0, 10);
    counts.set(key, 0);
  }

  events
    .filter((event) => event.event === "page_view")
    .forEach((event) => {
      const key = event.created_at.slice(0, 10);

      if (counts.has(key)) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    });

  return [...counts.entries()].map(([date, count]) => ({
    date,
    label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(date)),
    count,
  }));
}

function getBreakdownRows(items: string[]) {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);
}

function getEventDataArtifactType(event: AnalyticsEventRow) {
  const artifactType = event.data?.artifact_type;
  return typeof artifactType === "string" && artifactType.trim().length > 0 ? artifactType.trim() : null;
}

function getFounderGuidanceRows(events: AnalyticsEventRow[], artifactFlow: ArtifactFlowMetrics) {
  const intakeToArtifact: GuidanceRow = {
    title: "Intake-to-artifact",
    signal: "No onboarding samples yet.",
    recommendation: "Collect onboarding samples to measure intake-to-artifact conversion.",
  };

  if (artifactFlow.artifactCreationRate !== null) {
    intakeToArtifact.signal =
      artifactFlow.artifactCreationRate < LOW_ARTIFACT_CREATION_RATE_THRESHOLD
        ? "Artifact creation rate is low."
        : "Artifact creation rate is healthy.";
    intakeToArtifact.recommendation =
      artifactFlow.artifactCreationRate < LOW_ARTIFACT_CREATION_RATE_THRESHOLD
        ? "Inspect onboarding steps and project dropoff before artifact creation."
        : "Intake conversion is stable and ready for deeper review.";
  }

  const followUpDepth: GuidanceRow = {
    title: "Follow-up depth",
    signal: "No generated artifacts yet.",
    recommendation: "Generate artifacts first so follow-up depth can be measured.",
  };

  if (artifactFlow.followUpEditRate !== null) {
    followUpDepth.signal =
      artifactFlow.followUpEditRate < LOW_FOLLOW_UP_EDIT_RATE_THRESHOLD
        ? "Follow-up edit rate is low."
        : "Follow-up edit rate is healthy.";
    followUpDepth.recommendation =
      artifactFlow.followUpEditRate < LOW_FOLLOW_UP_EDIT_RATE_THRESHOLD
        ? "Check whether generated artifacts clearly invite refinement."
        : "Founders are returning to sharpen outputs.";
  }

  const artifactTypes = new Set(
    events
      .filter((event) => [ARTIFACT_CREATED_EVENT, WORKSPACE_ARTIFACT_SWITCHED_EVENT].includes(event.event))
      .map(getEventDataArtifactType)
      .filter((value): value is string => value !== null),
  );
  const hasValidationScorecard = artifactTypes.has(VALIDATION_SCORECARD_TYPE);
  const hasCustomerResearchMemo = artifactTypes.has(CUSTOMER_RESEARCH_MEMO_TYPE);

  const workspaceCoverage: GuidanceRow = {
    title: "Workspace coverage / artifact mix",
    signal: "No artifact type data yet.",
    recommendation: "Create or switch artifacts to understand coverage across artifact types.",
  };

  if (artifactTypes.size > 0) {
    if (hasValidationScorecard && hasCustomerResearchMemo) {
      workspaceCoverage.signal = "Both core artifact types are represented.";
      workspaceCoverage.recommendation = "Coverage includes validation-scorecard and customer-research-memo artifacts.";
    } else if (hasValidationScorecard) {
      workspaceCoverage.signal = "Coverage is missing customer-research-memo artifacts.";
      workspaceCoverage.recommendation = "Add customer-research-memo outputs to expand evidence coverage.";
    } else if (hasCustomerResearchMemo) {
      workspaceCoverage.signal = "Coverage is missing validation-scorecard artifacts.";
      workspaceCoverage.recommendation = "Add validation-scorecard outputs to expand evidence coverage.";
    } else {
      workspaceCoverage.signal = "Artifact mix is unknown.";
      workspaceCoverage.recommendation = "Track validation-scorecard and customer-research-memo artifact_type values for coverage guidance.";
    }
  }

  return [intakeToArtifact, followUpDepth, workspaceCoverage];
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div
      style={{
        border: `1px solid ${CARD_BORDER}`,
        background: CARD_BACKGROUND,
        borderRadius: 24,
        padding: 24,
        color: TEXT_MUTED,
        minHeight: 160,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      {message}
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [events, setEvents] = useState<AnalyticsEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadEvents = async () => {
      setLoading(true);
      // Public dashboard reads use the Supabase anon-key REST headers inside fetchAnalyticsEvents.
      const nextEvents = await fetchAnalyticsEvents(range);

      if (active) {
        setEvents(nextEvents);
        setLoading(false);
      }
    };

    void loadEvents();
    const interval = window.setInterval(() => {
      void loadEvents();
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [range]);

  const artifactFlow = useMemo(() => getArtifactFlowMetrics(events), [events]);

  const metrics = useMemo<MetricCard[]>(() => {
    const totalPageViews = events.filter((event) => event.event === "page_view").length;
    const uniqueVisitors = new Set(events.map((event) => event.session_id)).size;
    const ctaClicks = events.filter((event) => event.event === "cta_click").length;
    const signupsAndLogins = events.filter((event) => event.event === "login_success").length;

    return [
      {
        label: "Total Page Views",
        value: formatNumber(totalPageViews),
        helper: "Events named page_view",
      },
      {
        label: "Unique Visitors",
        value: formatNumber(uniqueVisitors),
        helper: "Distinct session IDs",
      },
      {
        label: "CTA Clicks",
        value: formatNumber(ctaClicks),
        helper: "Landing page CTA activity",
      },
      {
        label: "Signups / Logins",
        value: formatNumber(signupsAndLogins),
        helper: "Successful auth completions",
      },
      {
        label: "Artifact Creation Rate (Project-Level)",
        value: formatPercent(artifactFlow.artifactCreationRate),
        helper: `${formatNumber(artifactFlow.artifactCreationRateNumerator)} of ${formatNumber(
          artifactFlow.artifactCreationRateDenominator,
        )} intake-submitted projects produced at least one artifact`,
      },
      {
        label: "Follow-up Edit Rate (Per Artifact)",
        value: formatPercent(artifactFlow.followUpEditRate),
        helper: `${formatNumber(artifactFlow.followUpEditRateNumerator)} of ${formatNumber(
          artifactFlow.followUpEditRateDenominator,
        )} created artifacts received a follow-up edit`,
      },
      {
        label: "Artifact Creations",
        value: formatNumber(artifactFlow.artifactCreatedCount),
        helper: `Unique artifacts deduped from ${ARTIFACT_CREATED_EVENT} events`,
      },
      {
        label: "Artifact Switches",
        value: formatNumber(artifactFlow.workspaceArtifactSwitchCount),
        helper: `Intentional ${WORKSPACE_ARTIFACT_SWITCHED_EVENT} events`,
      },
    ];
  }, [artifactFlow, events]);

  const dailyPageViews = useMemo(() => getLast14DaysPageViews(events), [events]);
  const topPages = useMemo(() => getBreakdownRows(events.filter((event) => event.event === "page_view").map(getPageLabel)), [events]);
  const topEvents = useMemo(() => getBreakdownRows(events.map((event) => event.event)), [events]);
  const deviceBreakdown = useMemo(() => getBreakdownRows(events.map(getDeviceLabel)), [events]);
  const recentEvents = useMemo(() => events.slice(0, 50), [events]);
  const founderGuidanceRows = useMemo(() => getFounderGuidanceRows(events, artifactFlow), [artifactFlow, events]);
  const maxDailyCount = Math.max(...dailyPageViews.map((day) => day.count), 1);
  const configured = isAnalyticsConfigured();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: PAGE_BACKGROUND,
        color: TEXT_PRIMARY,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px 56px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          <div>
            <Link href="/" style={{ color: TEXT_MUTED, textDecoration: "none", fontSize: 14 }}>
              ← Back to home
            </Link>
            <h1 style={{ margin: "14px 0 8px", fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.1 }}>
              Analytics
            </h1>
            <p style={{ margin: 0, color: TEXT_MUTED, maxWidth: 640, lineHeight: 1.6 }}>
              Lightweight event tracking for views, clicks, workspace activity, auth events, plus project-level intake
              conversion and artifact-level editing depth.
            </p>
          </div>

          <div
            role="group"
            aria-label="Analytics range"
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            {RANGE_OPTIONS.map((option) => {
              const selected = option.value === range;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setRange(option.value)}
                  style={{
                    borderRadius: 999,
                    border: `1px solid ${selected ? TEXT_PRIMARY : CARD_BORDER}`,
                    background: selected ? TEXT_PRIMARY : PAGE_BACKGROUND,
                    color: selected ? "#ffffff" : TEXT_PRIMARY,
                    padding: "10px 14px",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {metrics.map((metric) => (
            <section
              key={metric.label}
              style={{
                border: `1px solid ${CARD_BORDER}`,
                background: CARD_BACKGROUND,
                borderRadius: 24,
                padding: 24,
              }}
            >
              <div style={{ fontSize: 14, color: TEXT_MUTED }}>{metric.label}</div>
              <div style={{ fontSize: 34, marginTop: 10, fontWeight: 700, letterSpacing: "-0.03em" }}>{metric.value}</div>
              <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 10 }}>{metric.helper}</div>
            </section>
          ))}
        </div>

        <p style={{ margin: "14px 4px 0", color: TEXT_MUTED, fontSize: 13, lineHeight: 1.6 }}>
          Intake conversion is measured per project or session that submitted onboarding. Follow-up edits are measured
          per created artifact.
        </p>

        <section
          aria-label="Founder decision guidance"
          style={{
            border: `1px solid ${CARD_BORDER}`,
            background: CARD_BACKGROUND,
            borderRadius: 24,
            padding: 24,
            marginTop: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Founder decision guidance</h2>
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {founderGuidanceRows.map((row) => (
              <article
                key={row.title}
                style={{
                  border: `1px solid ${CARD_BORDER}`,
                  borderRadius: 16,
                  padding: 16,
                  background: PAGE_BACKGROUND,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{row.title}</h3>
                <p style={{ margin: "8px 0 0", fontSize: 14, color: TEXT_PRIMARY }}>{row.signal}</p>
                <p style={{ margin: "6px 0 0", fontSize: 14, color: TEXT_MUTED }}>{row.recommendation}</p>
              </article>
            ))}
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
            marginTop: 16,
          }}
        >
          <section
            style={{
              border: `1px solid ${CARD_BORDER}`,
              background: CARD_BACKGROUND,
              borderRadius: 24,
              padding: 24,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 600 }}>Daily page views</div>
            <div style={{ color: TEXT_MUTED, fontSize: 14, marginTop: 4 }}>Last 14 days</div>
            {dailyPageViews.some((day) => day.count > 0) ? (
              <svg viewBox="0 0 720 240" width="100%" height="240" style={{ marginTop: 20, overflow: "visible" }}>
                {dailyPageViews.map((day, index) => {
                  const barWidth = 36;
                  const gap = 14;
                  const x = index * (barWidth + gap) + 18;
                  const barHeight = (day.count / maxDailyCount) * 150;
                  const y = 180 - barHeight;

                  return (
                    <g key={day.date}>
                      <rect x={x} y={y} width={barWidth} height={barHeight} rx={12} fill="#292524" />
                      <text x={x + barWidth / 2} y={198} textAnchor="middle" fontSize="11" fill={TEXT_MUTED}>
                        {day.label}
                      </text>
                      <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" fontSize="12" fill={TEXT_PRIMARY}>
                        {day.count}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <EmptyPanel message="No page views in the current range yet." />
            )}
          </section>

          <div style={{ display: "grid", gap: 16 }}>
            {[
              { title: "Top pages", rows: topPages, empty: "No page view data yet." },
              { title: "Top events", rows: topEvents, empty: "No events recorded yet." },
              { title: "Devices", rows: deviceBreakdown, empty: "No device data available yet." },
              {
                title: "Artifact flow events",
                rows: getBreakdownRows(
                  events
                    .filter((event) =>
                      [
                        ARTIFACT_INTAKE_SUBMITTED_EVENT,
                        ARTIFACT_CREATED_EVENT,
                        ARTIFACT_FOLLOW_UP_EDIT_EVENT,
                        WORKSPACE_ARTIFACT_SWITCHED_EVENT,
                      ].includes(event.event),
                    )
                    .map((event) => event.event),
                ),
                empty: "No artifact flow events yet.",
              },
            ].map((section) => (
              <section
                key={section.title}
                style={{
                  border: `1px solid ${CARD_BORDER}`,
                  background: CARD_BACKGROUND,
                  borderRadius: 24,
                  padding: 24,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 600 }}>{section.title}</div>
                {section.rows.length > 0 ? (
                  <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                    {section.rows.map((row) => (
                      <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ color: TEXT_PRIMARY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.label}
                        </div>
                        <div style={{ color: TEXT_MUTED, fontVariantNumeric: "tabular-nums" }}>{formatNumber(row.count)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ marginTop: 18, color: TEXT_MUTED, fontSize: 14 }}>{section.empty}</div>
                )}
              </section>
            ))}
          </div>
        </div>

        <section
          style={{
            border: `1px solid ${CARD_BORDER}`,
            background: CARD_BACKGROUND,
            borderRadius: 24,
            padding: 24,
            marginTop: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Recent events</div>
              <div style={{ color: TEXT_MUTED, fontSize: 14, marginTop: 4 }}>Auto-refreshes every 30 seconds</div>
            </div>
            {!configured ? (
              <div style={{ color: TEXT_MUTED, fontSize: 14 }}>Supabase is not configured.</div>
            ) : loading ? (
              <div style={{ color: TEXT_MUTED, fontSize: 14 }}>Loading events…</div>
            ) : (
              <div style={{ color: TEXT_MUTED, fontSize: 14 }}>{formatNumber(events.length)} events loaded</div>
            )}
          </div>

          {recentEvents.length > 0 ? (
            <div style={{ overflowX: "auto", marginTop: 18 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                <thead>
                  <tr>
                    {["Time", "Event", "Page", "Session", "Device"].map((label) => (
                      <th
                        key={label}
                        style={{
                          textAlign: "left",
                          padding: "0 0 12px",
                          color: TEXT_MUTED,
                          fontSize: 13,
                          fontWeight: 600,
                          borderBottom: `1px solid ${CARD_BORDER}`,
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((event) => (
                    <tr key={event.id}>
                      <td style={{ padding: "14px 0", borderBottom: `1px solid ${CARD_BORDER}`, fontSize: 14 }}>
                        {formatTimestamp(event.created_at)}
                      </td>
                      <td style={{ padding: "14px 0", borderBottom: `1px solid ${CARD_BORDER}`, fontSize: 14 }}>
                        {event.event}
                      </td>
                      <td style={{ padding: "14px 0", borderBottom: `1px solid ${CARD_BORDER}`, fontSize: 14 }}>
                        {getPageLabel(event)}
                      </td>
                      <td style={{ padding: "14px 0", borderBottom: `1px solid ${CARD_BORDER}`, fontSize: 14 }}>
                        {truncateSessionId(event.session_id)}
                      </td>
                      <td style={{ padding: "14px 0", borderBottom: `1px solid ${CARD_BORDER}`, fontSize: 14 }}>
                        {getDeviceLabel(event)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ marginTop: 18 }}>
              <EmptyPanel
                message={
                  configured
                    ? loading
                      ? "Loading analytics data..."
                      : "No events available for this range yet."
                    : "Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to see analytics here."
                }
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
