import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BrandGlyph from "@/components/BrandGlyph";

describe("BrandGlyph", () => {
  it("renders as a decorative presentation icon by default", () => {
    const { container } = render(<BrandGlyph className="brand-glyph" width={64} height={64} />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("role", "presentation");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("width", "64");
    expect(svg).toHaveAttribute("height", "64");
    expect(svg).toHaveClass("brand-glyph");
  });

  it("renders an accessible title and background when requested", () => {
    const { container } = render(<BrandGlyph title="AI Cofounder" withBackground />);
    const svg = container.querySelector("svg");

    expect(screen.getByTitle("AI Cofounder")).toBeInTheDocument();
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute("aria-label", "AI Cofounder");
    expect(svg).not.toHaveAttribute("aria-hidden");
    expect(container.querySelectorAll("rect")).toHaveLength(2);
  });
});
