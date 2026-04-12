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

  it("renders the premium hero heading and supporting copy", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { name: /Build the startup story/i })).toBeInTheDocument();
    expect(screen.getByText(/Premium AI product strategy for founders/i)).toBeInTheDocument();
    expect(screen.getByText(/validate demand, sharpen positioning/i)).toBeInTheDocument();
  });

  it("renders trust metrics and conversion proof sections", () => {
    render(<LandingPage />);

    ["12k+", "500+", "18 hrs", "Sharper positioning", "Less founder drift", "More credible launches"].forEach((value) => {
      expect(screen.getByText(value)).toBeInTheDocument();
    });
  });

  it("renders the workflow steps and founder testimonials", () => {
    render(<LandingPage />);

    ["Frame the opportunity", "Pressure-test with evidence", "Ship with a coherent plan"].forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });

    ["Maya Chen", "Jordan Alvarez", "Priya Patel"].forEach((name) => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it("tracks all primary CTA clicks", () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole("link", { name: "Start building free" }));
    fireEvent.click(screen.getByRole("link", { name: "Explore the workspace" }));
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
