import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProjectWorkspacePage from "@/app/project/[id]/page";
import { createDefaultProjectDiagram, normalizeProject, type Project } from "@/lib/types";

const push = vi.fn();
const mockGetProject = vi.fn();
const mockSaveProject = vi.fn();
const mockUpsertProject = vi.fn();
const mockFetchProjectById = vi.fn();
const mockCreateProjectRecord = vi.fn();
const mockUseRealtimeProject = vi.fn();
const mockTrackEvent = vi.fn();

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
  useRealtimeProject: (...args: unknown[]) => mockUseRealtimeProject(...args),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

vi.mock("@/lib/projects", () => ({
  createProjectRecord: (...args: unknown[]) => mockCreateProjectRecord(...args),
  getProject: (...args: unknown[]) => mockGetProject(...args),
  saveProject: (...args: unknown[]) => mockSaveProject(...args),
  upsertProject: (...args: unknown[]) => mockUpsertProject(...args),
}));

vi.mock("@/lib/supabase-projects", () => ({
  fetchProjectById: (...args: unknown[]) => mockFetchProjectById(...args),
}));

vi.mock("@/components/ChatPanel", () => ({
  default: ({
    onSendMessage,
    onRemind,
    onBrainstorm,
    onResearch,
    onUltraplan,
    onToggleTask,
    onSetActivePhase,
  }: {
    onSendMessage?: (content: string) => void;
    onRemind?: () => void;
    onBrainstorm?: () => void;
    onResearch?: () => void;
    onUltraplan?: () => void;
    onToggleTask?: (phaseId: string, taskId: string) => void;
    onSetActivePhase?: (phaseId: string) => void;
  }) => (
    <div data-testid="chat-panel">
      <button type="button" onClick={() => onSendMessage?.("Tell me more about demand.")}>
        Send chat
      </button>
      <button type="button" onClick={onRemind}>
        Remind
      </button>
      <button type="button" onClick={onBrainstorm}>
        Trigger brainstorm
      </button>
      <button type="button" onClick={onResearch}>
        Trigger research
      </button>
      <button type="button" onClick={onUltraplan}>
        Trigger ultraplan
      </button>
      <button type="button" onClick={() => onToggleTask?.("discovery", "task-1")}>
        Toggle first task
      </button>
      <button type="button" onClick={() => onSetActivePhase?.("build")}>
        Activate build phase
      </button>
      <button type="button" onClick={() => onSetActivePhase?.("missing")}>
        Activate missing phase
      </button>
    </div>
  ),
}));

vi.mock("@/components/Canvas", () => ({
  default: ({
    onChangeNotes,
    onChangeSections,
    onChangeDocuments,
    onChangeWebsiteBuilders,
    onChangeDiagram,
    onNoteCreated,
    onNoteDragged,
  }: {
    onChangeNotes?: (notes: Project["notes"]) => void;
    onChangeSections?: (sections: NonNullable<Project["sections"]>) => void;
    onChangeDocuments?: (documents: Project["documents"]) => void;
    onChangeWebsiteBuilders?: (websiteBuilders: NonNullable<Project["websiteBuilders"]>) => void;
    onChangeDiagram?: (diagram: Project["diagram"]) => void;
    onNoteCreated?: (note: Project["notes"][number]) => void;
    onNoteDragged?: (note: Project["notes"][number]) => void;
  }) => (
    <div data-testid="canvas">
      <button
        type="button"
        onClick={() =>
          onChangeNotes?.([{ id: "note-2", title: "New note", content: "Updated", color: "blue", x: 10, y: 20 }])
        }
      >
        Change notes
      </button>
      <button
        type="button"
        onClick={() =>
          onChangeSections?.([{ id: "section-2", title: "Section", color: "green", x: 1, y: 2, width: 300, height: 200 }])
        }
      >
        Change sections
      </button>
      <button
        type="button"
        onClick={() => onChangeDocuments?.([{ id: "doc-2", title: "Doc", content: "Body", x: 5, y: 6 }])}
      >
        Change documents
      </button>
      <button
        type="button"
        onClick={() =>
          onChangeWebsiteBuilders?.([
            { id: "site-2", title: "Site", blocks: [{ id: "block-1", type: "text", heading: "Heading", body: "Body" }], x: 7, y: 8 },
          ])
        }
      >
        Change builders
      </button>
      <button
        type="button"
        onClick={() =>
          onChangeDiagram?.({
            nodes: [
              {
                id: "diagram-root",
                type: "topic",
                label: "Launchpad",
                x: 1111,
                y: 999,
              },
            ],
            edges: [],
            layout: {
              algorithm: "mind_map",
              direction: "horizontal",
              rootNodeId: "diagram-root",
              viewport: { x: 0, y: 0, zoom: 1 },
            },
            drag: {
              snapToGrid: false,
              gridSize: 24,
              reparentOnDrop: true,
            },
          })
        }
      >
        Move diagram
      </button>
      <button
        type="button"
        onClick={() => onNoteCreated?.({ id: "note-3", title: "Created", content: "Created", color: "yellow", x: 0, y: 0 })}
      >
        Create note
      </button>
      <button
        type="button"
        onClick={() => onNoteDragged?.({ id: "note-3", title: "Dragged", content: "Dragged", color: "yellow", x: 33.3, y: 44.4 })}
      >
        Drag note
      </button>
    </div>
  ),
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
  return normalizeProject({
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
  });
}

describe("ProjectWorkspacePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveProject.mockResolvedValue(undefined);
    mockFetchProjectById.mockResolvedValue(null);
    mockCreateProjectRecord.mockReturnValue(makeProject({ id: "created-project" }));
    mockTrackEvent.mockResolvedValue(undefined);
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
    expect(screen.getAllByText("Customer research memo")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Active artifact")[0]).toBeInTheDocument();
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
      expect(screen.getAllByText("Validation artifact")[0]).toBeInTheDocument();
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

  it("persists manual diagram node coordinates back into project state", async () => {
    mockGetProject.mockResolvedValue(makeProject());

    render(<ProjectWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByTestId("canvas")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Move diagram" }));

    await waitFor(() => {
      expect(mockSaveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          diagram: expect.objectContaining({
            nodes: expect.arrayContaining([
              expect.objectContaining({
                id: "diagram-root",
                x: 1111,
                y: 999,
              }),
            ]),
          }),
        }),
      );
    });
  });

  it("switches to the validation scorecard artifact intentionally in the workspace", async () => {
    mockGetProject.mockResolvedValue(
      makeProject({
        research: {
          status: "success",
          researchQuestion: "What are the key opportunities and risks?",
          sourceContext: "Saved locally",
          updatedAt: "2025-01-11T00:00:00.000Z",
          artifact: {
            status: "completed",
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
      expect(screen.getAllByText("Customer research memo")[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Validation scorecard" })[0]);

    await waitFor(() => {
      expect(screen.getAllByText("Validation artifact")[0]).toBeInTheDocument();
    });

    expect(screen.getAllByText("No validation criteria yet. This scorecard is ready for your first pass.")[0]).toBeInTheDocument();
    expect(mockSaveProject).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeArtifactId: "artifact-validation-scorecard",
      }),
    );
  });

  it("creates a fallback project when no stored project exists", async () => {
    mockGetProject.mockResolvedValue(null);

    render(<ProjectWorkspacePage />);

    await waitFor(() => {
      expect(mockCreateProjectRecord).toHaveBeenCalled();
    });

    expect(mockUpsertProject).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "project-1",
      }),
    );
  });

  it("updates the project name and navigates back to the dashboard", async () => {
    mockGetProject.mockResolvedValue(makeProject());

    render(<ProjectWorkspacePage />);

    const input = await screen.findByDisplayValue("Launchpad");
    fireEvent.change(input, { target: { value: "Renamed project" } });
    fireEvent.click(screen.getByRole("button", { name: "Back to dashboard" }));

    await waitFor(() => {
      expect(mockSaveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Renamed project",
        }),
      );
    });

    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("streams chat responses into the persisted project state", async () => {
    mockGetProject.mockResolvedValue(makeProject());
    const read = vi
      .fn()
      .mockResolvedValueOnce({
        done: false,
        value: new TextEncoder().encode('data: {"content":"First reply"}\n\ndata: [DONE]\n\n'),
      })
      .mockResolvedValueOnce({ done: true, value: undefined });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({ read }),
        },
      }),
    );

    render(<ProjectWorkspacePage />);

    await screen.findAllByTestId("chat-panel");
    fireEvent.click(screen.getAllByRole("button", { name: "Send chat" })[0]);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/chat",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    expect(mockSaveProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ sender: "user", content: "Tell me more about demand." }),
          expect.objectContaining({ sender: "assistant", content: "First reply" }),
        ]),
      }),
    );
  });

  it("handles chat request failures with an assistant fallback message", async () => {
    mockGetProject.mockResolvedValue(makeProject());
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        body: null,
      }),
    );

    render(<ProjectWorkspacePage />);

    await screen.findAllByTestId("chat-panel");
    fireEvent.click(screen.getAllByRole("button", { name: "Send chat" })[0]);

    await waitFor(() => {
      expect(mockSaveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ content: "Sorry, I encountered an error. Please try again." }),
          ]),
        }),
      );
    });
  });

  it("adds reminder, brainstorm, and ultraplan results through the workspace actions", async () => {
    mockGetProject.mockResolvedValue(makeProject());
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            painPoints: [
              {
                id: "pain-1",
                title: "Workflow pain",
                description: "Users want tighter loops.",
                source: "Indie Hackers",
                severity: 4,
                frequency: "weekly",
                quotes: ["I keep losing context between tools."],
              },
            ],
            summary: "Users want a tighter loop.",
            searchContext: "Founder communities",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            blocker: {
              id: "blocker-1",
              title: "Scope drift",
              description: "The MVP is too wide.",
              severity: 4,
              category: "strategic",
            },
            actions: [
              { id: "action-1", title: "Trim scope", description: "Cut features.", effort: "low", impact: "high", timelineHours: 3 },
              { id: "action-2", title: "Confirm ICP", description: "Talk to users.", effort: "medium", impact: "high", timelineHours: 5 },
              { id: "action-3", title: "Define metric", description: "Set one goal.", effort: "low", impact: "medium", timelineHours: 2 },
            ],
            rationale: "A narrow MVP reduces risk.",
            nextStep: "Trim scope this week.",
          }),
        }),
    );

    render(<ProjectWorkspacePage />);

    await screen.findAllByTestId("chat-panel");
    fireEvent.click(screen.getAllByRole("button", { name: "Remind" })[0]);

    await waitFor(() => {
      expect(mockSaveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining("We were working on discovery."),
            }),
          ]),
        }),
      );
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Trigger brainstorm" })[0]);

    await waitFor(() => {
      expect(screen.getByTestId("brainstorm-results")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Trigger ultraplan" })[0]);

    await waitFor(() => {
      expect(screen.getByTestId("ultraplan-report")).toBeInTheDocument();
    });
  });

  it("handles brainstorm and ultraplan failures by appending assistant recovery messages", async () => {
    mockGetProject.mockResolvedValue(makeProject());
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "no brainstorm" }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "no ultraplan" }),
        }),
    );

    render(<ProjectWorkspacePage />);

    await screen.findAllByTestId("chat-panel");
    fireEvent.click(screen.getAllByRole("button", { name: "Trigger brainstorm" })[0]);

    await waitFor(() => {
      expect(mockSaveProject.mock.calls.flatMap(([project]) => project.messages)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ content: "Sorry, I couldn't brainstorm pain points right now. Please try again." }),
        ]),
      );
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Trigger ultraplan" })[0]);

    await waitFor(() => {
      expect(mockSaveProject.mock.calls.flatMap(([project]) => project.messages)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ content: "Sorry, I couldn't create an ultraplan right now. Please try again." }),
        ]),
      );
    });
  });

  it("toggles tasks, advances phases, and reacts to realtime updates", async () => {
    mockGetProject.mockResolvedValue(
      makeProject({
        phase: "Discovery",
        phases: [
          {
            id: "discovery",
            title: "Discovery",
            tasks: [{ id: "task-1", label: "Interview users", done: false }],
          },
          {
            id: "build",
            title: "Build",
            tasks: [{ id: "task-2", label: "Create MVP", done: false }],
          },
        ],
      }),
    );
    mockFetchProjectById.mockResolvedValue(
      makeProject({
        name: "Realtime project",
        phase: "Discovery",
        phases: [
          {
            id: "discovery",
            title: "Discovery",
            tasks: [{ id: "task-1", label: "Interview users", done: true }],
          },
          {
            id: "build",
            title: "Build",
            tasks: [{ id: "task-2", label: "Create MVP", done: false }],
          },
        ],
      }),
    );

    render(<ProjectWorkspacePage />);

    await screen.findAllByTestId("chat-panel");
    const realtimeCallback = mockUseRealtimeProject.mock.calls[0]?.[1] as (() => void) | undefined;
    realtimeCallback?.();

    await waitFor(() => {
      expect(mockFetchProjectById).toHaveBeenCalledWith("project-1");
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Toggle first task" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Activate build phase" })[0]);

    await waitFor(() => {
      expect(mockSaveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: "Build",
        }),
      );
    });
  });

  it("advances to the next phase when the last open task is completed", async () => {
    mockGetProject.mockResolvedValue(
      makeProject({
        phase: "Discovery",
        phases: [
          {
            id: "discovery",
            title: "Discovery",
            tasks: [{ id: "task-1", label: "Interview users", done: false }],
          },
          {
            id: "build",
            title: "Build",
            tasks: [{ id: "task-2", label: "Create MVP", done: false }],
          },
        ],
      }),
    );

    render(<ProjectWorkspacePage />);

    await screen.findAllByTestId("chat-panel");
    fireEvent.click(screen.getAllByRole("button", { name: "Toggle first task" })[0]);

    await waitFor(() => {
      expect(mockSaveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: "Build",
          messages: expect.arrayContaining([expect.objectContaining({ sender: "assistant" })]),
        }),
      );
    });
  });

  it("persists canvas edits, tracks note events, and toggles the mobile canvas panel", async () => {
    mockGetProject.mockResolvedValue(makeProject());

    render(<ProjectWorkspacePage />);

    await screen.findByTestId("canvas");
    const initialValidationPanels = screen.getAllByText("Validation artifact").length;

    fireEvent.click(screen.getByRole("button", { name: "Canvas" }));

    await waitFor(() => {
      expect(screen.getAllByText("Validation artifact").length).toBeGreaterThan(initialValidationPanels);
    });

    const mobileResearchButtons = screen.getAllByRole("button", { name: "Customer research memo" });
    fireEvent.click(mobileResearchButtons[mobileResearchButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getAllByTestId("research-status")[0]).toHaveTextContent("empty");
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Change notes" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Change sections" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Change documents" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Change builders" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Create note" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Drag note" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Activate missing phase" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Chat" }));

    await waitFor(() => {
      expect(mockSaveProject).toHaveBeenCalledWith(expect.objectContaining({ notes: expect.arrayContaining([expect.objectContaining({ id: "note-2" })]) }));
      expect(mockSaveProject).toHaveBeenCalledWith(expect.objectContaining({ sections: expect.arrayContaining([expect.objectContaining({ id: "section-2" })]) }));
      expect(mockSaveProject).toHaveBeenCalledWith(expect.objectContaining({ documents: expect.arrayContaining([expect.objectContaining({ id: "doc-2" })]) }));
      expect(mockSaveProject).toHaveBeenCalledWith(
        expect.objectContaining({ websiteBuilders: expect.arrayContaining([expect.objectContaining({ id: "site-2" })]) }),
      );
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "note_created",
      expect.objectContaining({
        note_id: "note-3",
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      "note_dragged",
      expect.objectContaining({
        note_id: "note-3",
        x: 33,
        y: 44,
      }),
    );
  });
});
