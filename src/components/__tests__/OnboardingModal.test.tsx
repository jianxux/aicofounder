import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OnboardingModal from "@/components/OnboardingModal";

describe("OnboardingModal", () => {
  const onComplete = vi.fn();
  const onSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders step 1 by default when open=true", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Welcome to AI Cofounder" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get Started" })).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    render(<OnboardingModal open={false} onComplete={onComplete} onSkip={onSkip} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Welcome to AI Cofounder" })).not.toBeInTheDocument();
  });

  it("navigates from step 1 to step 2 on Get Started click", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));

    expect(screen.getByRole("heading", { name: "About Your Idea" })).toBeInTheDocument();
  });

  it("step 2 has name input and description textarea", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));

    expect(screen.getByLabelText("Project name")).toBeInTheDocument();
    expect(screen.getByLabelText("What problem are you solving?")).toBeInTheDocument();
  });

  it("can type in name and description fields", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "Signal Engine" } });
    fireEvent.change(screen.getByLabelText("What problem are you solving?"), {
      target: { value: "Research is fragmented across tools." },
    });

    expect(screen.getByLabelText("Project name")).toHaveValue("Signal Engine");
    expect(screen.getByLabelText("What problem are you solving?")).toHaveValue(
      "Research is fragmented across tools.",
    );
  });

  it("navigates from step 2 to step 3 with entered data shown", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "Signal Engine" } });
    fireEvent.change(screen.getByLabelText("What problem are you solving?"), {
      target: { value: "Research is fragmented across tools." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("heading", { name: "Ready to Launch" })).toBeInTheDocument();
    expect(screen.getByText("Signal Engine")).toBeInTheDocument();
    expect(screen.getAllByText("Research is fragmented across tools.")).toHaveLength(2);
  });

  it("calls onComplete with name and description on Launch Project click", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "Signal Engine" } });
    fireEvent.change(screen.getByLabelText("What problem are you solving?"), {
      target: { value: "Research is fragmented across tools." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Launch Project" }));

    expect(onComplete).toHaveBeenCalledWith("Signal Engine", "Research is fragmented across tools.");
  });

  it("calls onSkip on skip link click", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("step indicator shows correct active step", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    expect(screen.getByLabelText("Step 1 current")).toHaveClass("w-8");
    expect(screen.getByLabelText("Step 2")).toHaveClass("w-2.5");
    expect(screen.getByLabelText("Step 3")).toHaveClass("w-2.5");

    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));

    expect(screen.getByLabelText("Step 2 current")).toHaveClass("w-8");
  });

  it("cannot proceed from step 2 with empty name", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("back button works on steps 2 and 3", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Welcome to AI Cofounder" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "Signal Engine" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("heading", { name: "About Your Idea" })).toBeInTheDocument();
  });

  it("shows a fallback summary when description is empty", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "Signal Engine" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      screen.getByText("You can refine the problem statement once you enter the workspace."),
    ).toBeInTheDocument();
  });

  it("resets to the first step when reopened", () => {
    const { rerender } = render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "Signal Engine" } });

    rerender(<OnboardingModal open={false} onComplete={onComplete} onSkip={onSkip} />);
    rerender(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    expect(screen.getByRole("heading", { name: "Welcome to AI Cofounder" })).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Signal Engine")).not.toBeInTheDocument();
  });
});
