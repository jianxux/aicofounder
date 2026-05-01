import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    expect(screen.getByRole("heading", { name: "Founder decision guidance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Intake-to-artifact" })).toBeInTheDocument();
    expect(screen.getByText("Intake conversion is stable and ready for deeper review.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Follow-up depth" })).toBeInTheDocument();
    expect(screen.getByText("Founders are returning to sharpen outputs.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Workspace coverage / artifact mix" })).toBeInTheDocument();
    expect(screen.getByText("Coverage includes validation-scorecard and customer-research-memo artifacts.")).toBeInTheDocument();
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
        created_at: new Date().toISOString(),
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
    expect(screen.getByText("No onboarding samples yet.")).toBeInTheDocument();
    expect(screen.getByText("No generated artifacts yet.")).toBeInTheDocument();
    expect(screen.getByText("No artifact type data yet.")).toBeInTheDocument();
  });

  it("shows unknown workspace coverage guidance when only non-standard artifact types exist", async () => {
    mockFetchAnalyticsEvents.mockResolvedValue([
      {
        id: "switch-unknown-1",
        user_id: null,
        session_id: "session-unknown",
        event: "workspace_artifact_switched",
        data: {
          project_id: "project-unknown",
          artifact_id: "artifact-unknown",
          artifact_type: "unknown-artifact-type",
          page: "/project/project-unknown",
        },
        ip: null,
        created_at: "2025-01-10T00:03:00.000Z",
      },
    ]);

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Track validation-scorecard and customer-research-memo artifact_type values for coverage guidance."),
      ).toBeInTheDocument();
    });
  });

  it("shows low-rate guidance when creation and follow-up rates are below threshold", async () => {
    mockFetchAnalyticsEvents.mockResolvedValue([
      {
        id: "intake-1",
        user_id: null,
        session_id: "session-low",
        event: "artifact_intake_submitted",
        data: { project_id: "project-low-1", page: "/dashboard" },
        ip: null,
        created_at: "2025-01-10T00:00:00.000Z",
      },
      {
        id: "intake-2",
        user_id: null,
        session_id: "session-low",
        event: "artifact_intake_submitted",
        data: { project_id: "project-low-2", page: "/dashboard" },
        ip: null,
        created_at: "2025-01-10T00:01:00.000Z",
      },
      {
        id: "create-1",
        user_id: null,
        session_id: "session-low",
        event: "artifact_created",
        data: {
          project_id: "project-low-1",
          artifact_id: "artifact-low-1",
          artifact_type: "validation-scorecard",
          page: "/project/project-low-1",
        },
        ip: null,
        created_at: "2025-01-10T00:02:00.000Z",
      },
      {
        id: "intake-3",
        user_id: null,
        session_id: "session-low",
        event: "artifact_intake_submitted",
        data: { project_id: "project-low-3", page: "/dashboard" },
        ip: null,
        created_at: "2025-01-10T00:03:00.000Z",
      },
    ]);

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText("Artifact creation rate is low.")).toBeInTheDocument();
    });

    expect(screen.getByText("Inspect onboarding steps and project dropoff before artifact creation.")).toBeInTheDocument();
    expect(screen.getByText("Follow-up edit rate is low.")).toBeInTheDocument();
    expect(screen.getByText("Check whether generated artifacts clearly invite refinement.")).toBeInTheDocument();
  });

  it("shows targeted coverage guidance when only validation-scorecard artifacts are represented", async () => {
    mockFetchAnalyticsEvents.mockResolvedValue([
      {
        id: "create-validation-only-1",
        user_id: null,
        session_id: "session-validation-only",
        event: "artifact_created",
        data: {
          project_id: "project-validation-only",
          artifact_id: "artifact-validation-only",
          artifact_type: "validation-scorecard",
          page: "/project/project-validation-only",
        },
        ip: null,
        created_at: "2025-01-10T00:00:00.000Z",
      },
    ]);

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText("Coverage is missing customer-research-memo artifacts.")).toBeInTheDocument();
    });

    expect(screen.getByText("Add customer-research-memo outputs to expand evidence coverage.")).toBeInTheDocument();
  });
});
