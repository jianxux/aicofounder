import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import ErrorPage from "@/app/error";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("App error boundary page", () => {
  it("renders founder recovery copy, cues, and dashboard action", () => {
    render(
      <ErrorPage
        error={Object.assign(new Error("Research fetch timeout"), { digest: "ai-42" })}
        reset={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: /Let's get your founder workspace back on track/i })).toBeInTheDocument();
    expect(screen.getByText(/Something interrupted this step\./i)).toBeInTheDocument();
    expect(screen.getByText(/Preserve context and retry safely/i)).toBeInTheDocument();
    expect(screen.getByText(/Return to your dashboard workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/Resume with evidence by confirming the next action/i)).toBeInTheDocument();

    const dashboardLink = screen.getByRole("link", { name: /Return to dashboard/i });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
  });

  it("renders safe details with digest reference and never shows raw message or stack", () => {
    const error = Object.assign(new Error("Model gateway unavailable"), {
      digest: "trace-abc-123",
      stack: "Error: Model gateway unavailable\n at fake:1:1",
    });

    render(<ErrorPage error={error} reset={vi.fn()} />);

    expect(
      screen.getByText(/A safe diagnostic reference is available for support and incident triage\./i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Reference: trace-abc-123/i)).toBeInTheDocument();
    expect(screen.queryByText(/Model gateway unavailable/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/at fake:1:1/i)).not.toBeInTheDocument();
  });

  it("hides the details panel when digest is not available", () => {
    const error = Object.assign(new Error("Database temporarily unavailable"), {
      stack: "Error: Database temporarily unavailable\n at fake:2:2",
    });

    render(<ErrorPage error={error} reset={vi.fn()} />);

    expect(screen.queryByText(/Error details/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Reference:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Database temporarily unavailable/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/at fake:2:2/i)).not.toBeInTheDocument();
  });

  it("calls reset when retry is clicked", () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error("Temporary outage")} reset={reset} />);

    fireEvent.click(screen.getByRole("button", { name: /Retry safely/i }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
