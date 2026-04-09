import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProjectWorkspacePage from "@/app/project/[id]/page";
import { createDefaultProjectDiagram, type Project } from "@/lib/types";

const push = vi.fn();
const mockGetProject = vi.fn();
const mockSaveProject = vi.fn();
const mockUpsertProject = vi.fn();
const mockFetchProjectById = vi.fn();

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "project-1" }),
  useRouter: () => ({ push }),
}));

vi.mock("@/hooks/useRealtimeProject", () => ({
  useRealtimeProject: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/projects", () => ({
  createProjectRecord: vi.fn(),
  getProject: (...args: unknown[]) => mockGetProject(...args),
  saveProject: (...args: unknown[]) => mockSaveProject(...args),
  upsertProject: (...args: unknown[]) => mockUpsertProject(...args),
}));

vi.mock("@/lib/supabase-projects", () => ({
  fetchProjectById: (...args: unknown[]) => mockFetchProjectById(...args),
}));

vi.mock("@/components/ChatPanel", () => ({
  default: ({ onResearch }: { onResearch?: () => void }) => (
    <div data-testid="chat-panel">
      <button type="button" onClick={onResearch}>
        Trigger research
      </button>
    </div>
  ),
}));

vi.mock("@/components/Canvas", () => ({
  default: () => <div data-testid="canvas" />,
}));

vi.mock("@/components/BrainstormResults", () => ({
  default: () => <div data-testid="brainstorm-results" />,
}));

vi.mock("@/components/UltraplanReport", () => ({
  default: () => <div data-testid="ultraplan-report" />,
}));

vi.mock("@/components/ResearchReport", () => ({
  default: ({
    status,
    report,
    artifact,
    errorMessage,
    researchQuestion,
    sourceContext,
    lastUpdatedAt,
    onRunResearch,
  }: {
    status: string;
    report?: { executiveSummary?: string } | null;
    artifact?: { status?: string; metrics?: { attemptedAngles?: number } };
    errorMessage?: string;
    researchQuestion?: string;
    sourceContext?: string;
    lastUpdatedAt?: string;
    onRunResearch?: () => void;
  }) => (
    <div>
      <div data-testid="research-status">{status}</div>
      {report?.executiveSummary ? <div data-testid="research-summary">{report.executiveSummary}</div> : null}
      {artifact?.status ? <div data-testid="research-artifact-status">{artifact.status}</div> : null}
      {typeof artifact?.metrics?.attemptedAngles === "number" ? (
        <div data-testid="research-attempted-angles">{artifact.metrics.attemptedAngles}</div>
      ) : null}
      {researchQuestion ? <div data-testid="research-question">{researchQuestion}</div> : null}
      {sourceContext ? <div data-testid="research-context">{sourceContext}</div> : null}
      {lastUpdatedAt ? <div data-testid="research-last-updated">{lastUpdatedAt}</div> : null}
      {errorMessage ? <div data-testid="research-error">{errorMessage}</div> : null}
      <button type="button" onClick={onRunResearch}>
        Run from report
      </button>
    </div>
  ),
}));

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    name: "Launchpad",
    description: "AI-assisted startup planning",
    phase: "Discovery",
    updatedAt: "2025-01-10T00:00:00.000Z",
    notes: [],
    sections: [],
    documents: [],
    websiteBuilders: [],
    messages: [
      {
        id: "assistant-1",
        sender: "assistant",
        content: "How can I help?",
        createdAt: "2025-01-10T00:00:00.000Z",
      },
      {
        id: "user-1",
        sender: "user",
        content: "Analyze demand for AI note taking for lawyers.",
        createdAt: "2025-01-10T00:01:00.000Z",
      },
    ],
    phases: [
      {
        id: "discovery",
        title: "Discovery",
        tasks: [
          { id: "task-1", label: "Interview users", done: false },
          { id: "task-2", label: "Review competitors", done: true },
        ],
      },
    ],
    research: null,
    diagram: createDefaultProjectDiagram(),
    ...overrides,
  };
}

describe("ProjectWorkspacePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveProject.mockResolvedValue(undefined);
    mockFetchProjectById.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads and renders a persisted research report state", async () => {
    mockGetProject.mockResolvedValue(
      makeProject({
        research: {
          status: "success",
          researchQuestion: "What are the key opportunities and risks?",
          sourceContext: "Saved locally",
          updatedAt: "2025-01-11T00:00:00.000Z",
          artifact: {
            status: "completed",
            metrics: {
              attemptedAngles: 3,
            },
          },
          report: {
            sections: [],
            executiveSummary: "Stored summary",
            researchQuestion: "What are the key opportunities and risks?",
            generatedAt: "2025-01-11T00:00:00.000Z",
          },
        },
      }),
    );

    render(<ProjectWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByTestId("research-status")).toHaveTextContent("success");
    });

    expect(screen.getByTestId("research-question")).toHaveTextContent("What are the key opportunities and risks?");
    expect(screen.getByTestId("research-context")).toHaveTextContent("Saved locally");
    expect(screen.getAllByTestId("research-artifact-status")[0]).toHaveTextContent("completed");
  });

  it("runs research from the latest user message and persists the result", async () => {
    mockGetProject.mockResolvedValue(makeProject());
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sections: [],
          executiveSummary: "Demand is real.",
          researchQuestion: "What are the key opportunities and risks?",
          generatedAt: "2025-01-12T00:00:00.000Z",
          artifact: {
            status: "completed",
            generatedAt: "2025-01-12T00:00:00.000Z",
            metrics: {
              attemptedAngles: 3,
              completedSections: 0,
              selectedSources: 0,
              rejectedSources: 0,
            },
            selectedSources: [],
            rejectedSources: [],
            failures: [],
          },
        }),
      }),
    );

    render(<ProjectWorkspacePage />);

    await waitFor(() => {
      expect(screen.getAllByTestId("research-status")[0]).toHaveTextContent("empty");
    });

    fireEvent.click(
      within(screen.getAllByTestId("chat-panel")[0]).getByRole("button", { name: "Trigger research" }),
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("research-status")[0]).toHaveTextContent("success");
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/research",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Analyze demand for AI note taking for lawyers."),
      }),
    );
    expect(mockSaveProject).toHaveBeenLastCalledWith(
      expect.objectContaining({
        research: expect.objectContaining({
          status: "success",
          sourceContext: "Analyze demand for AI note taking for lawyers.",
          researchQuestion: "What are the key opportunities and risks?",
          artifact: expect.objectContaining({
            status: "completed",
            metrics: expect.objectContaining({
              attemptedAngles: 3,
            }),
          }),
        }),
      }),
    );
  });

  it("falls back to the current phase context, keeps the previous report, and stores failed artifact details", async () => {
    mockGetProject.mockResolvedValue(
      makeProject({
        research: {
          status: "success",
          researchQuestion: "Earlier question",
          sourceContext: "Saved locally",
          updatedAt: "2025-01-09T00:00:00.000Z",
          artifact: {
            status: "completed",
            metrics: {
              attemptedAngles: 1,
            },
          },
          report: {
            sections: [],
            executiveSummary: "Stored summary",
            researchQuestion: "Earlier question",
            generatedAt: "2025-01-09T00:00:00.000Z",
          },
        },
        messages: [
          {
            id: "assistant-1",
            sender: "assistant",
            content: "How can I help?",
            createdAt: "2025-01-10T00:00:00.000Z",
          },
        ],
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: "Provider timeout",
          artifact: {
            status: "failed",
            generatedAt: "2025-01-12T00:00:00.000Z",
            metrics: {
              attemptedAngles: 2,
              rejectedSources: 1,
            },
            failures: [{ stage: "gather", code: "no-evidence", message: "No research sections passed validation" }],
          },
        }),
      }),
    );

    render(<ProjectWorkspacePage />);

    await waitFor(() => {
      expect(screen.getAllByTestId("research-status")[0]).toHaveTextContent("success");
    });

    fireEvent.click(
      within(screen.getAllByTestId("chat-panel")[0]).getByRole("button", { name: "Trigger research" }),
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("research-status")[0]).toHaveTextContent("error");
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/research",
      expect.objectContaining({
        body: expect.stringContaining("Current phase: Discovery. Open tasks: Interview users."),
      }),
    );
    expect(screen.getAllByTestId("research-error")[0]).toHaveTextContent("Provider timeout");
    expect(screen.getAllByTestId("research-question")[0]).toHaveTextContent(
      "What are the key opportunities and risks for the Discovery phase?",
    );
    expect(screen.getAllByTestId("research-summary")[0]).toHaveTextContent("Stored summary");
    expect(screen.getAllByTestId("research-artifact-status")[0]).toHaveTextContent("failed");
    expect(screen.getAllByTestId("research-attempted-angles")[0]).toHaveTextContent("2");
    expect(screen.getAllByTestId("research-last-updated")[0]).toHaveTextContent("2025-01-09T00:00:00.000Z");
    expect(mockSaveProject).toHaveBeenLastCalledWith(
      expect.objectContaining({
        research: expect.objectContaining({
          status: "error",
          sourceContext: "Current phase: Discovery. Open tasks: Interview users.",
          updatedAt: "2025-01-09T00:00:00.000Z",
          report: expect.objectContaining({
            executiveSummary: "Stored summary",
          }),
          artifact: expect.objectContaining({
            status: "failed",
            metrics: expect.objectContaining({
              attemptedAngles: 2,
            }),
          }),
        }),
      }),
    );
  });
});
