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
    expect(screen.getByText("Prioritize the next 3 moves")).toBeInTheDocument();
    expect(screen.getByText("Next-step plan")).toBeInTheDocument();
    expect(screen.getByText(/Momentum improves when each next step closes a specific uncertainty/i)).toBeInTheDocument();
  });

  it("opens a login prompt modal with a structured preset-aware handoff when a visitor submits a hero prompt", () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole("radio", { name: /Positioning/i }));
    fireEvent.change(screen.getByLabelText("I want to"), {
      target: {
        value:
          "Tighten the positioning for an AI research copilot for seed-stage founders before I rewrite the homepage.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    const dialog = screen.getByRole("dialog", { name: /Sign in to open this inside your workspace/i });

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Handoff preview")).toBeInTheDocument();
    expect(within(dialog).getByText("Focus")).toBeInTheDocument();
    expect(within(dialog).getByText("Positioning")).toBeInTheDocument();
    expect(within(dialog).getByText("Target user")).toBeInTheDocument();
    expect(within(dialog).getByText("seed-stage founders")).toBeInTheDocument();
    expect(within(dialog).getByText("Main uncertainty")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "Whether the positioning claim is specific and credible enough that the right buyer repeats it.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("First outputs")).toBeInTheDocument();
    expect(within(dialog).getByText("Positioning report")).toBeInTheDocument();
    expect(within(dialog).getByText("Market research memo")).toBeInTheDocument();
    expect(within(dialog).getByText("Homepage angle to test")).toBeInTheDocument();
    expect(window.sessionStorage.getItem("landingPromptDraft")).toBe(
      [
        "Primary idea: Tighten the positioning for an AI research copilot for seed-stage founders before I rewrite the homepage.",
        "Focus: Positioning",
        "Target user: seed-stage founders",
        "Main uncertainty: Whether the positioning claim is specific and credible enough that the right buyer repeats it.",
        "First outputs: Positioning report; Market research memo; Homepage angle to test",
      ].join("\n"),
    );
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
