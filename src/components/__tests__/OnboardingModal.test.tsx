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

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Welcome to AI Cofounder" })).toBeInTheDocument();
    expect(screen.getByText("First Session Preview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get Started" })).toBeInTheDocument();
  });

  it("moves focus into the dialog when opened", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    expect(screen.getByRole("heading", { name: "Welcome to AI Cofounder" })).toHaveFocus();
  });

  it("shows concrete first-session deliverables before the user starts", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    const preview = screen.getByLabelText("First session deliverables");

    expect(within(preview).getByText("First Session Preview")).toBeInTheDocument();
    expect(within(preview).getByText(/sharper brief/i)).toBeInTheDocument();
    expect(within(preview).getByText(/problem statement/i)).toBeInTheDocument();
    expect(within(preview).getByText(/target user/i)).toBeInTheDocument();
    expect(within(preview).getByText(/next-step plan/i)).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    render(<OnboardingModal open={false} onComplete={onComplete} onSkip={onSkip} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Welcome to AI Cofounder" })).not.toBeInTheDocument();
  });

  it("navigates from step 1 to step 2 on Get Started click", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();

    expect(screen.getByRole("dialog", { name: "About Your Idea" })).toBeInTheDocument();
  });

  it("moves focus into the active step after navigation", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();
    expect(screen.getByLabelText("What are you thinking about building?")).toHaveFocus();

    fillIntakeFields({ url: "", targetUser: "", mainUncertainty: "" });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Ready to Launch" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("What are you thinking about building?")).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Welcome to AI Cofounder" })).toHaveFocus();
  });

  it("keeps inactive steps out of the accessible tree and updates dialog labeling per step", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    const initialDialog = screen.getByRole("dialog", { name: "Welcome to AI Cofounder" });
    const initialDescription = document.getElementById(initialDialog.getAttribute("aria-describedby") ?? "");

    expect(initialDescription).toHaveTextContent("Start with a focused first session");

    moveToIdeaStep();

    const ideaDialog = screen.getByRole("dialog", { name: "About Your Idea" });
    const ideaDescription = document.getElementById(ideaDialog.getAttribute("aria-describedby") ?? "");
    const stepOneSection = screen.getByText("Welcome to AI Cofounder").closest("section");

    expect(ideaDescription).toHaveTextContent("Start with one clear idea.");
    expect(screen.queryByRole("button", { name: "Get Started" })).not.toBeInTheDocument();
    expect(stepOneSection).toHaveAttribute("hidden");

    fillIntakeFields({ url: "", targetUser: "", mainUncertainty: "" });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    const launchDialog = screen.getByRole("dialog", { name: "Ready to Launch" });
    const launchDescription = document.getElementById(launchDialog.getAttribute("aria-describedby") ?? "");
    const stepTwoSection = screen.getByText("About Your Idea").closest("section");

    expect(launchDescription).toHaveTextContent("Here’s what you’re starting with.");
    expect(stepTwoSection).toHaveAttribute("hidden");
  });

  it("step 2 has the primary idea prompt and optional fields", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();

    expect(screen.getByRole("region", { name: "Starter briefs" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Intake quality guide" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Customer research copilot/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ops assistant for clinics/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retail demand planner/i })).toBeInTheDocument();
    expect(screen.getByLabelText("What are you thinking about building?")).toBeInTheDocument();
    expect(screen.getByLabelText("Relevant URL (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Target user (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Main uncertainty (optional)")).toBeInTheDocument();
  });

  it("shows the intake quality guide with missing signals by default", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();

    const guide = screen.getByRole("region", { name: "Intake quality guide" });
    const status = within(guide).getByRole("status");

    expect(status).toHaveTextContent("Rough completeness signal: 0 of 4 signals present.");
    expect(status).toHaveTextContent("Early signal only.");
    expect(
      within(guide).getByText("More than a few words helps. Aim for at least 6 words."),
    ).toBeInTheDocument();
    expect(
      within(guide).getByText("Optional but helpful for a product, market, or workflow reference."),
    ).toBeInTheDocument();
    expect(within(guide).getByText("Concrete idea or workflow", { exact: false })).toHaveTextContent(
      "Concrete idea or workflow: missing",
    );
  });

  it("updates intake quality signals live through intermediate and complete states", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();
    const guide = screen.getByRole("region", { name: "Intake quality guide" });
    const status = within(guide).getByRole("status");

    fireEvent.change(screen.getByLabelText("What are you thinking about building?"), {
      target: { value: "Founder research copilot" },
    });
    expect(status).toHaveTextContent("Rough completeness signal: 0 of 4 signals present.");
    expect(within(guide).getByText("Concrete idea or workflow", { exact: false })).toHaveTextContent(
      "Concrete idea or workflow: missing",
    );

    fireEvent.change(screen.getByLabelText("What are you thinking about building?"), {
      target: { value: "AI copilot for founder research workflows" },
    });
    fireEvent.change(screen.getByLabelText("Target user (optional)"), {
      target: { value: "Seed-stage founders" },
    });

    expect(status).toHaveTextContent("Rough completeness signal: 2 of 4 signals present.");
    expect(status).toHaveTextContent("Promising signal.");
    expect(within(guide).getByText("Concrete idea or workflow", { exact: false })).toHaveTextContent(
      "Concrete idea or workflow: present",
    );
    expect(within(guide).getByText("Target user named", { exact: false })).toHaveTextContent(
      "Target user named: present",
    );

    fillIntakeFields();

    expect(status).toHaveTextContent("Rough completeness signal: 4 of 4 signals present.");
    expect(status).toHaveTextContent("Strong signal.");
    expect(status).toHaveTextContent(
      "Strong signal. This looks complete enough for a more grounded first brief, but it is still only a rough intake check.",
    );
  });

  it("requires at least 6 words for the concrete idea signal", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();
    const guide = screen.getByRole("region", { name: "Intake quality guide" });

    fireEvent.change(screen.getByLabelText("What are you thinking about building?"), {
      target: { value: "AI copilot for founder research" },
    });
    expect(within(guide).getByText("Concrete idea or workflow", { exact: false })).toHaveTextContent(
      "Concrete idea or workflow: missing",
    );

    fireEvent.change(screen.getByLabelText("What are you thinking about building?"), {
      target: { value: "AI copilot for founder research planning" },
    });
    expect(within(guide).getByText("Concrete idea or workflow", { exact: false })).toHaveTextContent(
      "Concrete idea or workflow: present",
    );
  });

  it("prefills the intake fields when a starter brief is selected", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();
    const clinicStarter = screen.getByRole("button", { name: /Ops assistant for clinics/i });
    const retailStarter = screen.getByRole("button", { name: /Retail demand planner/i });

    expect(clinicStarter).toHaveAttribute("aria-pressed", "false");
    expect(retailStarter).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(clinicStarter);

    expect(screen.getByLabelText("What are you thinking about building?")).toHaveValue(
      "A workflow assistant for independent clinics that automates patient scheduling follow-ups, no-show recovery, and front-desk task handoffs.",
    );
    expect(screen.getByLabelText("Relevant URL (optional)")).toHaveValue("");
    expect(screen.getByLabelText("Target user (optional)")).toHaveValue(
      "Practice managers at independent primary care clinics",
    );
    expect(screen.getByLabelText("Main uncertainty (optional)")).toHaveValue(
      "Is the biggest wedge missed appointments, or do clinic teams care more about reducing manual coordination across channels?",
    );
    expect(clinicStarter).toHaveAttribute("aria-pressed", "true");
    expect(retailStarter).toHaveAttribute("aria-pressed", "false");
    expect(clinicStarter).toHaveClass("border-stone-900", "bg-stone-950", "text-white");
  });

  it("switches the selected state between starter brief cards and keeps starter URLs blank", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();
    const clinicStarter = screen.getByRole("button", { name: /Ops assistant for clinics/i });
    const retailStarter = screen.getByRole("button", { name: /Retail demand planner/i });

    fireEvent.click(clinicStarter);
    expect(screen.getByLabelText("Relevant URL (optional)")).toHaveValue("");

    fireEvent.click(retailStarter);

    expect(clinicStarter).toHaveAttribute("aria-pressed", "false");
    expect(retailStarter).toHaveAttribute("aria-pressed", "true");
    expect(retailStarter).toHaveClass("border-stone-900", "bg-stone-950", "text-white");
    expect(screen.getByLabelText("What are you thinking about building?")).toHaveValue(
      "A lightweight planning tool that helps Shopify brands forecast demand, time reorders, and spot risky stockouts before bestsellers go out of stock.",
    );
    expect(screen.getByLabelText("Relevant URL (optional)")).toHaveValue("");
  });

  it("clears the selected starter state after a manual intake edit", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();
    const clinicStarter = screen.getByRole("button", { name: /Ops assistant for clinics/i });

    fireEvent.click(clinicStarter);
    expect(clinicStarter).toHaveAttribute("aria-pressed", "true");
    expect(clinicStarter).toHaveClass("border-stone-900", "bg-stone-950", "text-white");

    fireEvent.change(screen.getByLabelText("What are you thinking about building?"), {
      target: { value: "A workflow assistant for independent clinics with custom routing." },
    });

    expect(clinicStarter).toHaveAttribute("aria-pressed", "false");
    expect(clinicStarter).not.toHaveClass("border-stone-900", "bg-stone-950", "text-white");
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

  it("traps keyboard focus within the dialog while open", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    const skipButton = screen.getByRole("button", { name: "Skip" });
    const getStartedButton = screen.getByRole("button", { name: "Get Started" });

    skipButton.focus();
    fireEvent.keyDown(skipButton, { key: "Tab", shiftKey: true });
    expect(getStartedButton).toHaveFocus();

    getStartedButton.focus();
    fireEvent.keyDown(getStartedButton, { key: "Tab" });
    expect(skipButton).toHaveFocus();
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

  it("uses a url input and clears selected starter state when initialIntake changes while open", () => {
    const { rerender } = render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();
    const clinicStarter = screen.getByRole("button", { name: /Ops assistant for clinics/i });

    fireEvent.click(clinicStarter);
    expect(clinicStarter).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Relevant URL (optional)")).toHaveAttribute("type", "url");

    rerender(
      <OnboardingModal
        open
        onComplete={onComplete}
        onSkip={onSkip}
        initialIntake={{
          primaryIdea: "Carry this prompt into onboarding.",
          url: "https://example.com/new",
          targetUser: "Founders",
        }}
      />,
    );

    expect(clinicStarter).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("What are you thinking about building?")).toHaveValue(
      "Carry this prompt into onboarding.",
    );
  });

  it("restores focus to the previously active element when closed", () => {
    const { rerender } = render(
      <>
        <button type="button">Open onboarding</button>
        <OnboardingModal open={false} onComplete={onComplete} onSkip={onSkip} />
      </>,
    );

    const opener = screen.getByRole("button", { name: "Open onboarding" });
    opener.focus();

    rerender(
      <>
        <button type="button">Open onboarding</button>
        <OnboardingModal open onComplete={onComplete} onSkip={onSkip} />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Welcome to AI Cofounder" })).toHaveFocus();

    rerender(
      <>
        <button type="button">Open onboarding</button>
        <OnboardingModal open={false} onComplete={onComplete} onSkip={onSkip} />
      </>,
    );

    expect(screen.getByRole("button", { name: "Open onboarding" })).toHaveFocus();
  });
});
