import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProjectWorkspacePage from "@/app/project/[id]/page";
import type { Project } from "@/lib/types";

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
    errorMessage,
    researchQuestion,
    sourceContext,
    onRunResearch,
  }: {
    status: string;
    errorMessage?: string;
    researchQuestion?: string;
    sourceContext?: string;
    onRunResearch?: () => void;
  }) => (
    <div>
      <div data-testid="research-status">{status}</div>
      {researchQuestion ? <div data-testid="research-question">{researchQuestion}</div> : null}
      {sourceContext ? <div data-testid="research-context">{sourceContext}</div> : null}
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
        }),
      }),
    );
  });

  it("falls back to the current phase context and shows a failure state when research errors", async () => {
    mockGetProject.mockResolvedValue(
      makeProject({
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
    expect(mockSaveProject).toHaveBeenLastCalledWith(
      expect.objectContaining({
        research: expect.objectContaining({
          status: "error",
          sourceContext: "Current phase: Discovery. Open tasks: Interview users.",
        }),
      }),
    );
  });
});
