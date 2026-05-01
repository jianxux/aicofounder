import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "@/app/loading";

describe("GlobalLoading", () => {
  it("renders an accessible app-level loading status with clear progress steps", () => {
    render(<Loading />);

    const status = screen.getByRole("status", { name: /preparing your ai cofounder workspace/i });
    expect(status).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /preparing your founder plan in minutes/i })).toBeInTheDocument();

    const progressList = within(status).getByRole("list", { name: /loading progress steps/i });
    const steps = within(progressList).getAllByRole("listitem");
    expect(steps.length).toBeGreaterThanOrEqual(3);

    expect(within(progressList).getByText(/scored strategy brief with clear feedback/i)).toBeInTheDocument();
    expect(within(progressList).getByText(/manual research tasks into a context-aware ai workflow/i)).toBeInTheDocument();
    expect(within(progressList).getByText(/actionable next-step guidance with customer proof/i)).toBeInTheDocument();
  });
});
