import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LandingPage from "@/app/page";
import { LANDING_PROMPT_DRAFT_KEY } from "@/app/prompt-handoff";
import { trackEvent } from "@/lib/analytics";
import { isSupabaseConfigured } from "@/lib/supabase";

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

vi.mock("@/components/AuthButton", () => ({
  default: ({
    redirectTo,
    analyticsButton,
    analyticsPage,
    label = "Continue with Google",
    className,
  }: {
    redirectTo?: string;
    analyticsButton?: string;
    analyticsPage?: string;
    label?: string;
    className?: string;
  }) => (
    <button
      type="button"
      className={className}
      data-redirect-to={redirectTo}
      onClick={() => {
        if (analyticsButton && analyticsPage) {
          void trackEvent("cta_click", {
            page: analyticsPage,
            button: analyticsButton,
          });
        }
      }}
    >
      {label}
    </button>
  ),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isSupabaseConfigured).mockReturnValue(true);
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

    const focusPresetGroup = screen.getByRole("group", { name: /Choose your first focus/i });
    const founderSituationGroup = screen.getByRole("radiogroup", { name: /Choose the founder situation that feels closest/i });

    expect(screen.getByRole("heading", { name: /Make something people/i })).toBeInTheDocument();
    expect(screen.getByText(/Start with the founder question you cannot shake/i)).toBeInTheDocument();
    expect(focusPresetGroup).toBeInTheDocument();
    expect(within(focusPresetGroup).getByRole("radio", { name: /Demand validation/i })).toBeChecked();
    expect(screen.getByText(/Check if the demand is real before you commit\./i)).toBeInTheDocument();
    expect(screen.getByLabelText("I want to")).toBeInTheDocument();
    expect(screen.getByText(/Use this when you need clearer evidence that the problem is painful/i)).toBeInTheDocument();
    const situationButtons = within(founderSituationGroup).getAllByRole("radio");

    expect(situationButtons).toHaveLength(3);
    expect(situationButtons[0]).not.toBeChecked();
    expect(screen.getByText(/You have founder calls, but no clear pattern yet\./i)).toBeInTheDocument();
    expect(screen.getByText(/Early interview notes are piling up/i)).toBeInTheDocument();
    expect(screen.getByText(/You built a draft, but the homepage still reads generic\./i)).toBeInTheDocument();
    expect(screen.getByText(/You have research scattered across docs and need the next move\./i)).toBeInTheDocument();
    expect(screen.getByText(/Press Enter to continue/i)).toBeInTheDocument();
    expect(screen.getByText(/Session outputs/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("updates hero guidance when a different focus preset is selected without overwriting typed input", () => {
    render(<LandingPage />);
    const focusPresetGroup = screen.getByRole("group", { name: /Choose your first focus/i });

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: "Keep my draft intact." },
    });
    fireEvent.click(within(focusPresetGroup).getByRole("radio", { name: /Next-step planning/i }));

    expect(within(focusPresetGroup).getByRole("radio", { name: /Next-step planning/i })).toBeChecked();
    expect(within(focusPresetGroup).getByRole("radio", { name: /Demand validation/i })).not.toBeChecked();
    expect(screen.getByDisplayValue("Keep my draft intact.")).toBeInTheDocument();
    expect(screen.getByText(/Use this when you have signal scattered across notes/i)).toBeInTheDocument();
    expect(screen.getByText("Prioritize the next 3 moves")).toBeInTheDocument();
    expect(screen.getByText("Next-step plan")).toBeInTheDocument();
    expect(screen.getByText(/Momentum improves when each next step closes a specific uncertainty/i)).toBeInTheDocument();
  });

  it("replaces starter prompt text and clears founder situation selection when the focus preset changes", () => {
    render(<LandingPage />);

    const focusPresetGroup = screen.getByRole("group", { name: /Choose your first focus/i });
    const founderSituationGroup = screen.getByRole("radiogroup", { name: /Choose the founder situation that feels closest/i });
    const situationButtons = within(founderSituationGroup).getAllByRole("radio");

    fireEvent.click(situationButtons[1]);
    expect(situationButtons[1]).toBeChecked();

    fireEvent.click(within(focusPresetGroup).getByRole("radio", { name: /Next-step planning/i }));

    expect(within(focusPresetGroup).getByRole("radio", { name: /Next-step planning/i })).toBeChecked();
    expect(screen.getByDisplayValue("Turn these scattered validation notes into the next three moves I should make this week.")).toBeInTheDocument();
    expect(situationButtons[0]).not.toBeChecked();
    expect(situationButtons[1]).not.toBeChecked();
    expect(situationButtons[2]).not.toBeChecked();
  });

  it("syncs the hero prompt and preset when a founder situation card is clicked", () => {
    render(<LandingPage />);

    const focusPresetGroup = screen.getByRole("group", { name: /Choose your first focus/i });
    const founderSituationGroup = screen.getByRole("radiogroup", { name: /Choose the founder situation that feels closest/i });
    const situationButtons = within(founderSituationGroup).getAllByRole("radio");
    const demandValidationCard = situationButtons[0];
    const positioningCard = situationButtons[1];

    fireEvent.click(positioningCard);

    expect(within(focusPresetGroup).getByRole("radio", { name: /Positioning/i })).toBeChecked();
    expect(positioningCard).toBeChecked();
    expect(demandValidationCard).not.toBeChecked();
    expect(
      screen.getByDisplayValue(
        "Tighten this homepage draft into a specific positioning angle with sharper buyer language and fewer generic claims.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Use this when the product feels plausible but the homepage promise still reads soft or interchangeable\./i)).toBeInTheDocument();
  });

  it("opens a login prompt modal from the founder situation flow and stores the shared prompt handoff draft", () => {
    render(<LandingPage />);

    const focusPresetGroup = screen.getByRole("group", { name: /Choose your first focus/i });
    const founderSituationGroup = screen.getByRole("radiogroup", { name: /Choose the founder situation that feels closest/i });
    const nextMoveCard = within(founderSituationGroup).getAllByRole("radio")[2];

    fireEvent.click(nextMoveCard);
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    const dialog = screen.getByRole("dialog", { name: /Sign in to open this inside your workspace/i });

    expect(within(focusPresetGroup).getByRole("radio", { name: /Next-step planning/i })).toBeChecked();
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Prompt preview")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        /Turn these scattered research notes into the next three founder moves, the learning goal for each, and what to test first\./i,
      ),
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem(LANDING_PROMPT_DRAFT_KEY)).toBe(
      "Turn these scattered research notes into the next three founder moves, the learning goal for each, and what to test first.",
    );
    expect(trackEvent).toHaveBeenCalledWith("cta_click", {
      page: "/",
      button: "hero_prompt_submit",
    });
  });

  it("focuses the close button, traps keyboard focus in the modal, closes on Escape, and restores focus", () => {
    render(<LandingPage />);

    const promptInput = screen.getByLabelText("I want to");

    fireEvent.change(promptInput, {
      target: { value: "Validate an AI workflow before I build it." },
    });
    promptInput.focus();
    expect(promptInput).toHaveFocus();
    fireEvent.keyDown(promptInput, { key: "Enter" });

    const dialog = screen.getByRole("dialog", { name: /Sign in to open this inside your workspace/i });
    const closeButton = within(dialog).getByRole("button", { name: "Close" });
    const dashboardLink = within(dialog).getByRole("link", { name: "Continue to dashboard" });

    expect(closeButton).toHaveFocus();

    dashboardLink.focus();
    expect(dashboardLink).toHaveFocus();
    fireEvent.keyDown(dashboardLink, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(closeButton, { key: "Tab", shiftKey: true });
    expect(dashboardLink).toHaveFocus();

    fireEvent.keyDown(dashboardLink, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: /Sign in to open this inside your workspace/i })).not.toBeInTheDocument();
    expect(promptInput).toHaveFocus();
  });

  it("renders the modal secondary CTA with dashboard copy and destination", () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: "Validate an AI workflow before I build it." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    const dashboardLink = within(screen.getByRole("dialog", { name: /Sign in to open this inside your workspace/i })).getByRole("link", {
      name: "Continue to dashboard",
    });

    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
  });

  it("does not submit the hero prompt on bare Enter while IME composition is active", () => {
    render(<LandingPage />);

    const promptInput = screen.getByLabelText("I want to");

    fireEvent.change(promptInput, {
      target: { value: "Refine this positioning draft." },
    });
    fireEvent.keyDown(promptInput, {
      key: "Enter",
      isComposing: true,
    });

    expect(screen.queryByRole("dialog", { name: /Sign in to open this inside your workspace/i })).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(LANDING_PROMPT_DRAFT_KEY)).toBeNull();
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

  it("tracks all primary CTA clicks", () => {
    render(<LandingPage />);
    const authButtons = screen.getAllByRole("button", { name: "Continue with Google" });
    const workflowLink = screen.getByRole("link", { name: "See the founder workflow" });

    fireEvent.click(authButtons[0]);
    fireEvent.click(workflowLink);
    fireEvent.click(authButtons[1]);

    expect(workflowLink).toHaveAttribute("href", "#workflow");

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
