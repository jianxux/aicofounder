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
});

describe("LandingPage", () => {
  it("tracks the landing page view on mount", () => {
    render(<LandingPage />);

    expect(trackEvent).toHaveBeenCalledWith("page_view", {
      page: "/",
      source: "landing",
    });
  });

  it("renders a calmer hero with an interactive-looking founder prompt workspace", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { name: /Find the clearest angle for/i })).toBeInTheDocument();
    expect(screen.getByText(/Start with the question you cannot shake/i)).toBeInTheDocument();
    expect(screen.getByText(/Pressure-test the ICP/i)).toBeInTheDocument();
    expect(screen.getByText(/Session outputs/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("renders proof metrics, workflow moments, and curated founder voices", () => {
    render(<LandingPage />);

    [
      "12k+",
      "500+",
      "18 hrs",
      "Interrogate the idea",
      "Pull signal into focus",
      "Leave with launch-ready clarity",
      "Pre-seed founder",
      "Second-time operator",
      "Founder after repositioning",
    ].forEach((value) => {
      expect(screen.getByText(value)).toBeInTheDocument();
    });
  });

  it("renders a founder FAQ section with four concise pre-sign-in questions", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        name: /Founder questions, answered before you sign in/i,
      }),
    ).toBeInTheDocument();

    [
      {
        question: /What do I get from the first session\?/i,
        answer: /A first pass at the story: a sharper positioning angle, concrete claims worth testing, and a short list of next questions or homepage moves to act on immediately\./i,
      },
      {
        question: /Do I need a polished brief before I start\?/i,
        answer: /No\. You can begin with rough notes, call transcripts, a messy draft, or one stubborn question\./i,
      },
      {
        question: /What happens after I sign in\?/i,
        answer: /You land in the workspace, answer a few onboarding prompts about your product and stage, then paste notes or upload material so the first session can produce founder-ready outputs quickly\./i,
      },
      {
        question: /Are my uploaded notes private\?/i,
        answer: /Your notes stay inside your workspace and are used to generate your tailored results\./i,
      },
    ].forEach(({ question, answer }) => {
      expect(screen.getByText(question)).toBeInTheDocument();
      expect(screen.getByText(answer)).toBeInTheDocument();
    });
  });

  it("tracks all primary CTA clicks", async () => {
    render(<LandingPage />);

    const authButtons = await screen.findAllByRole("button", { name: "Continue with Google" });

    fireEvent.click(authButtons[0]);
    const workflowLink = screen.getByRole("link", { name: "See the founder workflow" });

    expect(workflowLink).toHaveAttribute("href", "#workflow");

    fireEvent.click(workflowLink);
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
