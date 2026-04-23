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

    const textarea = screen.getByLabelText("I want to");

    expect(screen.getByRole("heading", { name: /Make something people/i })).toBeInTheDocument();
    expect(screen.getByText(/Start with the founder question you cannot shake/i)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Choose your first focus/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Demand validation/i })).toBeChecked();
    expect(screen.getByText(/Check if the demand is real before you commit\./i)).toBeInTheDocument();
    expect(textarea).toBeInTheDocument();
    expect(screen.getByText(/Use this when you need clearer evidence that the problem is painful/i)).toBeInTheDocument();
    expect(screen.getByText(/Press Enter to continue\. Press Shift\+Enter for a new line/i)).toBeInTheDocument();
    expect(textarea).toHaveAccessibleDescription(/Press Enter to continue\. Press Shift\+Enter for a new line/i);
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

  it("renders preset-specific prompt ingredients beneath the hero textarea", () => {
    render(<LandingPage />);

    const ingredientsSection = screen.getByRole("region", { name: /Prompt ingredients/i });

    const ingredientButtons = within(ingredientsSection).getAllByRole("button");

    expect(ingredientButtons).toHaveLength(3);
    expect(within(ingredientsSection).getByText("Buyer")).toBeInTheDocument();
    expect(within(ingredientsSection).getByText("Current workaround")).toBeInTheDocument();
    expect(within(ingredientsSection).getAllByText(/why it matters/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("radio", { name: /Positioning/i }));

    expect(screen.getByRole("radio", { name: /Positioning/i })).toBeChecked();
    expect(within(screen.getByRole("region", { name: /Prompt ingredients/i })).getByText("Differentiator")).toBeInTheDocument();
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

  it("does not submit the hero prompt on Shift+Enter", () => {
    render(<LandingPage />);

    const textarea = screen.getByLabelText("I want to");

    fireEvent.change(textarea, {
      target: { value: "Validate an AI workflow before I build it." },
    });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(screen.queryByRole("dialog", { name: /Sign in to open this inside your workspace/i })).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem("landingPromptDraft")).toBeNull();
    expect(trackEvent).not.toHaveBeenCalledWith("cta_click", {
      page: "/",
      button: "hero_prompt_submit",
    });
  });

  it("appends prompt ingredient starter lines into the hero textarea and persists the enriched draft", () => {
    render(<LandingPage />);

    const textarea = screen.getByLabelText("I want to") as HTMLTextAreaElement;
    const ingredientsSection = screen.getByRole("region", { name: /Prompt ingredients/i });

    fireEvent.change(textarea, {
      target: { value: "Validate an AI workflow before I build it." },
    });
    fireEvent.click(within(ingredientsSection).getByRole("button", { name: "Add Buyer" }));
    fireEvent.click(within(ingredientsSection).getByRole("button", { name: "Add Current workaround" }));
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    const enrichedPrompt = textarea.value;

    expect(enrichedPrompt).toContain("Validate an AI workflow before I build it.");
    expect(enrichedPrompt).toContain("Buyer:");
    expect(enrichedPrompt).toContain("Current workaround:");
    const dialog = screen.getByRole("dialog", { name: /Sign in to open this inside your workspace/i });

    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Prompt preview")).toBeInTheDocument();
    expect(
      within(dialog).getByText((_, element) => element?.textContent === enrichedPrompt),
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem("landingPromptDraft")).toBe(enrichedPrompt);
  });

  it("does not duplicate starter lines when the same ingredient is clicked repeatedly", () => {
    render(<LandingPage />);

    const textarea = screen.getByLabelText("I want to") as HTMLTextAreaElement;
    const ingredientsSection = screen.getByRole("region", { name: /Prompt ingredients/i });

    fireEvent.change(textarea, {
      target: { value: "Validate an AI workflow before I build it." },
    });
    fireEvent.click(within(ingredientsSection).getByRole("button", { name: "Add Buyer" }));
    fireEvent.click(within(ingredientsSection).getByRole("button", { name: "Add Buyer" }));

    expect(textarea.value).toContain("Validate an AI workflow before I build it.");
    expect((textarea.value.match(/Buyer:/g) ?? [])).toHaveLength(1);
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

  it("moves focus into the login prompt modal and restores it on close", () => {
    render(<LandingPage />);

    const textarea = screen.getByLabelText("I want to");

    textarea.focus();
    fireEvent.change(textarea, {
      target: { value: "Validate an AI workflow before I build it." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    const closeButton = screen.getByRole("button", { name: "Close" });

    expect(closeButton).toHaveFocus();

    fireEvent.click(closeButton);

    expect(textarea).toHaveFocus();
  });

  it("keeps Tab focus trapped inside the login prompt modal", () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: "Validate an AI workflow before I build it." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    const dialog = screen.getByRole("dialog", { name: /Sign in to open this inside your workspace/i });
    const closeButton = within(dialog).getByRole("button", { name: "Close" });
    const exploreLink = within(dialog).getByRole("link", { name: "Explore demo first" });

    exploreLink.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });

    expect(closeButton).toHaveFocus();

    closeButton.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });

    expect(exploreLink).toHaveFocus();
    expect(exploreLink).toHaveAttribute("href", "#sample-artifact");
  });

  it("adds keyboard focus-visible styling to the preset radio cards", () => {
    render(<LandingPage />);

    const demandValidationRadio = screen.getByRole("radio", { name: /Demand validation/i });
    const demandValidationCard = demandValidationRadio.nextElementSibling;

    expect(demandValidationRadio).toHaveClass("peer");
    expect(demandValidationCard).toHaveClass("peer-focus-visible:outline");
    expect(demandValidationCard).toHaveClass("peer-focus-visible:outline-2");
    expect(demandValidationCard).toHaveClass("peer-focus-visible:outline-offset-2");
    expect(demandValidationCard).toHaveClass("peer-focus-visible:outline-stone-950");
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
    expect(document.getElementById("sample-artifact")).toBeInTheDocument();
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
