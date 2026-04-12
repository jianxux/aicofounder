import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Navbar from "@/components/Navbar";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/AuthButton", () => ({
  default: (props: { redirectTo?: string; label?: string }) => (
    <button type="button" data-testid="auth-button" data-redirect-to={props.redirectTo}>
      {props.label ?? "Sign up"}
    </button>
  ),
}));

describe("Navbar", () => {
  it("renders landing navigation links as in-page anchors", () => {
    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Workflow" })).toHaveAttribute("href", "#workflow");
    expect(screen.getByRole("link", { name: "Capabilities" })).toHaveAttribute("href", "#capabilities");
    expect(screen.getByRole("link", { name: "Trust" })).toHaveAttribute("href", "#trust");
  });

  it("keeps auth destinations on existing routes", () => {
    render(<Navbar redirectTo="/dashboard" />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/signin");
    expect(screen.getByTestId("auth-button")).toHaveAttribute("data-redirect-to", "/dashboard");
  });
});
