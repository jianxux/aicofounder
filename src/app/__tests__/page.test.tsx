import { fireEvent, render, screen } from "@testing-library/react";
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

vi.mock("@/components/AuthButton", () => ({
  default: ({
    label = "Continue with Google",
    onClick,
    analyticsButton,
    analyticsPage,
  }: {
    label?: string;
    onClick?: () => void;
    analyticsButton?: string;
    analyticsPage?: string;
  }) => (
    <button
      type="button"
      onClick={() => {
        if (analyticsButton) {
          void trackEvent("cta_click", {
            page: analyticsPage ?? window.location.pathname,
            button: analyticsButton,
          });
        }
        onClick?.();
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
    expect(screen.getByLabelText("I want to")).toBeInTheDocument();
    expect(screen.getByText(/Press Enter to continue/i)).toBeInTheDocument();
    expect(screen.getByText(/Need a stronger starting point\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Session outputs/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("renders grouped founder scenarios as prompt starting points", () => {
    render(<LandingPage />);

    expect(screen.getByRole("group", { name: /Need a stronger starting point\?/i })).toBeInTheDocument();
    expect(screen.getByText(/Pick a founder scenario to prefill the prompt, then tailor it to your market\./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Validate a niche/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Fix weak positioning/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Plan a launch story/i })).toBeInTheDocument();
    expect(screen.getByText(/Leave with an ICP read, buyer pains, and the sharpest wedge to test first\./i)).toBeInTheDocument();
    expect(screen.getByText(/Get a clearer homepage angle, stronger value prop, and the claims that need evidence\./i)).toBeInTheDocument();
    expect(screen.getByText(/Walk away with a launch narrative, proof points to gather, and early messaging to test\./i)).toBeInTheDocument();
  });

  it("prefills and focuses the textarea when a founder scenario is selected", () => {
    render(<LandingPage />);

    const textarea = screen.getByLabelText("I want to");
    const validateButton = screen.getByRole("button", { name: /Validate a niche/i });
    const positioningButton = screen.getByRole("button", { name: /Fix weak positioning/i });
    const launchButton = screen.getByRole("button", { name: /Plan a launch story/i });

    expect(validateButton).toHaveAttribute("aria-pressed", "false");
    expect(positioningButton).toHaveAttribute("aria-pressed", "false");
    expect(launchButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(positioningButton);

    expect(textarea).toHaveFocus();
    expect(textarea).toHaveValue(
      "Pressure-test the positioning for a finance ops tool that helps multi-location dental practices stop losing money to insurance underpayments.",
    );
    expect(positioningButton).toHaveAttribute("aria-pressed", "true");
    expect(validateButton).toHaveAttribute("aria-pressed", "false");
    expect(launchButton).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps the scenario selection flow working through submit and login-prompt handoff", () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole("button", { name: /Plan a launch story/i }));
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByRole("dialog", { name: /Sign in to open this inside your workspace/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Help me craft the go-to-market story for an AI copilot that turns customer support tickets into product feedback and weekly roadmap briefs\./i)).toHaveLength(2);
    expect(window.sessionStorage.getItem("landingPromptDraft")).toBe(
      "Help me craft the go-to-market story for an AI copilot that turns customer support tickets into product feedback and weekly roadmap briefs.",
    );
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

  it("renders prompt-first proof, workflow moments, and trust framing without testimonials", () => {
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
    ].forEach((value) => {
      expect(screen.getByText(value)).toBeInTheDocument();
    });

    expect(screen.queryByText("Filip Dite")).not.toBeInTheDocument();
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
