import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AnalyticsPage from "@/app/analytics/page";

const mockFetchAnalyticsEvents = vi.fn();
const mockIsAnalyticsConfigured = vi.fn();

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/analytics", async () => {
  const actual = await vi.importActual<typeof import("@/lib/analytics")>("@/lib/analytics");

  return {
    ...actual,
    fetchAnalyticsEvents: (...args: unknown[]) => mockFetchAnalyticsEvents(...args),
    isAnalyticsConfigured: () => mockIsAnalyticsConfigured(),
  };
});

describe("AnalyticsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAnalyticsConfigured.mockReturnValue(true);
    mockFetchAnalyticsEvents.mockResolvedValue([
      {
        id: "intake-1",
        user_id: null,
        session_id: "session-1",
        event: "artifact_intake_submitted",
        data: { project_id: "project-1", page: "/dashboard" },
        ip: null,
        created_at: "2025-01-10T00:00:00.000Z",
      },
      {
        id: "create-1",
        user_id: null,
        session_id: "session-1",
        event: "artifact_created",
        data: {
          project_id: "project-1",
          artifact_id: "artifact-validation-scorecard",
          artifact_type: "validation-scorecard",
          page: "/project/project-1",
        },
        ip: null,
        created_at: "2025-01-10T00:01:00.000Z",
      },
      {
        id: "edit-1",
        user_id: null,
        session_id: "session-1",
        event: "artifact_followup_edit",
        data: {
          project_id: "project-1",
          artifact_id: "artifact-validation-scorecard",
          artifact_type: "validation-scorecard",
          page: "/project/project-1",
        },
        ip: null,
        created_at: "2025-01-10T00:02:00.000Z",
      },
      {
        id: "switch-1",
        user_id: null,
        session_id: "session-1",
        event: "workspace_artifact_switched",
        data: {
          project_id: "project-1",
          artifact_id: "artifact-customer-research-memo",
          artifact_type: "customer-research-memo",
          page: "/project/project-1",
        },
        ip: null,
        created_at: "2025-01-10T00:03:00.000Z",
      },
    ]);
  });

  it("renders artifact flow rates and supporting counts", async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText("Artifact Creation Rate (Project-Level)")).toBeInTheDocument();
    });

    expect(screen.getAllByText("100%")).toHaveLength(2);
    expect(screen.getByText("1 of 1 intake-submitted projects produced at least one artifact")).toBeInTheDocument();
    expect(screen.getByText("Follow-up Edit Rate (Per Artifact)")).toBeInTheDocument();
    expect(screen.getByText("1 of 1 created artifacts received a follow-up edit")).toBeInTheDocument();
    expect(screen.getByText("Artifact Switches")).toBeInTheDocument();
    expect(screen.getByText("Artifact flow events")).toBeInTheDocument();
    expect(
      screen.getByText("Intake conversion is measured per project or session that submitted onboarding. Follow-up edits are measured per created artifact."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("artifact_followup_edit").length).toBeGreaterThan(0);
  });

  it("shows project-level conversion when one intake leads to multiple artifacts", async () => {
    mockFetchAnalyticsEvents.mockResolvedValue([
      {
        id: "intake-1",
        user_id: null,
        session_id: "session-1",
        event: "artifact_intake_submitted",
        data: { project_id: "project-1", page: "/dashboard" },
        ip: null,
        created_at: "2025-01-10T00:00:00.000Z",
      },
      {
        id: "create-1",
        user_id: null,
        session_id: "session-1",
        event: "artifact_created",
        data: {
          project_id: "project-1",
          artifact_id: "artifact-validation-scorecard",
          artifact_type: "validation-scorecard",
          page: "/project/project-1",
        },
        ip: null,
        created_at: "2025-01-10T00:01:00.000Z",
      },
      {
        id: "create-2",
        user_id: null,
        session_id: "session-1",
        event: "artifact_created",
        data: {
          project_id: "project-1",
          artifact_id: "artifact-customer-research-memo",
          artifact_type: "customer-research-memo",
          page: "/project/project-1",
        },
        ip: null,
        created_at: "2025-01-10T00:02:00.000Z",
      },
      {
        id: "edit-1",
        user_id: null,
        session_id: "session-1",
        event: "artifact_followup_edit",
        data: {
          project_id: "project-1",
          artifact_id: "artifact-customer-research-memo",
          artifact_type: "customer-research-memo",
          page: "/project/project-1",
        },
        ip: null,
        created_at: "2025-01-10T00:03:00.000Z",
      },
    ]);

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText("Artifact Creation Rate (Project-Level)")).toBeInTheDocument();
    });

    expect(screen.getByText("1 of 1 intake-submitted projects produced at least one artifact")).toBeInTheDocument();
    expect(screen.getByText("Unique artifacts deduped from artifact_created events")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 created artifacts received a follow-up edit")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("supports range changes, renders page-view charts, and shows the unconfigured empty state", async () => {
    const fixtureDate = new Date();
    const fixtureDateKey = fixtureDate.toISOString().slice(0, 10);
    const fixtureDateLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
      new Date(fixtureDateKey),
    );

    mockIsAnalyticsConfigured.mockReturnValue(false);
    mockFetchAnalyticsEvents.mockResolvedValue([
      {
        id: "page-view-1",
        user_id: null,
        session_id: "session-2",
        event: "page_view",
        data: {
          url: "https://example.com/dashboard",
          user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        },
        ip: null,
        created_at: fixtureDate.toISOString(),
      },
    ]);

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(mockFetchAnalyticsEvents).toHaveBeenCalledWith("7d");
    });

    fireEvent.click(screen.getByRole("button", { name: "Today" }));

    await waitFor(() => {
      expect(mockFetchAnalyticsEvents).toHaveBeenCalledWith("today");
    });

    expect(screen.getByText("Supabase is not configured.")).toBeInTheDocument();
    expect(screen.getByText("Top pages")).toBeInTheDocument();
    expect(screen.getAllByText("/dashboard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mobile").length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name: /daily page views chart/i })).toBeInTheDocument();
    const dailySummaryTable = screen.getByRole("table", { name: /daily page views data for the last 14 days/i });
    expect(dailySummaryTable).toBeInTheDocument();
    expect(within(dailySummaryTable).getByRole("columnheader", { name: "Day" })).toBeInTheDocument();
    expect(within(dailySummaryTable).getByRole("columnheader", { name: "Page views" })).toBeInTheDocument();

    const fixtureDayRowHeader = within(dailySummaryTable).getByRole("rowheader", { name: fixtureDateLabel });
    const fixtureDayRow = fixtureDayRowHeader.closest("tr");
    expect(fixtureDayRow).not.toBeNull();
    expect(within(fixtureDayRow as HTMLTableRowElement).getByRole("cell", { name: "1" })).toBeInTheDocument();
  });
});
