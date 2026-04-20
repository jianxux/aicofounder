import { fireEvent, render, screen, within } from "@testing-library/react";
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isSupabaseConfigured).mockReturnValue(true);
  vi.mocked(createBrowserClient).mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      }),
      signInWithOAuth,
      signOut: vi.fn(),
    },
  } as any);
  window.sessionStorage.clear();
});

describe("LandingPage", () => {
  function expectChecklistStatus(label: string, status: "Complete" | "Incomplete") {
    const item = screen.getByText(label).closest("li");

    expect(item).not.toBeNull();
    expect(within(item as HTMLElement).getByText(status)).toBeInTheDocument();
  }

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
    expect(screen.getByRole("region", { name: /Prompt quality checklist/i })).toBeInTheDocument();
    expect(screen.getByText("Name the buyer or customer")).toBeInTheDocument();
    expect(screen.getByText("Include proof, evidence, or a metric")).toBeInTheDocument();
    expect(screen.getByText("State the founder goal or decision")).toBeInTheDocument();
    expectChecklistStatus("Name the buyer or customer", "Incomplete");
    expectChecklistStatus("Include proof, evidence, or a metric", "Incomplete");
    expectChecklistStatus("State the founder goal or decision", "Incomplete");
    expect(screen.getByText(/Press Enter to continue/i)).toBeInTheDocument();
    expect(screen.getByText(/Session outputs/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("updates the prompt quality checklist live as the textarea changes", () => {
    render(<LandingPage />);

    const promptInput = screen.getByLabelText("I want to");

    fireEvent.change(promptInput, {
      target: { value: "Help me decide if property managers need this workflow." },
    });

    expectChecklistStatus("Name the buyer or customer", "Complete");
    expectChecklistStatus("Include proof, evidence, or a metric", "Incomplete");
    expectChecklistStatus("State the founder goal or decision", "Complete");

    fireEvent.change(promptInput, {
      target: { value: "Help me decide if property managers need this workflow based on 12 interviews and a 15% conversion rate." },
    });

    expectChecklistStatus("Name the buyer or customer", "Complete");
    expectChecklistStatus("Include proof, evidence, or a metric", "Complete");
    expectChecklistStatus("State the founder goal or decision", "Complete");
  });

  it("does not treat a standalone number as proof", () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: "Help me decide if dentists need this workflow for 2025." },
    });

    expectChecklistStatus("Name the buyer or customer", "Complete");
    expectChecklistStatus("Include proof, evidence, or a metric", "Incomplete");
    expectChecklistStatus("State the founder goal or decision", "Complete");
  });

  it("does not treat generic audience words alone as a named buyer", () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: "Help me decide if founders or users on the team need this workflow." },
    });

    expectChecklistStatus("Name the buyer or customer", "Incomplete");
    expectChecklistStatus("Include proof, evidence, or a metric", "Incomplete");
    expectChecklistStatus("State the founder goal or decision", "Complete");
  });

  it("recognizes explicit founder audience phrases like seed-stage founders", () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: "Help me decide if the target audience is seed-stage founders before I write the homepage." },
    });

    expectChecklistStatus("Name the buyer or customer", "Complete");
    expectChecklistStatus("Include proof, evidence, or a metric", "Incomplete");
    expectChecklistStatus("State the founder goal or decision", "Complete");
  });

  it("recognizes explicit audience phrases for teams, PMs, operators, and agencies", () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: "Help me decide whether this is built for PMs and operators at small agencies and in-house teams." },
    });

    expectChecklistStatus("Name the buyer or customer", "Complete");
    expectChecklistStatus("Include proof, evidence, or a metric", "Incomplete");
    expectChecklistStatus("State the founder goal or decision", "Complete");
  });

  it("keeps proof incomplete when the prompt has a buyer and goal but no evidence", () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: "Help me decide how restaurant owners should prioritize this workflow." },
    });

    expectChecklistStatus("Name the buyer or customer", "Complete");
    expectChecklistStatus("Include proof, evidence, or a metric", "Incomplete");
    expectChecklistStatus("State the founder goal or decision", "Complete");
  });

  it("marks evidence without a buyer when the prompt only includes proof and a goal", () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: "Help me decide based on 8 interviews and 22% churn." },
    });

    expectChecklistStatus("Name the buyer or customer", "Incomplete");
    expectChecklistStatus("Include proof, evidence, or a metric", "Complete");
    expectChecklistStatus("State the founder goal or decision", "Complete");
  });

  it("does not treat generic data or results language alone as proof", () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: "Help me decide if property managers need this workflow using more data and findings next quarter." },
    });

    expectChecklistStatus("Name the buyer or customer", "Complete");
    expectChecklistStatus("Include proof, evidence, or a metric", "Incomplete");
    expectChecklistStatus("State the founder goal or decision", "Complete");
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
    expect(screen.getByText("Prioritize the next 3 moves")).toBeInTheDocument();
    expect(screen.getByText("Next-step plan")).toBeInTheDocument();
    expect(screen.getByText(/Momentum improves when each next step closes a specific uncertainty/i)).toBeInTheDocument();
  });

  it("opens a login prompt modal when a visitor submits a hero prompt", () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: "Validate an AI workflow before I build it." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByRole("dialog", { name: /Sign in to open this inside your workspace/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    expect(screen.getByText("Prompt preview")).toBeInTheDocument();
    expect(screen.getAllByText(/Validate an AI workflow before I build it\./i)).toHaveLength(2);
    expect(window.sessionStorage.getItem("landingPromptDraft")).toBe("Validate an AI workflow before I build it.");
    expect(trackEvent).toHaveBeenCalledWith("cta_click", {
      page: "/",
      button: "hero_prompt_submit",
    });
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

  it("keeps Tab focus inside the login prompt modal and wraps on Shift+Tab", () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: "Validate an AI workflow before I build it." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    const promptInput = screen.getByLabelText("I want to");
    const closeButton = screen.getByRole("button", { name: "Close" });

    promptInput.focus();
    expect(promptInput).toHaveFocus();

    fireEvent.keyDown(window, { key: "Tab" });

    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });

    expect(screen.getByRole("link", { name: "Explore demo first" })).toHaveFocus();
  });

  it("restores focus to the submit trigger after the login prompt closes", () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: "Validate an AI workflow before I build it." },
    });

    const sendButton = screen.getByRole("button", { name: "Send" });
    sendButton.focus();
    expect(sendButton).toHaveFocus();

    fireEvent.click(sendButton);
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog", { name: /Sign in to open this inside your workspace/i })).not.toBeInTheDocument();
    expect(sendButton).toHaveFocus();
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
