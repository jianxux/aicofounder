import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OnboardingModal from "@/components/OnboardingModal";

function moveToIdeaStep() {
  fireEvent.click(screen.getByRole("button", { name: "Get Started" }));
}

function fillIntakeFields(overrides?: {
  primaryIdea?: string;
  url?: string;
  targetUser?: string;
  mainUncertainty?: string;
}) {
  const intake = {
    primaryIdea: "An AI copilot for founder research.",
    url: "https://example.com",
    targetUser: "Seed-stage founders",
    mainUncertainty: "Whether they want one workspace.",
    ...overrides,
  };

  fireEvent.change(screen.getByLabelText("What are you thinking about building?"), {
    target: { value: intake.primaryIdea },
  });
  fireEvent.change(screen.getByLabelText("Relevant URL (optional)"), {
    target: { value: intake.url },
  });
  fireEvent.change(screen.getByLabelText("Target user (optional)"), {
    target: { value: intake.targetUser },
  });
  fireEvent.change(screen.getByLabelText("Main uncertainty (optional)"), {
    target: { value: intake.mainUncertainty },
  });

  return intake;
}

describe("OnboardingModal", () => {
  const onComplete = vi.fn();
  const onSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders step 1 by default when open=true", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    const dialog = screen.getByRole("dialog");

    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAccessibleName("Welcome to AI Cofounder");
    expect(dialog).toHaveAccessibleDescription(
      "Turn a raw idea into a structured company-building plan. Your AI cofounder will help you clarify the problem, shape the roadmap, and move through each phase.",
    );
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

    moveToIdeaStep();

    expect(screen.getByRole("dialog")).toHaveAccessibleName("About Your Idea");
    expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
      "Start with one clear idea. Add a URL, target user, or the main uncertainty only if they help sharpen the brief.",
    );
    expect(screen.getByRole("heading", { name: "About Your Idea" })).toBeInTheDocument();
  });

  it("hides inactive step content from keyboard users after advancing", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();

    expect(screen.getByRole("heading", { name: "Welcome to AI Cofounder", hidden: true }).closest("section")).toHaveAttribute(
      "hidden",
    );
    expect(screen.queryByRole("button", { name: "Get Started" })).not.toBeInTheDocument();
  });

  it("step 2 has the primary idea prompt and optional fields", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();

    expect(screen.getByLabelText("What are you thinking about building?")).toBeInTheDocument();
    expect(screen.getByLabelText("Relevant URL (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Target user (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Main uncertainty (optional)")).toBeInTheDocument();
  });

  it("can type in the intake fields", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();
    fillIntakeFields();

    expect(screen.getByLabelText("What are you thinking about building?")).toHaveValue(
      "An AI copilot for founder research.",
    );
    expect(screen.getByLabelText("Relevant URL (optional)")).toHaveValue("https://example.com");
    expect(screen.getByLabelText("Target user (optional)")).toHaveValue("Seed-stage founders");
    expect(screen.getByLabelText("Main uncertainty (optional)")).toHaveValue(
      "Whether they want one workspace.",
    );
  });

  it("navigates from step 2 to step 3 with the intake summary shown", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();
    const intake = fillIntakeFields();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    const summary = screen.getByText("Intake Summary").closest("section");

    expect(screen.getByRole("dialog")).toHaveAccessibleName("Ready to Launch");
    expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
      "Here’s what you’re starting with. Once launched, your AI cofounder will guide you through the discovery, planning, build, and launch phases.",
    );
    expect(screen.getByRole("heading", { name: "Ready to Launch" })).toBeInTheDocument();
    expect(summary).toBeInTheDocument();
    expect(within(summary!).getByText(intake.primaryIdea)).toBeInTheDocument();
    expect(within(summary!).getByText(intake.url)).toBeInTheDocument();
    expect(within(summary!).getByText(intake.targetUser)).toBeInTheDocument();
    expect(within(summary!).getByText(intake.mainUncertainty)).toBeInTheDocument();
  });

  it("shows the attachments coming soon policy before launch without implying uploads are live", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();
    fillIntakeFields();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    const policySection = screen.getByText("Attachments Coming Soon").closest("section");

    expect(policySection).toBeInTheDocument();
    expect(
      within(policySection!).getByText(
        "File uploads are not available in first-run intake yet. These limits and privacy rules set expectations before launch.",
      ),
    ).toBeInTheDocument();
    expect(
      within(policySection!).getByText("Attachments are coming soon for first-run intake. Uploads are not enabled yet."),
    ).toBeInTheDocument();
    expect(within(policySection!).getByText("Plan for up to 3 files, 5 MB each, and 10 MB total.")).toBeInTheDocument();
    expect(
      within(policySection!).getByText(/Do not include secrets or sensitive data:/),
    ).toBeInTheDocument();
  });

  it("calls onComplete with the intake fields on Launch Project click", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();
    fillIntakeFields();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Launch Project" }));

    expect(onComplete).toHaveBeenCalledWith({
      primaryIdea: "An AI copilot for founder research.",
      url: "https://example.com",
      targetUser: "Seed-stage founders",
      mainUncertainty: "Whether they want one workspace.",
    });
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

    moveToIdeaStep();

    expect(screen.getByLabelText("Step 2 current")).toHaveClass("w-8");
  });

  it("cannot proceed from step 2 with an empty primary idea", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("back button works on steps 2 and 3", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Welcome to AI Cofounder" })).toBeInTheDocument();

    moveToIdeaStep();
    fillIntakeFields({ url: "", targetUser: "", mainUncertainty: "" });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("heading", { name: "About Your Idea" })).toBeInTheDocument();
  });

  it("shows not provided for optional summary fields when they are empty", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();
    fillIntakeFields({ url: "", targetUser: "", mainUncertainty: "" });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getAllByText("Not provided")).toHaveLength(3);
  });

  it("resets to the first step when reopened", () => {
    const { rerender } = render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();
    fillIntakeFields({ url: "", targetUser: "", mainUncertainty: "" });

    rerender(<OnboardingModal open={false} onComplete={onComplete} onSkip={onSkip} />);
    rerender(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    expect(screen.getByRole("heading", { name: "Welcome to AI Cofounder" })).toBeInTheDocument();
    expect(screen.queryByDisplayValue("An AI copilot for founder research.")).not.toBeInTheDocument();
  });

  it("prefills the intake and opens on the idea step when initialIntake is provided", () => {
    render(
      <OnboardingModal
        open
        onComplete={onComplete}
        onSkip={onSkip}
        initialIntake={{
          primaryIdea: "Carry this prompt into onboarding.",
          targetUser: "Founders",
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "About Your Idea" })).toBeInTheDocument();
    expect(screen.getByLabelText("What are you thinking about building?")).toHaveValue(
      "Carry this prompt into onboarding.",
    );
    expect(screen.getByLabelText("Target user (optional)")).toHaveValue("Founders");
  });
});
