import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

import DashboardPage from "@/app/dashboard/page";
import { trackEvent } from "@/lib/analytics";
import { createProject as createProjectMock, getProjects, saveProject } from "@/lib/projects";
import type { Project } from "@/lib/types";

async function startOnboarding() {
  fireEvent.click(await screen.findByRole("button", { name: "Get Started" }));
}

async function completeIntake(overrides?: {
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

  await screen.findByRole("heading", { name: "About Your Idea" });

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
  fireEvent.click(await screen.findByRole("button", { name: "Continue" }));

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

vi.mock("@/lib/projects", () => ({
  getProjects: vi.fn(),
  createProject: vi.fn(),
  saveProject: vi.fn(),
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
    vi.mocked(saveProject).mockResolvedValue();
    vi.mocked(trackEvent).mockResolvedValue(undefined);

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

  it("renders a portfolio health strip with total projects, open tasks, and completed milestones", async () => {
    const projects = [
      createProject({
        id: "project-open",
        phase: "Build",
        phases: [
          {
            id: "build",
            title: "Build",
            tasks: [
              { id: "task-1", label: "Prototype workflow", done: true },
              { id: "task-2", label: "Run usability test", done: false },
            ],
          },
        ],
      }),
      createProject({
        id: "project-complete",
        phase: "Plan",
        phases: [
          {
            id: "plan",
            title: "Plan",
            tasks: [
              { id: "task-3", label: "Define GTM plan", done: true },
              { id: "task-4", label: "Set launch metric", done: true },
            ],
          },
        ],
      }),
      createProject({
        id: "project-empty",
        phase: "Discovery",
        phases: [{ id: "discovery", title: "Discovery", tasks: [] }],
      }),
    ];
    vi.mocked(getProjects).mockResolvedValue(projects);

    renderPage();

    await screen.findByText("Total projects");
    expect(screen.getByTestId("portfolio-total-projects")).toHaveTextContent("3");
    expect(screen.getByTestId("portfolio-open-tasks")).toHaveTextContent("1");
    expect(screen.getByTestId("portfolio-completed-milestones")).toHaveTextContent("1");
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

  it("renders each project card with status and current milestone task progress", async () => {
    const projects = [
      createProject({
        id: "project-active",
        name: "Project Active",
        phase: "Build",
        phases: [
          {
            id: "build",
            title: "Build",
            tasks: [
              { id: "task-1", label: "Task A", done: true },
              { id: "task-2", label: "Task B", done: false },
            ],
          },
        ],
      }),
      createProject({
        id: "project-complete",
        name: "Project Complete",
        phase: "Launch",
        phases: [
          {
            id: "launch",
            title: "Launch",
            tasks: [
              { id: "task-3", label: "Task C", done: true },
              { id: "task-4", label: "Task D", done: true },
            ],
          },
        ],
      }),
    ];
    vi.mocked(getProjects).mockResolvedValue(projects);

    renderPage();

    expect(await screen.findByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Milestone complete")).toBeInTheDocument();
    expect(screen.getByText("1/2 tasks complete")).toBeInTheDocument();
    expect(screen.getByText("2/2 tasks complete")).toBeInTheDocument();
  });

  it("treats unmatched current phase as having no current-phase tasks", async () => {
    const project = createProject({
      id: "project-mismatch-phase",
      name: "Mismatch Phase",
      phase: "Nonexistent",
      phases: [
        {
          id: "discovery",
          title: "Discovery",
          tasks: [{ id: "task-1", label: "This should not be counted", done: false }],
        },
      ],
    });
    vi.mocked(getProjects).mockResolvedValue([project]);

    renderPage();

    expect(await screen.findByRole("link", { name: /Mismatch Phase/i })).toBeInTheDocument();
    expect(screen.getAllByText("No tasks yet")).toHaveLength(2);
    expect(screen.getByTestId("portfolio-open-tasks")).toHaveTextContent("0");
    expect(screen.getByTestId("portfolio-completed-milestones")).toHaveTextContent("0");
  });

  it("sorts projects for triage by open work first, then recency, then completed milestones", async () => {
    const projects = [
      createProject({
        id: "project-complete-new",
        name: "Complete New",
        phase: "Plan",
        updatedAt: "2026-02-01T10:00:00.000Z",
        phases: [
          {
            id: "plan",
            title: "Plan",
            tasks: [
              { id: "task-1", label: "Task A", done: true },
              { id: "task-2", label: "Task B", done: true },
            ],
          },
        ],
      }),
      createProject({
        id: "project-open-old",
        name: "Open Old",
        phase: "Build",
        updatedAt: "2024-01-01T10:00:00.000Z",
        phases: [
          {
            id: "build",
            title: "Build",
            tasks: [
              { id: "task-3", label: "Task C", done: true },
              { id: "task-4", label: "Task D", done: false },
            ],
          },
        ],
      }),
      createProject({
        id: "project-open-new",
        name: "Open New",
        phase: "Build",
        updatedAt: "2025-01-01T10:00:00.000Z",
        phases: [
          {
            id: "build",
            title: "Build",
            tasks: [
              { id: "task-5", label: "Task E", done: false },
              { id: "task-6", label: "Task F", done: false },
            ],
          },
        ],
      }),
    ];
    vi.mocked(getProjects).mockResolvedValue(projects);

    renderPage();

    await screen.findByRole("link", { name: /Open New/i });

    const projectLinksInOrder = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/project/"))
      .map((link) => link.querySelector("h2")?.textContent?.trim());

    expect(projectLinksInOrder).toEqual(["Open New", "Open Old", "Complete New"]);
  });

  it("handles malformed updatedAt values with a fallback label and stable triage ordering", async () => {
    const projects = [
      createProject({
        id: "project-open-malformed-date",
        name: "Open Malformed Date",
        phase: "Build",
        updatedAt: "not-a-date",
        phases: [
          {
            id: "build",
            title: "Build",
            tasks: [{ id: "task-1", label: "Task A", done: false }],
          },
        ],
      }),
      createProject({
        id: "project-open-valid-date",
        name: "Open Valid Date",
        phase: "Build",
        updatedAt: "2025-04-01T10:00:00.000Z",
        phases: [
          {
            id: "build",
            title: "Build",
            tasks: [{ id: "task-2", label: "Task B", done: false }],
          },
        ],
      }),
    ];
    vi.mocked(getProjects).mockResolvedValue(projects);

    renderPage();

    expect(await screen.findByRole("link", { name: /Open Valid Date/i })).toBeInTheDocument();
    expect(screen.getByText("Updated Unknown date")).toBeInTheDocument();

    const projectLinksInOrder = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/project/"))
      .map((link) => link.querySelector("h2")?.textContent?.trim());

    expect(projectLinksInOrder).toEqual(["Open Valid Date", "Open Malformed Date"]);
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

  it("completes onboarding by creating, saving, and redirecting to the new project", async () => {
    const createdProject = createProject({ id: "guided-project", name: "Untitled Project" });
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProjectMock).mockResolvedValue(createdProject);
    window.sessionStorage.setItem("landingPromptDraft", "An AI copilot for founder research.");

    renderPage();

    await startOnboarding();
    const intake = await completeIntake();
    fireEvent.click(screen.getByRole("button", { name: "Launch Project" }));

    await waitFor(() => {
      expect(createProjectMock).toHaveBeenCalledTimes(1);
      expect(saveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "guided-project",
          name: expect.stringMatching(/^An AI copilot for founder research/),
          description:
            `${intake.primaryIdea}\n\nTarget user: ${intake.targetUser}\n\nMain uncertainty: ${intake.mainUncertainty}\n\nReference URL: ${intake.url}`,
        }),
      );
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
      expect(saveProject).toHaveBeenCalledWith(expect.objectContaining({ id: "guided-project-pending" }));
      expect(setHref).toHaveBeenCalledWith("/project/guided-project-pending");
    });
  });

  it("tracks optional intake fields as false when they are omitted", async () => {
    const createdProject = createProject({ id: "guided-project-minimal", name: "Untitled Project" });
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProjectMock).mockResolvedValue(createdProject);

    renderPage();

    await startOnboarding();
    await completeIntake({
      primaryIdea: "A tool for founder research synthesis.",
      url: "",
      targetUser: "",
      mainUncertainty: "",
    });
    fireEvent.click(screen.getByRole("button", { name: "Launch Project" }));

    await waitFor(() => {
      expect(saveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "guided-project-minimal",
          name: "A tool for founder research synthesis",
          description: "A tool for founder research synthesis.",
        }),
      );
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

  it("truncates the derived project name when the first sentence exceeds sixty characters", async () => {
    const createdProject = createProject({ id: "guided-project-long-name", name: "Untitled Project" });
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProjectMock).mockResolvedValue(createdProject);

    renderPage();

    await startOnboarding();
    await completeIntake({
      primaryIdea:
        "An AI copilot for founder research that turns scattered notes into a concrete validation plan with shared evidence trails for every decision. Extra context stays in the description.",
      url: "",
      targetUser: "",
      mainUncertainty: "",
    });
    fireEvent.click(screen.getByRole("button", { name: "Launch Project" }));

    await waitFor(() => {
      expect(saveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "guided-project-long-name",
          name: "An AI copilot for founder research that turns scattered n...",
          description:
            "An AI copilot for founder research that turns scattered notes into a concrete validation plan with shared evidence trails for every decision. Extra context stays in the description.",
        }),
      );
    });
  });
});
