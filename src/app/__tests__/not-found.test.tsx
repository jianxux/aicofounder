import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import NotFound from "@/app/not-found";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("NotFound", () => {
  it("renders a clear not found heading with reassurance", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByText(/Your work is still safe\./i)).toBeInTheDocument();
  });

  it("renders home and dashboard recovery links", () => {
    render(<NotFound />);

    expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Open dashboard" })).toHaveAttribute("href", "/dashboard");
  });

  it("renders exactly three founder recovery actions in a semantic list", () => {
    render(<NotFound />);

    const heading = screen.getByRole("heading", { level: 2, name: "What you can do next" });
    const section = heading.closest("section");

    expect(section).not.toBeNull();

    const list = within(section as HTMLElement).getByRole("list");
    const items = within(list).getAllByRole("listitem");

    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(/Restart your founder brief/i);
    expect(items[1]).toHaveTextContent(/Open your dashboard/i);
    expect(items[2]).toHaveTextContent(/Continue validation research/i);
  });
});
