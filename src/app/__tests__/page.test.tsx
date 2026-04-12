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

  it("renders proof metrics, workflow moments, and the first-session timeline", () => {
    render(<LandingPage />);

    [
      "12k+",
      "500+",
      "18 hrs",
      "Interrogate the idea",
      "Pull signal into focus",
      "Leave with launch-ready clarity",
      "First session timeline",
      "0-5 min",
      "6-14 min",
      "15-25 min",
      "Homepage headline direction, ICP notes, and the next 3 validation tasks.",
    ].forEach((value) => {
      expect(screen.getByText(value)).toBeInTheDocument();
    });
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
