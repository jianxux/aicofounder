import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

import DashboardPage from "@/app/dashboard/page";
import { createAndStoreProject, getStoredProjects } from "@/lib/projects";
import type { Project } from "@/lib/types";

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
  getStoredProjects: vi.fn(),
  createAndStoreProject: vi.fn(),
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

    vi.mocked(getStoredProjects).mockReturnValue([]);

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
    renderPage();

    expect(screen.getByText("AI Cofounder")).toBeInTheDocument();
    expect(screen.getByText("Your projects")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /AI Cofounder Your projects/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders workspace heading Your Projects and description paragraph", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Your Projects" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Start a new company idea, collect evidence, and shape it with your AI cofounder.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the header New Project button", () => {
    renderPage();

    expect(screen.getByRole("button", { name: "New Project" })).toBeInTheDocument();
  });

  it("renders the + create-new card with New Project heading and description", () => {
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
    vi.mocked(getStoredProjects).mockReturnValue([]);

    renderPage();

    await waitFor(() => {
      expect(getStoredProjects).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole("heading", { name: "New Project" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /AI Research Copilot/i })).not.toBeInTheDocument();
  });

  it("renders project cards showing phase, name, description, note count, and formatted updated date", async () => {
    const project = createProject();
    vi.mocked(getStoredProjects).mockReturnValue([project]);

    renderPage();

    expect(await screen.findByText("Build")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI Research Copilot" })).toBeInTheDocument();
    expect(screen.getByText(project.description)).toBeInTheDocument();
    expect(screen.getByText("2 notes")).toBeInTheDocument();
    expect(screen.getByText("Updated Mar 10, 2024")).toBeInTheDocument();
  });

  it("renders project cards as links to the project detail page", async () => {
    const project = createProject({ id: "project-42", name: "Signal Tracker" });
    vi.mocked(getStoredProjects).mockReturnValue([project]);

    renderPage();

    expect(await screen.findByRole("link", { name: /Signal Tracker/i })).toHaveAttribute(
      "href",
      "/project/project-42",
    );
  });

  it("clicking the header New Project button creates a project and redirects to its page", () => {
    vi.mocked(createAndStoreProject).mockReturnValue(createProject({ id: "new-project-header" }));

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "New Project" }));

    expect(createAndStoreProject).toHaveBeenCalledTimes(1);
    expect(setHref).toHaveBeenCalledWith("/project/new-project-header");
    expect(window.location.href).toBe("/project/new-project-header");
  });

  it("clicking the + card creates a project and redirects to its page", () => {
    vi.mocked(createAndStoreProject).mockReturnValue(createProject({ id: "new-project-card" }));

    renderPage();

    const createCard = screen.getByRole("heading", { name: "New Project" }).closest("button");
    fireEvent.click(createCard!);

    expect(createAndStoreProject).toHaveBeenCalledTimes(1);
    expect(setHref).toHaveBeenCalledWith("/project/new-project-card");
    expect(window.location.href).toBe("/project/new-project-card");
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

    vi.mocked(getStoredProjects).mockReturnValue(projects);

    renderPage();

    expect(await screen.findByRole("link", { name: /AI Research Copilot/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Founder CRM/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Launch Assistant/i })).toBeInTheDocument();
  });

  it("passes redirectTo=/dashboard to AuthButton", () => {
    renderPage();

    expect(screen.getByTestId("auth-button")).toHaveAttribute("data-redirect-to", "/dashboard");
  });

  it("formats ISO updated dates in project cards", async () => {
    const project = createProject({
      id: "project-date",
      name: "Date Formatter",
      updatedAt: "2025-01-15T20:00:00.000Z",
    });

    vi.mocked(getStoredProjects).mockReturnValue([project]);

    renderPage();

    expect(await screen.findByText("Updated Jan 15, 2025")).toBeInTheDocument();
  });
});
