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

  it("renders the hero heading", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { name: /Make something people/i })).toBeInTheDocument();
  });

  it("renders all 6 feature cards", () => {
    render(<LandingPage />);

    const featureTitles = [
      "Deep research",
      "Visual canvas",
      "Intelligent and critical",
      "Secure & private",
      "Structured phases",
      "For every founder",
    ];

    expect(featureTitles).toHaveLength(6);
    featureTitles.forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });

  it("renders the how it works steps", () => {
    render(<LandingPage />);

    const stepTitles = ["Describe your idea", "Research & validate", "Build & launch"];

    expect(screen.getByText("How it works")).toBeInTheDocument();
    expect(stepTitles).toHaveLength(3);
    stepTitles.forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });

  it("renders the 3 testimonials", () => {
    render(<LandingPage />);

    const testimonialNames = ["Maya Chen", "Jordan Alvarez", "Priya Patel"];

    expect(testimonialNames).toHaveLength(3);
    testimonialNames.forEach((name) => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it("tracks all primary CTA clicks", () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole("link", { name: "Get started free →" }));
    fireEvent.click(screen.getByRole("link", { name: "See the workspace" }));
    fireEvent.click(screen.getAllByRole("link", { name: /Get started free/ })[1]!);

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
