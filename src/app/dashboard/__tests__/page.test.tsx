import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DashboardPage from "@/app/dashboard/page";
import { trackEvent } from "@/lib/analytics";
import {
  applyOnboardingStarterContent,
  createProject as createProjectMock,
  getProjects,
  saveProject,
} from "@/lib/projects";
import type { Project } from "@/lib/types";

function createDeferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

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

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@/components/AuthButton", () => ({
  default: (props: { redirectTo?: string }) => (
    <div data-testid="auth-button" data-redirect-to={props.redirectTo} />
  ),
}));

vi.mock("@/lib/projects", () => ({
  applyOnboardingStarterContent: vi.fn((project: Project, intake: {
    primaryIdea: string;
    targetUser?: string;
    mainUncertainty?: string;
    url?: string;
  }) => ({
    ...project,
    notes: [
      {
        id: "note-tailored-1",
        title: "Idea brief",
        content: intake.primaryIdea,
        color: "yellow",
        x: 72,
        y: 72,
      },
      {
        id: "note-tailored-2",
        title: "First validation focus",
        content: [
          intake.targetUser ? `Target user: ${intake.targetUser}` : null,
          intake.mainUncertainty ? `Main uncertainty: ${intake.mainUncertainty}` : null,
          intake.url ? `Reference URL: ${intake.url}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        color: "yellow",
        x: 340,
        y: 140,
      },
    ],
    messages: [
      {
        id: "message-tailored-1",
        sender: "assistant",
        content: `I’m starting with ${intake.primaryIdea}`,
        createdAt: "2024-03-10T15:31:00.000Z",
      },
    ],
    phases: [
      {
        id: "getting-started",
        title: "Getting started",
        tasks: [
          { id: "task-tailored-1", label: `Capture the core idea: ${intake.primaryIdea}`, done: false },
          {
            id: "task-tailored-2",
            label: intake.targetUser
              ? `Define why ${intake.targetUser} would care first`
              : "Define the highest-priority user problem",
            done: false,
          },
        ],
      },
    ],
  })),
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
  documents: [],
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

async function renderPage() {
  const rendered = render(<DashboardPage />);

  await waitFor(() => {
    expect(getProjects).toHaveBeenCalledTimes(1);
  });

  return rendered;
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();

    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(saveProject).mockResolvedValue();
    vi.mocked(trackEvent).mockResolvedValue(undefined);
  });

  it("renders page header with AI Cofounder branding and Your projects subtext", async () => {
    window.localStorage.setItem("onboarding-dismissed", "true");

    await renderPage();

    expect(screen.getByText("AI Cofounder")).toBeInTheDocument();
    expect(screen.getByText("Your projects")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /AI Cofounder Your projects/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders workspace heading Your Projects and description paragraph", async () => {
    window.localStorage.setItem("onboarding-dismissed", "true");

    await renderPage();

    expect(screen.getByRole("heading", { name: "Your Projects" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Start a new company idea, collect evidence, and shape it with your AI cofounder.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the header New Project button", async () => {
    window.localStorage.setItem("onboarding-dismissed", "true");

    await renderPage();

    expect(screen.getByRole("button", { name: "New Project" })).toBeInTheDocument();
  });

  it("renders the + create-new card with New Project heading and description", async () => {
    window.localStorage.setItem("onboarding-dismissed", "true");

    await renderPage();

    const cardHeading = screen.getAllByRole("heading", { name: "New Project" })[0];
    const card = cardHeading.closest("button");

    expect(card).toBeInTheDocument();
    expect(within(card!).getByText("+")).toBeInTheDocument();
    expect(
      within(card!).getByText(
        "Create a workspace with starter notes, chat history, and a phased build plan.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the guided empty state when there are no projects and onboarding was dismissed", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    window.localStorage.setItem("onboarding-dismissed", "true");

    await renderPage();

    expect(screen.getByRole("heading", { name: "Start with a brief, not a blank page" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your first workspace includes" })).toBeInTheDocument();
    expect(screen.getByText("A founder brief tailored to your idea")).toBeInTheDocument();
    expect(screen.getByText("Starter notes and AI context to build on")).toBeInTheDocument();
    expect(screen.getByText("A phased plan with the next questions to answer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start your first project" })).toBeInTheDocument();

    const starterCards = [
      "Customer research copilot",
      "Ops assistant for clinics",
      "Retail demand planner",
    ].map((title) => screen.getByRole("button", { name: new RegExp(title, "i") }));

    for (const card of starterCards) {
      expect(within(card).getByText("Best for")).toBeInTheDocument();
      expect(within(card).getByText("First question")).toBeInTheDocument();
    }

    const customerResearchCard = screen.getByRole("button", { name: /Customer research copilot/i });
    expect(
      within(customerResearchCard).getByText("Pre-seed founders validating a new B2B SaaS idea"),
    ).toBeInTheDocument();
    expect(
      within(customerResearchCard).getByText(
        "Will founders trust an AI-generated brief enough to use it before talking to more customers?",
      ),
    ).toBeInTheDocument();

    expect(screen.getAllByRole("heading", { name: "New Project" })[0]).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /AI Research Copilot/i })).not.toBeInTheDocument();
  });

  it("does not flash the guided empty state before project loading resolves", async () => {
    const deferredProjects = createDeferredPromise<Project[]>();
    vi.mocked(getProjects).mockReturnValue(deferredProjects.promise);
    window.localStorage.setItem("onboarding-dismissed", "true");

    render(<DashboardPage />);

    await waitFor(() => {
      expect(getProjects).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByRole("heading", { name: "Start with a brief, not a blank page" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start your first project" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Project" })).toBeInTheDocument();

    deferredProjects.resolve([]);

    expect(await screen.findByRole("heading", { name: "Start with a brief, not a blank page" })).toBeInTheDocument();
  });

  it("renders project cards showing phase, name, description, note count, and formatted updated date", async () => {
    const project = createProject({
      description:
        "Validate startup ideas with customer notes.\n\nTurn onboarding summaries into cleaner project briefs.",
    });
    vi.mocked(getProjects).mockResolvedValue([project]);

    await renderPage();

    expect(await screen.findByText("Build")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI Research Copilot" })).toBeInTheDocument();
    expect(
      screen.getByText((_, node) => node?.textContent === project.description),
    ).toHaveClass("whitespace-pre-line");
    expect(screen.getByText("2 notes")).toBeInTheDocument();
    expect(screen.getByText("Updated Mar 10, 2024")).toBeInTheDocument();
  });

  it("renders project cards as links to the project detail page", async () => {
    const project = createProject({ id: "project-42", name: "Signal Tracker" });
    vi.mocked(getProjects).mockResolvedValue([project]);

    await renderPage();

    expect(await screen.findByRole("link", { name: /Signal Tracker/i })).toHaveAttribute(
      "href",
      "/project/project-42",
    );
  });

  it("clicking the header New Project button opens onboarding", async () => {
    window.localStorage.setItem("onboarding-dismissed", "true");

    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: "New Project" }));

    expect(await screen.findByRole("dialog", { name: "Welcome to AI Cofounder" })).toBeInTheDocument();
  });

  it("clicking the + card opens onboarding", async () => {
    window.localStorage.setItem("onboarding-dismissed", "true");

    await renderPage();

    const createCard = screen.getAllByRole("heading", { name: "New Project" })[0].closest("button");
    fireEvent.click(createCard!);

    expect(await screen.findByRole("dialog", { name: "Welcome to AI Cofounder" })).toBeInTheDocument();
  });

  it("opens onboarding from the empty-state primary CTA", async () => {
    window.localStorage.setItem("onboarding-dismissed", "true");

    await renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Start your first project" }));

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

    await renderPage();

    expect(await screen.findByRole("link", { name: /AI Research Copilot/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Founder CRM/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Launch Assistant/i })).toBeInTheDocument();
  });

  it("passes redirectTo=/dashboard to AuthButton", async () => {
    window.localStorage.setItem("onboarding-dismissed", "true");

    await renderPage();

    expect(screen.getByTestId("auth-button")).toHaveAttribute("data-redirect-to", "/dashboard");
  });

  it("formats ISO updated dates in project cards", async () => {
    const project = createProject({
      id: "project-date",
      name: "Date Formatter",
      updatedAt: "2025-01-15T20:00:00.000Z",
    });

    vi.mocked(getProjects).mockResolvedValue([project]);

    await renderPage();

    expect(await screen.findByText("Updated Jan 15, 2025")).toBeInTheDocument();
  });

  it("shows onboarding when there are no projects and it has not been dismissed", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);

    await renderPage();

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Welcome to AI Cofounder" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Start with a brief, not a blank page" })).not.toBeInTheDocument();
  });

  it("prefills onboarding from landingPromptDraft and skips the welcome step", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    window.localStorage.setItem("onboarding-dismissed", "true");
    window.sessionStorage.setItem("landingPromptDraft", "Pressure-test this founder workflow idea.");

    await renderPage();

    expect(await screen.findByRole("heading", { name: "About Your Idea" })).toBeInTheDocument();
    expect(screen.getByLabelText("What are you thinking about building?")).toHaveValue(
      "Pressure-test this founder workflow idea.",
    );
  });

  it("opens onboarding with a starter brief prefilled from the empty-state guide", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    window.localStorage.setItem("onboarding-dismissed", "true");

    await renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Ops assistant for clinics/i }));

    expect(await screen.findByRole("heading", { name: "About Your Idea" })).toBeInTheDocument();
    expect(screen.getByLabelText("What are you thinking about building?")).toHaveValue(
      "A workflow assistant for independent clinics that automates patient scheduling follow-ups, no-show recovery, and front-desk task handoffs.",
    );
    expect(screen.getByLabelText("Target user (optional)")).toHaveValue(
      "Practice managers at independent primary care clinics",
    );
    expect(screen.getByLabelText("Main uncertainty (optional)")).toHaveValue(
      "Is the biggest wedge missed appointments, or do clinic teams care more about reducing manual coordination across channels?",
    );
    expect(screen.getByRole("button", { name: /Ops assistant for clinics/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("keeps onboarding dismissed until the user explicitly skips again", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    window.localStorage.setItem("onboarding-dismissed", "true");

    await renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Start your first project" }));

    expect(await screen.findByRole("dialog", { name: "Welcome to AI Cofounder" })).toBeInTheDocument();
    expect(window.localStorage.getItem("onboarding-dismissed")).toBe("true");
  });

  it("shows a load error and keeps the page usable when project loading fails", async () => {
    vi.mocked(getProjects).mockRejectedValue(new Error("load failed"));
    window.localStorage.setItem("onboarding-dismissed", "true");

    await renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't load your projects. You can still start a new project.",
    );
    expect(screen.queryByRole("heading", { name: "Start with a brief, not a blank page" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Project" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New Project" }));

    expect(await screen.findByRole("dialog", { name: "Welcome to AI Cofounder" })).toBeInTheDocument();
  });

  it("skips onboarding by setting localStorage and closing the modal", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    window.sessionStorage.setItem("landingPromptDraft", "Validate the draft idea.");

    await renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Skip" }));

    await waitFor(() => {
      expect(window.localStorage.getItem("onboarding-dismissed")).toBe("true");
      expect(window.sessionStorage.getItem("landingPromptDraft")).toBeNull();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("closes onboarding without dismissing it while reopening generic entry points from explicit sources only", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    window.localStorage.setItem("onboarding-dismissed", "true");
    window.sessionStorage.setItem("landingPromptDraft", "Validate the landing draft.");

    await renderPage();

    expect(await screen.findByRole("heading", { name: "About Your Idea" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Target user (optional)"), {
      target: { value: "Independent founders" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Close onboarding" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    expect(window.localStorage.getItem("onboarding-dismissed")).toBe("true");
    expect(window.sessionStorage.getItem("landingPromptDraft")).toBe("Validate the landing draft.");

    fireEvent.click(screen.getByRole("button", { name: "Start your first project" }));

    expect(await screen.findByRole("heading", { name: "About Your Idea" })).toBeInTheDocument();
    expect(screen.getByLabelText("What are you thinking about building?")).toHaveValue(
      "Validate the landing draft.",
    );
    expect(screen.getByLabelText("Target user (optional)")).toHaveValue("");
  });

  it("completes onboarding by creating, saving, and redirecting to the new project", async () => {
    const createdProject = createProject({ id: "guided-project", name: "Untitled Project" });
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProjectMock).mockResolvedValue(createdProject);
    window.sessionStorage.setItem("landingPromptDraft", "An AI copilot for founder research.");

    await renderPage();

    await startOnboarding();
    const intake = completeIntake();
    fireEvent.click(screen.getByRole("button", { name: "Launch Project" }));

    await waitFor(() => {
      expect(createProjectMock).toHaveBeenCalledTimes(1);
      expect(applyOnboardingStarterContent).toHaveBeenCalledWith(createdProject, intake);
      expect(saveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "guided-project",
          name: expect.stringMatching(/^An AI copilot for founder research/),
          description:
            `${intake.primaryIdea}\n\nTarget user: ${intake.targetUser}\n\nMain uncertainty: ${intake.mainUncertainty}\n\nReference URL: ${intake.url}`,
          notes: [
            expect.objectContaining({
              title: "Idea brief",
              content: intake.primaryIdea,
            }),
            expect.objectContaining({
              title: "First validation focus",
              content:
                `Target user: ${intake.targetUser}\nMain uncertainty: ${intake.mainUncertainty}\nReference URL: ${intake.url}`,
            }),
          ],
          messages: [
            expect.objectContaining({
              sender: "assistant",
              content: expect.stringContaining(intake.primaryIdea),
            }),
          ],
          phases: [
            expect.objectContaining({
              id: "getting-started",
              tasks: [
                expect.objectContaining({
                  label: `Capture the core idea: ${intake.primaryIdea}`,
                }),
                expect.objectContaining({
                  label: `Define why ${intake.targetUser} would care first`,
                }),
              ],
            }),
          ],
        }),
      );
      expect(pushMock).toHaveBeenCalledWith("/project/guided-project");
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

  it("tracks optional intake fields as false when they are omitted", async () => {
    const createdProject = createProject({ id: "guided-project-minimal", name: "Untitled Project" });
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProjectMock).mockResolvedValue(createdProject);

    await renderPage();

    await startOnboarding();
    completeIntake({
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

    await renderPage();

    await startOnboarding();
    completeIntake({
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

  it("prevents duplicate project creation submissions while launch is in flight", async () => {
    const createdProject = createProject({ id: "guided-project-duplicate", name: "Untitled Project" });
    let resolveCreateProject: ((project: Project) => void) | undefined;
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProjectMock).mockImplementation(
      () =>
        new Promise<Project>((resolve) => {
          resolveCreateProject = resolve;
        }),
    );

    await renderPage();

    await startOnboarding();
    completeIntake();

    const launchButton = screen.getByRole("button", { name: "Launch Project" });
    fireEvent.click(launchButton);
    fireEvent.click(screen.getByRole("button", { name: "Launching..." }));

    await waitFor(() => {
      expect(createProjectMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole("button", { name: "Launching..." })).toBeDisabled();

    resolveCreateProject?.(createdProject);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/project/guided-project-duplicate");
    });
  });

  it("shows a visible error and keeps onboarding open when project creation fails", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProjectMock).mockRejectedValue(new Error("create failed"));

    await renderPage();

    await startOnboarding();
    completeIntake();
    fireEvent.click(screen.getByRole("button", { name: "Launch Project" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't create your project. Please try again.",
    );
    expect(screen.getByRole("heading", { name: "Ready to Launch" })).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a visible error and keeps onboarding open when saving fails", async () => {
    const createdProject = createProject({ id: "guided-project-save-failure", name: "Untitled Project" });
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProjectMock).mockResolvedValue(createdProject);
    vi.mocked(saveProject).mockRejectedValue(new Error("save failed"));

    await renderPage();

    await startOnboarding();
    completeIntake();
    fireEvent.click(screen.getByRole("button", { name: "Launch Project" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't create your project. Please try again.",
    );
    expect(screen.getByRole("heading", { name: "Ready to Launch" })).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
