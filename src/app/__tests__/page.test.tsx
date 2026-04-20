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

  it("opens a login prompt modal with a structured founder handoff preview from the combined draft", () => {
    render(<LandingPage />);

    const combinedDraft = [
      "Validate an AI workflow before I build it.",
      "",
      "Existing URL or homepage: https://example.com",
      "Who the customer is: Seed-stage founders",
      "Biggest uncertainty: Whether they trust the first output.",
    ].join("\n");

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: combinedDraft },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    const dialog = screen.getByRole("dialog", { name: /Sign in to open this inside your workspace/i });

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Prompt preview")).toBeInTheDocument();
    expect(within(dialog).getByText("Founder question")).toBeInTheDocument();
    expect(within(dialog).getByText("Existing URL")).toBeInTheDocument();
    expect(within(dialog).getByText("Customer")).toBeInTheDocument();
    expect(within(dialog).getByText("Biggest uncertainty")).toBeInTheDocument();
    expect(within(dialog).getByText("Validate an AI workflow before I build it.")).toBeInTheDocument();
    expect(within(dialog).getByText("https://example.com")).toBeInTheDocument();
    expect(within(dialog).getByText("Seed-stage founders")).toBeInTheDocument();
    expect(within(dialog).getByText("Whether they trust the first output.")).toBeInTheDocument();
    expect(window.sessionStorage.getItem("landingPromptDraft")).toBe(combinedDraft);
    expect(trackEvent).toHaveBeenCalledWith("cta_click", {
      page: "/",
      button: "hero_prompt_submit",
    });
  });

  it("omits empty optional preview rows when the combined draft only contains the founder question", () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: "Validate an AI workflow before I build it." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    const dialog = screen.getByRole("dialog", { name: /Sign in to open this inside your workspace/i });

    expect(within(dialog).getByText("Founder question")).toBeInTheDocument();
    expect(within(dialog).getByText("Validate an AI workflow before I build it.")).toBeInTheDocument();
    expect(within(dialog).queryByText("Existing URL")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Customer")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Biggest uncertainty")).not.toBeInTheDocument();
  });

  it("uses the placeholder founder question when the draft only contains recognized supporting rows", () => {
    render(<LandingPage />);

    const labeledOnlyDraft = [
      "Existing URL or homepage: https://example.com",
      "Who the customer is: Seed-stage founders",
      "Biggest uncertainty: Whether they trust the first output.",
    ].join("\n");

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: labeledOnlyDraft },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    const dialog = screen.getByRole("dialog", { name: /Sign in to open this inside your workspace/i });

    expect(within(dialog).getByText("Start with an idea, problem, or question.")).toBeInTheDocument();
    expect(within(dialog).queryByText(labeledOnlyDraft)).not.toBeInTheDocument();
    expect(within(dialog).getByText("Existing URL")).toBeInTheDocument();
    expect(within(dialog).getByText("Customer")).toBeInTheDocument();
    expect(within(dialog).getByText("Biggest uncertainty")).toBeInTheDocument();
  });

  it("uses the placeholder founder question when recognized labeled rows have empty values only", () => {
    render(<LandingPage />);

    const emptyLabeledDraft = [
      "Existing URL or homepage:",
      "Who the customer is:",
      "Biggest uncertainty:",
    ].join("\n");

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: emptyLabeledDraft },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    const dialog = screen.getByRole("dialog", { name: /Sign in to open this inside your workspace/i });

    expect(within(dialog).getByText("Start with an idea, problem, or question.")).toBeInTheDocument();
    expect(within(dialog).queryByText(emptyLabeledDraft)).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Existing URL")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Customer")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Biggest uncertainty")).not.toBeInTheDocument();
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
