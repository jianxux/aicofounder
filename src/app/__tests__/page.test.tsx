import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LandingPage from "@/app/page";
import { trackEvent } from "@/lib/analytics";

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

describe("LandingPage", () => {
  it("tracks the landing page view on mount", () => {
    render(<LandingPage />);

    expect(trackEvent).toHaveBeenCalledWith("page_view", {
      page: "/",
      source: "landing",
    });
  });

  it("renders the editorial hero, highlighted founder tagline, and static chat prompt", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { name: /Build the company people can/i })).toBeInTheDocument();
    expect(screen.getByText(/less founder theater, more founder certainty/i)).toBeInTheDocument();
    expect(screen.getByText(/Ask the hard founder question first/i)).toBeInTheDocument();
    expect(screen.getByText(/Describe the founder, the customer tension/i)).toBeInTheDocument();
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

  it("tracks all primary CTA clicks", () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole("link", { name: "Start building free" }));
    fireEvent.click(screen.getByRole("link", { name: "See the founder workflow" }));
    fireEvent.click(screen.getByRole("link", { name: "Get started free" }));

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
