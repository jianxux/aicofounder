import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LandingPage from "@/app/page";

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
});
