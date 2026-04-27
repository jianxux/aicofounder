import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

import DashboardPage from "@/app/dashboard/page";
import { trackEvent } from "@/lib/analytics";
import { createProject as createProjectMock, createProjectRecord, getProjects } from "@/lib/projects";
import type { Project } from "@/lib/types";

async function startOnboarding() {
  fireEvent.click(await screen.findByRole("button", { name: "Get Started" }));
}

function completeIntake(overrides?: {
  primaryIdea?: string;
  url?: string;
  targetUser?: string;
  mainUncertainty?: string;
}) {
  const intake = {
    primaryIdea:
      "An AI copilot for founder research that turns scattered notes into a concrete validation plan.",
    url: "https://example.com",
    targetUser: "Seed-stage founders",
    mainUncertainty: "Whether they want one workspace.",
    ...overrides,
  };

  fireEvent.change(screen.getByLabelText("What are you thinking about building?"), {
    target: { value: intake.primaryIdea },
  });
  fireEvent.change(screen.getByLabelText("Relevant URL (optional)"), {
    target: { value: intake.url },
  });
  fireEvent.change(screen.getByLabelText("Target user (optional)"), {
    target: { value: intake.targetUser },
  });
  fireEvent.change(screen.getByLabelText("Main uncertainty (optional)"), {
    target: { value: intake.mainUncertainty },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  return intake;
}

function createDeferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/AuthButton", () => ({
  default: (props: { redirectTo?: string }) => (
    <div data-testid="auth-button" data-redirect-to={props.redirectTo} />
  ),
}));

const { saveProjectMock } = vi.hoisted(() => ({
  saveProjectMock: vi.fn(),
}));

vi.mock("@/lib/projects", () => ({
  getProjects: vi.fn(),
  createProjectRecord: vi.fn(),
  createProject: vi.fn(),
  saveProject: saveProjectMock,
}));

vi.mock("@/lib/analytics", () => ({
  ARTIFACT_INTAKE_SUBMITTED_EVENT: "artifact_intake_submitted",
  trackEvent: vi.fn(),
}));

const createProject = (overrides: Partial<Project> = {}): Project => ({
  id: "project-1",
  name: "AI Research Copilot",
  description: "Validate startup ideas with customer notes, chat history, and phased execution.",
  phase: "Build",
  updatedAt: "2024-03-10T15:30:00.000Z",
  notes: [
    {
      id: "note-1",
      title: "ICP",
      content: "B2B SaaS founders doing rapid validation.",
      color: "yellow",
      x: 80,
      y: 120,
    },
    {
      id: "note-2",
      title: "Signal",
      content: "Founders struggle to synthesize interviews.",
      color: "yellow",
      x: 220,
      y: 180,
    },
  ],
  sections: [],
  messages: [
    {
      id: "message-1",
      sender: "assistant",
      content: "Let's turn this into a sharper execution plan.",
      createdAt: "2024-03-10T15:00:00.000Z",
    },
  ],
  phases: [
    {
      id: "discovery",
      title: "Discovery",
      tasks: [{ id: "task-1", label: "Interview target users", done: true }],
    },
    {
      id: "build",
      title: "Build",
      tasks: [{ id: "task-2", label: "Prototype the workflow", done: false }],
    },
  ],
  ...overrides,
});

const renderPage = () => render(<DashboardPage />);

describe("DashboardPage", () => {
  let locationHref = "http://localhost/dashboard";
  let setHref: Mock<(value: string) => void>;

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();

    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(trackEvent).mockResolvedValue(undefined);
    vi.mocked(createProjectRecord).mockImplementation(() =>
      createProject({
        id: "starter-project",
        name: "Untitled Project",
        description: "A new concept taking shape with your AI cofounder.",
        phase: "Getting started",
        messages: [
          {
            id: "message-1",
            sender: "assistant",
            content: "I’m analyzing your idea. Let me research this and turn it into a sharper plan.",
            createdAt: "2024-03-10T15:00:00.000Z",
          },
        ],
        notes: [
          {
            id: "note-1",
            title: "Idea",
            content: "Describe the product idea in one sentence.",
            color: "yellow",
            x: 80,
            y: 120,
          },
          {
            id: "note-2",
            title: "Problem statement",
            content: "Who has the problem?",
            color: "yellow",
            x: 220,
            y: 180,
          },
        ],
        phases: [
          {
            id: "getting-started",
            title: "Getting started",
            tasks: [
              { id: "task-1", label: "Write down the idea", done: false },
              { id: "task-2", label: "Define the problem statement", done: false },
            ],
          },
          {
            id: "understand-project",
            title: "Understand the project",
            tasks: [
              { id: "task-3", label: "Collect market signals", done: false },
              { id: "task-4", label: "Identify the target customer", done: false },
            ],
          },
        ],
      }),
    );

    setHref = vi.fn((value: string) => {
      locationHref = value;
    });

    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        get href() {
          return locationHref;
        },
        set href(value: string) {
          setHref(value);
        },
      },
    });
  });

  it("renders page header with AI Cofounder branding and Your projects subtext", () => {
    window.localStorage.setItem("onboarding-dismissed", "true");

    renderPage();

    expect(screen.getByText("AI Cofounder")).toBeInTheDocument();
    expect(screen.getByText("Your projects")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /AI Cofounder Your projects/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders workspace heading Your Projects and description paragraph", () => {
    window.localStorage.setItem("onboarding-dismissed", "true");

    renderPage();

    expect(screen.getByRole("heading", { name: "Your Projects" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Start a new company idea, collect evidence, and shape it with your AI cofounder.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the header New Project button", () => {
    window.localStorage.setItem("onboarding-dismissed", "true");

    renderPage();

    expect(screen.getByRole("button", { name: "New Project" })).toBeInTheDocument();
  });

  it("renders the + create-new card with New Project heading and description", () => {
    window.localStorage.setItem("onboarding-dismissed", "true");

    renderPage();

    const cardHeading = screen.getByRole("heading", { name: "New Project" });
    const card = cardHeading.closest("button");

    expect(card).toBeInTheDocument();
    expect(within(card!).getByText("+")).toBeInTheDocument();
    expect(
      within(card!).getByText(
        "Create a workspace with starter notes, chat history, and a phased build plan.",
      ),
    ).toBeInTheDocument();
  });

  it("renders only the + card when getStoredProjects returns an empty list", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    window.localStorage.setItem("onboarding-dismissed", "true");

    renderPage();

    await waitFor(() => {
      expect(getProjects).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole("heading", { name: "New Project" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /AI Research Copilot/i })).not.toBeInTheDocument();
  });

  it("shows a first-project handoff when no projects exist and onboarding is closed", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    window.localStorage.setItem("onboarding-dismissed", "true");

    renderPage();

    expect(await screen.findByText("First project handoff")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Launching a project opens a workspace that guides you through sharpening the claim, outlining a customer research memo, and pressure-testing a validation scorecard so the next decision is clearer.",
      ),
    ).toBeInTheDocument();
  });

  it("renders project cards showing phase, name, description, note count, and formatted updated date", async () => {
    const project = createProject();
    vi.mocked(getProjects).mockResolvedValue([project]);

    renderPage();

    expect(await screen.findByText("Build")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI Research Copilot" })).toBeInTheDocument();
    expect(screen.getByText(project.description)).toBeInTheDocument();
    expect(screen.getByText("2 notes")).toBeInTheDocument();
    expect(screen.getByText("Updated Mar 10, 2024")).toBeInTheDocument();
  });

  it("renders a compact progress summary and next action cue for incomplete project cards", async () => {
    const project = createProject();
    vi.mocked(getProjects).mockResolvedValue([project]);

    renderPage();

    const cardHeading = await screen.findByRole("heading", { name: project.name });
    const card = cardHeading.closest("a");

    expect(card).toBeInTheDocument();
    expect(within(card!).getByText(/1 of 2 tasks complete/i)).toBeInTheDocument();
    expect(within(card!).getByText(/50% complete/i)).toBeInTheDocument();
    expect(within(card!).getByText(/next action/i)).toBeInTheDocument();
    expect(within(card!).getByText(/prototype the workflow/i)).toBeInTheDocument();
  });

  it("renders a completed state without a next action prompt when all tasks are done", async () => {
    const project = createProject({
      id: "project-complete",
      name: "Completed Project",
      phases: [
        {
          id: "discovery",
          title: "Discovery",
          tasks: [{ id: "task-1", label: "Interview target users", done: true }],
        },
        {
          id: "build",
          title: "Build",
          tasks: [{ id: "task-2", label: "Prototype the workflow", done: true }],
        },
      ],
    });
    vi.mocked(getProjects).mockResolvedValue([project]);

    renderPage();

    const cardHeading = await screen.findByRole("heading", { name: project.name });
    const card = cardHeading.closest("a");

    expect(card).toBeInTheDocument();
    expect(within(card!).getByText(/2 of 2 tasks complete/i)).toBeInTheDocument();
    expect(within(card!).getByText(/100% complete/i)).toBeInTheDocument();
    expect(within(card!).getByText(/all tasks complete/i)).toBeInTheDocument();
    expect(within(card!).queryByText(/next action/i)).not.toBeInTheDocument();
    expect(within(card!).queryByText(/prototype the workflow/i)).not.toBeInTheDocument();
  });

  it("renders a coherent zero-task state without a next action or completed prompt", async () => {
    const project = createProject({
      id: "project-zero-tasks",
      name: "Zero Task Project",
      phases: [
        {
          id: "discovery",
          title: "Discovery",
          tasks: [],
        },
      ],
    });
    vi.mocked(getProjects).mockResolvedValue([project]);

    renderPage();

    const cardHeading = await screen.findByRole("heading", { name: project.name });
    const card = cardHeading.closest("a");

    expect(card).toBeInTheDocument();
    expect(within(card!).getByText("No tasks yet")).toBeInTheDocument();
    expect(within(card!).queryByText(/next action/i)).not.toBeInTheDocument();
    expect(within(card!).queryByText(/all tasks complete/i)).not.toBeInTheDocument();
    expect(within(card!).queryByText(/0 of 0 tasks complete/i)).not.toBeInTheDocument();
    expect(within(card!).queryByText(/0% complete/i)).not.toBeInTheDocument();
  });

  it("renders project cards as links to the project detail page", async () => {
    const project = createProject({ id: "project-42", name: "Signal Tracker" });
    vi.mocked(getProjects).mockResolvedValue([project]);

    renderPage();

    expect(await screen.findByRole("link", { name: /Signal Tracker/i })).toHaveAttribute(
      "href",
      "/project/project-42",
    );
  });

  it("clicking the header New Project button opens onboarding", async () => {
    window.localStorage.setItem("onboarding-dismissed", "true");

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "New Project" }));

    expect(await screen.findByRole("dialog", { name: "Welcome to AI Cofounder" })).toBeInTheDocument();
  });

  it("clicking the + card opens onboarding", async () => {
    window.localStorage.setItem("onboarding-dismissed", "true");

    renderPage();

    const createCard = screen.getByRole("heading", { name: "New Project" }).closest("button");
    fireEvent.click(createCard!);

    expect(await screen.findByRole("dialog", { name: "Welcome to AI Cofounder" })).toBeInTheDocument();
  });

  it("renders multiple project cards in the project grid", async () => {
    const projects = [
      createProject({ id: "project-1", name: "AI Research Copilot" }),
      createProject({
        id: "project-2",
        name: "Founder CRM",
        phase: "Plan",
        updatedAt: "2024-05-01T09:00:00.000Z",
        notes: [createProject().notes[0]],
      }),
      createProject({
        id: "project-3",
        name: "Launch Assistant",
        phase: "Launch",
        updatedAt: "2024-06-15T12:00:00.000Z",
        notes: [...createProject().notes, createProject().notes[0]],
      }),
    ];

    vi.mocked(getProjects).mockResolvedValue(projects);

    renderPage();

    expect(await screen.findByRole("link", { name: /AI Research Copilot/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Founder CRM/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Launch Assistant/i })).toBeInTheDocument();
  });

  it("passes redirectTo=/dashboard to AuthButton", () => {
    window.localStorage.setItem("onboarding-dismissed", "true");

    renderPage();

    expect(screen.getByTestId("auth-button")).toHaveAttribute("data-redirect-to", "/dashboard");
  });

  it("formats ISO updated dates in project cards", async () => {
    const project = createProject({
      id: "project-date",
      name: "Date Formatter",
      updatedAt: "2025-01-15T20:00:00.000Z",
    });

    vi.mocked(getProjects).mockResolvedValue([project]);

    renderPage();

    expect(await screen.findByText("Updated Jan 15, 2025")).toBeInTheDocument();
  });

  it("shows onboarding when there are no projects and it has not been dismissed", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);

    renderPage();

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Welcome to AI Cofounder" })).toBeInTheDocument();
    expect(screen.queryByText("First project handoff")).not.toBeInTheDocument();
  });

  it("prefills onboarding from landingPromptDraft and skips the welcome step", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    window.localStorage.setItem("onboarding-dismissed", "true");
    window.sessionStorage.setItem("landingPromptDraft", "Pressure-test this founder workflow idea.");

    renderPage();

    expect(await screen.findByRole("heading", { name: "About Your Idea" })).toBeInTheDocument();
    expect(screen.getByLabelText("What are you thinking about building?")).toHaveValue(
      "Pressure-test this founder workflow idea.",
    );
    expect(screen.getByLabelText("Relevant URL (optional)")).toHaveValue("");
    expect(screen.getByLabelText("Target user (optional)")).toHaveValue("");
    expect(screen.getByLabelText("Main uncertainty (optional)")).toHaveValue("");
  });

  it("prefills structured landingPromptDraft fields from supported labels and keeps unlabeled intro text in the primary idea", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    window.localStorage.setItem("onboarding-dismissed", "true");
    window.sessionStorage.setItem(
      "landingPromptDraft",
      [
        "Pressure-test an AI copilot for founder research before writing code.",
        "",
        "Existing URL or homepage: https://example.com",
        "Who the customer is: Seed-stage founders",
        "Biggest uncertainty: Whether they want one workspace.",
      ].join("\n"),
    );

    renderPage();

    expect(await screen.findByRole("heading", { name: "About Your Idea" })).toBeInTheDocument();
    expect(screen.getByLabelText("What are you thinking about building?")).toHaveValue(
      "Pressure-test an AI copilot for founder research before writing code.",
    );
    expect(screen.getByLabelText("Relevant URL (optional)")).toHaveValue("https://example.com");
    expect(screen.getByLabelText("Target user (optional)")).toHaveValue("Seed-stage founders");
    expect(screen.getByLabelText("Main uncertainty (optional)")).toHaveValue(
      "Whether they want one workspace.",
    );
  });

  it("prefills structured landingPromptDraft fields from accepted label variants", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    window.localStorage.setItem("onboarding-dismissed", "true");
    window.sessionStorage.setItem(
      "landingPromptDraft",
      [
        "An AI copilot for founder research that turns scattered notes into a validation plan.",
        "",
        "Reference URL: https://example.com/founder-research",
        "Target user: Seed-stage founders",
        "Main uncertainty: Whether they trust AI-generated synthesis.",
      ].join("\n"),
    );

    renderPage();

    expect(await screen.findByRole("heading", { name: "About Your Idea" })).toBeInTheDocument();
    expect(screen.getByLabelText("What are you thinking about building?")).toHaveValue(
      "An AI copilot for founder research that turns scattered notes into a validation plan.",
    );
    expect(screen.getByLabelText("Relevant URL (optional)")).toHaveValue(
      "https://example.com/founder-research",
    );
    expect(screen.getByLabelText("Target user (optional)")).toHaveValue("Seed-stage founders");
    expect(screen.getByLabelText("Main uncertainty (optional)")).toHaveValue(
      "Whether they trust AI-generated synthesis.",
    );
  });

  it("prefills onboarding when landingPromptDraft uses a labeled primary idea line", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    window.localStorage.setItem("onboarding-dismissed", "true");
    window.sessionStorage.setItem(
      "landingPromptDraft",
      [
        "Primary idea: An AI copilot for founder research that turns scattered notes into a validation plan.",
        "Reference URL: https://example.com/founder-research",
        "Target user: Seed-stage founders",
        "Main uncertainty: Whether they trust AI-generated synthesis.",
      ].join("\n"),
    );

    renderPage();

    expect(await screen.findByRole("heading", { name: "About Your Idea" })).toBeInTheDocument();
    expect(screen.getByLabelText("What are you thinking about building?")).toHaveValue(
      "An AI copilot for founder research that turns scattered notes into a validation plan.",
    );
    expect(screen.getByLabelText("Relevant URL (optional)")).toHaveValue(
      "https://example.com/founder-research",
    );
    expect(screen.getByLabelText("Target user (optional)")).toHaveValue("Seed-stage founders");
    expect(screen.getByLabelText("Main uncertainty (optional)")).toHaveValue(
      "Whether they trust AI-generated synthesis.",
    );
  });

  it("prefills onboarding from the stored draft when a returning user with projects clicks New Project", async () => {
    vi.mocked(getProjects).mockResolvedValue([createProject()]);
    window.localStorage.setItem("onboarding-dismissed", "true");
    window.sessionStorage.setItem("landingPromptDraft", "Pressure-test this founder workflow idea.");

    renderPage();

    expect(await screen.findByRole("link", { name: /AI Research Copilot/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New Project" }));

    expect(await screen.findByRole("heading", { name: "About Your Idea" })).toBeInTheDocument();
    expect(screen.getByLabelText("What are you thinking about building?")).toHaveValue(
      "Pressure-test this founder workflow idea.",
    );
  });

  it("keeps a user-opened onboarding draft open when the initial projects load resolves afterward", async () => {
    const deferredProjects = createDeferredPromise<Project[]>();

    vi.mocked(getProjects).mockReturnValue(deferredProjects.promise);
    window.localStorage.setItem("onboarding-dismissed", "true");
    window.sessionStorage.setItem("landingPromptDraft", "Pressure-test this founder workflow idea.");

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "New Project" }));

    expect(await screen.findByRole("heading", { name: "About Your Idea" })).toBeInTheDocument();
    expect(screen.getByLabelText("What are you thinking about building?")).toHaveValue(
      "Pressure-test this founder workflow idea.",
    );

    deferredProjects.resolve([createProject()]);

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "About Your Idea" })).toBeInTheDocument();
    });

    expect(screen.getByLabelText("What are you thinking about building?")).toHaveValue(
      "Pressure-test this founder workflow idea.",
    );
  });

  it("does not clear the stored draft when a returning user opens onboarding", async () => {
    vi.mocked(getProjects).mockResolvedValue([createProject()]);
    window.localStorage.setItem("onboarding-dismissed", "true");
    window.sessionStorage.setItem("landingPromptDraft", "Pressure-test this founder workflow idea.");

    renderPage();

    expect(await screen.findByRole("link", { name: /AI Research Copilot/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New Project" }));

    expect(await screen.findByRole("heading", { name: "About Your Idea" })).toBeInTheDocument();
    expect(window.sessionStorage.getItem("landingPromptDraft")).toBe(
      "Pressure-test this founder workflow idea.",
    );
  });

  it("skips onboarding by setting localStorage and closing the modal", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    window.sessionStorage.setItem("landingPromptDraft", "Validate the draft idea.");

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Skip" }));

    await waitFor(() => {
      expect(window.localStorage.getItem("onboarding-dismissed")).toBe("true");
      expect(window.sessionStorage.getItem("landingPromptDraft")).toBeNull();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("completes onboarding by creating a personalized project and redirecting to the new project", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    const personalizedProject = createProject({
      id: "starter-personalized",
      name: "Personalized Starter",
      description: "Personalized description",
    });
    vi.mocked(createProjectRecord).mockReturnValueOnce(personalizedProject);
    vi.mocked(createProjectMock).mockImplementation(async (initialProject?: Project) => ({
      ...(initialProject ?? createProject()),
      id: "guided-project",
    }));
    window.sessionStorage.setItem("landingPromptDraft", "An AI copilot for founder research.");

    renderPage();

    await startOnboarding();
    const intake = completeIntake();
    fireEvent.click(screen.getByRole("button", { name: "Launch Project" }));

    await waitFor(() => {
      expect(createProjectRecord).toHaveBeenCalledTimes(1);
      expect(createProjectRecord).toHaveBeenCalledWith(intake);
      expect(createProjectMock).toHaveBeenCalledTimes(1);
      expect(createProjectMock).toHaveBeenCalledWith(personalizedProject);
      expect(setHref).toHaveBeenCalledWith("/project/guided-project");
      expect(window.sessionStorage.getItem("landingPromptDraft")).toBeNull();
    });

    expect(trackEvent).toHaveBeenCalledWith(
      "artifact_intake_submitted",
      expect.objectContaining({
        project_id: "guided-project",
        source: "onboarding",
        has_primary_idea: true,
        has_url: true,
        has_target_user: true,
        has_main_uncertainty: true,
      }),
    );
    expect(trackEvent).toHaveBeenCalledWith(
      "project_created",
      expect.objectContaining({
        project_id: "guided-project",
        source: "onboarding",
      }),
    );
  });

  it("does not call saveProject in the onboarding create path", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProjectMock).mockImplementation(async (initialProject?: Project) => ({
      ...(initialProject ?? createProject()),
      id: "guided-project-no-save",
    }));

    renderPage();

    await startOnboarding();
    completeIntake();
    fireEvent.click(screen.getByRole("button", { name: "Launch Project" }));

    await waitFor(() => {
      expect(createProjectMock).toHaveBeenCalledTimes(1);
    });

    expect((createProjectMock as unknown as { mock: { calls: unknown[][] } }).mock.calls).toHaveLength(1);
    expect((createProjectRecord as unknown as { mock: { calls: unknown[][] } }).mock.calls).toHaveLength(1);
    expect(saveProjectMock).not.toHaveBeenCalled();
  });

  it("uses createProjectRecord(intake) before createProject(personalizedProject)", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    const personalizedProject = createProject({ id: "starter-sequence" });
    vi.mocked(createProjectRecord).mockReturnValueOnce(personalizedProject);
    vi.mocked(createProjectMock).mockResolvedValue(createProject({ id: "guided-project-sequence" }));

    renderPage();

    await startOnboarding();
    const intake = completeIntake({
      primaryIdea: "A tool for founder research synthesis.",
      url: "https://example.com/founder-research",
      targetUser: "Seed-stage founders",
      mainUncertainty: "Whether they want one workspace.",
    });
    fireEvent.click(screen.getByRole("button", { name: "Launch Project" }));

    await waitFor(() => {
      expect(createProjectRecord).toHaveBeenCalledTimes(1);
      expect(createProjectMock).toHaveBeenCalledTimes(1);
      expect(createProjectRecord).toHaveBeenCalledWith(intake);
      expect(createProjectMock).toHaveBeenCalledWith(personalizedProject);
    });

    const createProjectRecordOrder = vi.mocked(createProjectRecord).mock.invocationCallOrder[0];
    const createProjectOrder = vi.mocked(createProjectMock).mock.invocationCallOrder[0];
    expect(createProjectRecordOrder).toBeLessThan(createProjectOrder);
  });

  it("prevents double-submitting Launch Project while project creation is in flight", async () => {
    let resolveCreateProject: ((project: Project) => void) | undefined;
    const createdProject = createProject({ id: "guided-project-pending", name: "Untitled Project" });
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProjectMock).mockImplementationOnce(
      () =>
        new Promise<Project>((resolve) => {
          resolveCreateProject = resolve;
        }),
    );

    renderPage();

    await startOnboarding();
    completeIntake();

    fireEvent.click(screen.getByRole("button", { name: "Launch Project" }));

    expect(screen.getByRole("button", { name: "Launching..." })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Launching..." }));

    await waitFor(() => {
      expect(createProjectMock).toHaveBeenCalledTimes(1);
    });

    resolveCreateProject?.(createdProject);

    await waitFor(() => {
      expect(createProjectMock).toHaveBeenCalledWith(expect.objectContaining({ id: "starter-project" }));
      expect(setHref).toHaveBeenCalledWith("/project/guided-project-pending");
    });
  });

  it("tracks optional intake fields as false when they are omitted", async () => {
    const createdProject = createProject({ id: "guided-project-minimal", name: "Untitled Project" });
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProjectMock).mockResolvedValue(createdProject);

    renderPage();

    await startOnboarding();
    const intake = completeIntake({
      primaryIdea: "A tool for founder research synthesis.",
      url: "",
      targetUser: "",
      mainUncertainty: "",
    });
    fireEvent.click(screen.getByRole("button", { name: "Launch Project" }));

    await waitFor(() => {
      expect(createProjectRecord).toHaveBeenCalledWith(intake);
      expect(createProjectMock).toHaveBeenCalledWith(expect.objectContaining({ id: "starter-project" }));
    });

    expect(trackEvent).toHaveBeenCalledWith(
      "artifact_intake_submitted",
      expect.objectContaining({
        project_id: "guided-project-minimal",
        source: "onboarding",
        has_primary_idea: true,
        has_url: false,
        has_target_user: false,
        has_main_uncertainty: false,
      }),
    );
  });

  it("passes long primary ideas through createProjectRecord intake", async () => {
    const createdProject = createProject({ id: "guided-project-long-name", name: "Untitled Project" });
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProjectMock).mockResolvedValue(createdProject);

    renderPage();

    await startOnboarding();
    const intake = completeIntake({
      primaryIdea:
        "An AI copilot for founder research that turns scattered notes into a concrete validation plan with shared evidence trails for every decision. Extra context stays in the description.",
      url: "",
      targetUser: "",
      mainUncertainty: "",
    });
    fireEvent.click(screen.getByRole("button", { name: "Launch Project" }));

    await waitFor(() => {
      expect(createProjectRecord).toHaveBeenCalledWith(intake);
      expect(createProjectMock).toHaveBeenCalledWith(expect.objectContaining({ id: "starter-project" }));
    });
  });
});
