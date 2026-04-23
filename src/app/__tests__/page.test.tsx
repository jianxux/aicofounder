import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  const homepageStarterDraft =
    "Review this homepage/URL: [https://example.com]. Tell me what the current positioning promises, where it sounds generic, and how I should rewrite the opening message for the real buyer.";

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
    expect(screen.getByRole("radiogroup", { name: /Choose your starting material/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Raw idea/i })).toBeChecked();
    expect(screen.getByText(/Prompt guidance for Raw idea/i)).toBeInTheDocument();
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

  it("updates starting-material guidance without overwriting typed input", () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByLabelText("I want to"), {
      target: { value: "Keep the founder draft exactly as written." },
    });
    fireEvent.click(screen.getByRole("radio", { name: /Customer notes/i }));

    expect(screen.getByRole("radio", { name: /Customer notes/i })).toBeChecked();
    expect(screen.getByDisplayValue("Keep the founder draft exactly as written.")).toBeInTheDocument();
    expect(screen.getByText(/Prompt guidance for Customer notes/i)).toBeInTheDocument();
    expect(screen.getByText(/Useful when interviews, call notes, or support transcripts already exist/i)).toBeInTheDocument();
    expect(screen.getByText(/Paste the strongest quotes or notes/i)).toBeInTheDocument();
    expect(screen.getByText(/Synthesize these customer notes into the main pain patterns/i)).toBeInTheDocument();
  });

  it("shows visible focus styling for the starting-material chooser and supports keyboard selection", async () => {
    const user = userEvent.setup();

    render(<LandingPage />);

    const rawIdeaRadio = screen.getByRole("radio", { name: /Raw idea/i });
    const homepageRadio = screen.getByRole("radio", { name: /Existing homepage \/ URL/i });

    for (let index = 0; index < 20 && document.activeElement !== rawIdeaRadio; index += 1) {
      await user.tab();
    }

    expect(rawIdeaRadio).toHaveFocus();
    expect(rawIdeaRadio).toBeChecked();

    const rawIdeaPill = rawIdeaRadio.closest("label")?.querySelector("span");

    expect(rawIdeaPill).not.toBeNull();
    expect(rawIdeaPill).toHaveClass(
      "peer-focus-visible:outline-none",
      "peer-focus-visible:ring-2",
      "peer-focus-visible:ring-stone-950",
      "peer-focus-visible:ring-offset-2",
      "peer-focus-visible:ring-offset-white",
    );

    await user.keyboard("{ArrowRight}");

    expect(homepageRadio).toHaveFocus();
    expect(homepageRadio).toBeChecked();
    expect(rawIdeaRadio).not.toBeChecked();
    expect(screen.getByText(/Prompt guidance for Existing homepage \/ URL/i)).toBeInTheDocument();
    expect(screen.getByText(/Paste the URL and call out which claim, audience, or section feels soft/i)).toBeInTheDocument();
  });

  it("appends the selected starter draft without replacing existing prompt text", () => {
    render(<LandingPage />);

    const promptTextarea = screen.getByLabelText("I want to") as HTMLTextAreaElement;

    fireEvent.change(promptTextarea, {
      target: { value: "My original founder prompt." },
    });
    fireEvent.click(screen.getByRole("radio", { name: /Existing homepage \/ URL/i }));
    fireEvent.click(screen.getByRole("button", { name: /Use starter draft/i }));

    expect(promptTextarea.value).toBe(`My original founder prompt.\n\n${homepageStarterDraft}`);
  });

  it("fills the prompt textarea with the starter draft when it is empty", () => {
    render(<LandingPage />);

    const promptTextarea = screen.getByLabelText("I want to") as HTMLTextAreaElement;

    fireEvent.click(screen.getByRole("radio", { name: /Existing homepage \/ URL/i }));
    fireEvent.click(screen.getByRole("button", { name: /Use starter draft/i }));

    expect(promptTextarea.value).toBe(homepageStarterDraft);
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
