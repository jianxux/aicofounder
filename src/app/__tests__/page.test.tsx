import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LandingPage from "@/app/page";
import { trackEvent } from "@/lib/analytics";
import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabase";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/Navbar", () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: vi.fn(),
  createBrowserClient: vi.fn(),
}));

const signInWithOAuth = vi.fn().mockResolvedValue({});
const getUser = vi.fn();
const onAuthStateChange = vi.fn();
const signOut = vi.fn();

function getHeroStarterButtons() {
  const textarea = screen.getByLabelText("I want to");
  const form = textarea.closest("form");

  expect(form).not.toBeNull();

  const exampleButtons = within(form as HTMLFormElement)
    .getAllByRole("button")
    .filter((button) => button.textContent?.trim() !== "Send");

  return {
    textarea,
    exampleButtons,
  };
}

function getHeroStarterButtonLabels(buttons: HTMLElement[]) {
  return buttons.map((button) => button.textContent?.replace(/\s+/g, " ").trim() ?? "");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isSupabaseConfigured).mockReturnValue(true);
  getUser.mockResolvedValue({ data: { user: null } });
  onAuthStateChange.mockReturnValue({
    data: {
      subscription: {
        unsubscribe: vi.fn(),
      },
    },
  });
  vi.mocked(createBrowserClient).mockReturnValue({
    auth: {
      getUser,
      onAuthStateChange,
      signInWithOAuth,
      signOut,
    },
  } as any);
  window.sessionStorage.clear();
});

describe("LandingPage", () => {
  it("tracks the landing page view on mount", () => {
    render(<LandingPage />);

    expect(trackEvent).toHaveBeenCalledWith("page_view", {
      page: "/",
      source: "landing",
    });
  });

  it("renders a centered banner hero with a large founder prompt box", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { name: /Make something people/i })).toBeInTheDocument();
    expect(screen.getByText(/Start with the founder question you cannot shake/i)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Choose your first focus/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Demand validation/i })).toBeChecked();
    expect(screen.getByText(/Check if the demand is real before you commit\./i)).toBeInTheDocument();
    expect(screen.getByLabelText("I want to")).toBeInTheDocument();
    expect(screen.getByText(/Use this when you need clearer evidence that the problem is painful/i)).toBeInTheDocument();
    expect(screen.getByText(/Press Enter to continue/i)).toBeInTheDocument();
    expect(screen.getByText(/Session outputs/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("updates hero guidance when a different focus preset is selected without overwriting typed input", () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: "Keep my draft intact." },
    });
    fireEvent.click(screen.getByRole("radio", { name: /Next-step planning/i }));

    expect(screen.getByRole("radio", { name: /Next-step planning/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Demand validation/i })).not.toBeChecked();
    expect(screen.getByDisplayValue("Keep my draft intact.")).toBeInTheDocument();
    expect(screen.getByText(/Use this when you have signal scattered across notes/i)).toBeInTheDocument();
    expect(screen.getByText("Post-interview founder plan")).toBeInTheDocument();
    expect(screen.getByText("Next-step plan")).toBeInTheDocument();
    expect(screen.getByText(/Momentum improves when each next step closes a specific uncertainty/i)).toBeInTheDocument();
  });

  it("renders concrete founder-specific starter cards for the default demand-validation preset", () => {
    render(<LandingPage />);

    const { exampleButtons } = getHeroStarterButtons();
    const exampleLabels = getHeroStarterButtonLabels(exampleButtons);

    expect(screen.getByRole("radio", { name: /Demand validation/i })).toBeChecked();
    expect(screen.getByText(/Founder example starters/i)).toBeInTheDocument();
    expect(exampleButtons.length).toBeGreaterThanOrEqual(3);
    expect(exampleLabels).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Dispatch follow-up leaks revenue/i),
        expect.stringMatching(/Finance teams closing by spreadsheet/i),
        expect.stringMatching(/Clinic intake no-shows/i),
      ]),
    );
  });

  it("populates the hero textarea from a demand-validation example and keeps the textarea editable", () => {
    render(<LandingPage />);

    const { textarea, exampleButtons } = getHeroStarterButtons();
    const exampleLabel = getHeroStarterButtonLabels(exampleButtons)[0] ?? "";
    const heroTextarea = textarea as HTMLTextAreaElement;

    fireEvent.click(exampleButtons[0]);

    expect(heroTextarea.value).not.toBe("");
    expect(heroTextarea.value).not.toBe(exampleLabel);
    expect(heroTextarea.value.length).toBeGreaterThan(exampleLabel.length);
    expect(heroTextarea.value).toMatch(/home-service operators/i);

    fireEvent.change(textarea, {
      target: { value: `${heroTextarea.value} Add pricing sensitivity interviews.` },
    });

    expect((textarea as HTMLTextAreaElement).value).toMatch(/Add pricing sensitivity interviews\.$/);
  });

  it("shows positioning-specific examples and updates the hero textarea when one is clicked", () => {
    render(<LandingPage />);

    const demandExampleLabels = getHeroStarterButtonLabels(getHeroStarterButtons().exampleButtons);

    fireEvent.click(screen.getByRole("radio", { name: /Positioning/i }));

    const { textarea, exampleButtons } = getHeroStarterButtons();
    const positioningExampleLabels = getHeroStarterButtonLabels(exampleButtons);
    const clickedExampleLabel = positioningExampleLabels[0] ?? "";
    const heroTextarea = textarea as HTMLTextAreaElement;

    expect(screen.getByRole("radio", { name: /Positioning/i })).toBeChecked();
    expect(positioningExampleLabels.length).toBeGreaterThanOrEqual(3);
    expect(positioningExampleLabels).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Security review workflow angle/i),
        expect.stringMatching(/Recruiter scheduling assistant/i),
        expect.stringMatching(/RevOps forecast hygiene/i),
      ]),
    );
    expect(positioningExampleLabels).not.toEqual(demandExampleLabels);

    fireEvent.click(exampleButtons[0]);

    expect(heroTextarea.value).not.toBe("");
    expect(heroTextarea.value).not.toBe(clickedExampleLabel);
    expect(heroTextarea.value.length).toBeGreaterThan(clickedExampleLabel.length);
    expect(heroTextarea.value).toMatch(/security teams complete vendor security reviews faster/i);
  });

  it("opens a login prompt modal when a visitor submits a hero prompt", () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: "Validate an AI workflow before I build it." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByRole("dialog", { name: /Sign in to open this inside your workspace/i })).toBeInTheDocument();
    expect(screen.getByText("Prompt preview")).toBeInTheDocument();
    expect(screen.getAllByText(/Validate an AI workflow before I build it\./i)).toHaveLength(2);
    expect(window.sessionStorage.getItem("landingPromptDraft")).toBe("Validate an AI workflow before I build it.");
    expect(trackEvent).toHaveBeenCalledWith("cta_click", {
      page: "/",
      button: "hero_prompt_submit",
    });
  });

  it("shows continue-to-workspace copy for signed-in users in the hero submit modal", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "founder@example.com",
          user_metadata: {
            full_name: "Founder Example",
          },
        },
      },
    });

    render(<LandingPage />);

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: "Validate an AI workflow before I build it." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /Continue this inside your workspace/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/keep going from the dashboard without losing the draft/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue to workspace" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("button", { name: "Continue with Google" })).not.toBeInTheDocument();
    expect(screen.getByText("Prompt preview")).toBeInTheDocument();
    expect(screen.getAllByText(/Validate an AI workflow before I build it\./i)).toHaveLength(2);
    expect(window.sessionStorage.getItem("landingPromptDraft")).toBe("Validate an AI workflow before I build it.");
  });

  it("closes the login prompt modal on Escape", () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: "Validate an AI workflow before I build it." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: /Sign in to open this inside your workspace/i })).not.toBeInTheDocument();
  });

  it("renders prompt-first proof, workflow moments, trust framing, and the first-session timeline", () => {
    render(<LandingPage />);

    [
      "Prompt-first",
      "Structured",
      "Project-based",
      "Interrogate the market",
      "Shape the point of view",
      "Leave with a plan",
      "Prompt handoff into onboarding",
      "Research and messaging stay connected",
      "Trust comes from visible structure",
      "First session timeline",
      "0-5 min",
      "6-14 min",
      "15-25 min",
      "Homepage headline direction, ICP notes, and the next 3 validation tasks.",
    ].forEach((value) => {
      expect(screen.getByText(value)).toBeInTheDocument();
    });

    expect(screen.queryByText("Filip Dite")).not.toBeInTheDocument();
  });

  it("renders an inspectable sample founder artifact preview with concrete output", () => {
    render(<LandingPage />);

    expect(screen.getByText(/Sample first deliverable/i)).toBeInTheDocument();
    expect(screen.getByText(/Positioning brief v1/i)).toBeInTheDocument();
    expect(screen.getByText(/Ops leads at 50 to 200 person home-service companies/i)).toBeInTheDocument();
    expect(screen.getByText(/Stop losing booked jobs to slow, inconsistent customer follow-up/i)).toBeInTheDocument();
    expect(screen.getByText(/Homepage opening to test/i)).toBeInTheDocument();
  });

  it("tracks all primary CTA clicks", async () => {
    render(<LandingPage />);

    const authButtons = await screen.findAllByRole("button", { name: "Continue with Google" });

    fireEvent.click(authButtons[0]);
    fireEvent.click(screen.getByRole("link", { name: "See the founder workflow" }));
    fireEvent.click(authButtons[1]);

    expect(trackEvent).toHaveBeenCalledWith("cta_click", {
      page: "/",
      button: "hero_get_started_free",
    });
    expect(trackEvent).toHaveBeenCalledWith("cta_click", {
      page: "/",
      button: "hero_see_workspace",
    });
    expect(trackEvent).toHaveBeenCalledWith("cta_click", {
      page: "/",
      button: "footer_get_started",
    });
  });
});
