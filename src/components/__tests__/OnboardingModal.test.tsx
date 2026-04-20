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
    expect(screen.getByRole("radiogroup", { name: "Starter briefs" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Customer research copilot/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Ops assistant for clinics/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Retail demand planner/i })).toBeInTheDocument();
    expect(screen.getByLabelText("What are you thinking about building?")).toBeInTheDocument();
    expect(screen.getByLabelText("Relevant URL (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Target user (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Main uncertainty (optional)")).toBeInTheDocument();
  });

  it("shows concrete starter deliverables inside the brief cards", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();

    const researchStarter = screen.getByRole("radio", { name: /Customer research copilot/i });

    expect(researchStarter).toHaveAccessibleName("Customer research copilot");
    expect(researchStarter).toHaveAccessibleDescription(
      "Turn interview notes and market links into next-step validation plans. You'll leave with A founder-ready validation brief with the sharpest problem to test first. A shortlist of interview themes and follow-up questions worth pursuing. A concrete next-step plan for research, synthesis, and early product scoping.",
    );
    expect(within(researchStarter).getByText("You'll leave with")).toBeInTheDocument();
    expect(
      within(researchStarter).getByText(
        "A founder-ready validation brief with the sharpest problem to test first.",
      ),
    ).toBeInTheDocument();
    expect(
      within(researchStarter).getByText(
        "A shortlist of interview themes and follow-up questions worth pursuing.",
      ),
    ).toBeInTheDocument();
  });

  it("prefills the intake fields when a starter brief is selected", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();
    const clinicStarter = screen.getByRole("radio", { name: /Ops assistant for clinics/i });
    const retailStarter = screen.getByRole("radio", { name: /Retail demand planner/i });

    expect(clinicStarter).toHaveAttribute("aria-checked", "false");
    expect(retailStarter).toHaveAttribute("aria-checked", "false");

    fireEvent.click(clinicStarter);

    expect(within(clinicStarter).getByText("You'll leave with")).toBeInTheDocument();
    expect(
      within(clinicStarter).getByText("A workflow brief showing where scheduling and no-show recovery can be automated."),
    ).toBeInTheDocument();
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
    expect(clinicStarter).toHaveAttribute("aria-checked", "true");
    expect(retailStarter).toHaveAttribute("aria-checked", "false");
    expect(clinicStarter).toHaveClass("border-stone-900", "bg-stone-950", "text-white");
  });

  it("switches the selected state between starter brief cards and keeps starter URLs blank", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();
    const clinicStarter = screen.getByRole("radio", { name: /Ops assistant for clinics/i });
    const retailStarter = screen.getByRole("radio", { name: /Retail demand planner/i });

    fireEvent.click(clinicStarter);
    expect(screen.getByLabelText("Relevant URL (optional)")).toHaveValue("");

    fireEvent.click(retailStarter);

    expect(clinicStarter).toHaveAttribute("aria-checked", "false");
    expect(retailStarter).toHaveAttribute("aria-checked", "true");
    expect(retailStarter).toHaveClass("border-stone-900", "bg-stone-950", "text-white");
    expect(screen.getByLabelText("What are you thinking about building?")).toHaveValue(
      "A lightweight planning tool that helps Shopify brands forecast demand, time reorders, and spot risky stockouts before bestsellers go out of stock.",
    );
    expect(screen.getByLabelText("Relevant URL (optional)")).toHaveValue("");
  });

  it("updates focus, selection, and intake fields when navigating starter briefs with the keyboard", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();
    const researchStarter = screen.getByRole("radio", { name: /Customer research copilot/i });
    const clinicStarter = screen.getByRole("radio", { name: /Ops assistant for clinics/i });
    const retailStarter = screen.getByRole("radio", { name: /Retail demand planner/i });

    researchStarter.focus();
    fireEvent.keyDown(researchStarter, { key: "ArrowRight" });

    expect(clinicStarter).toHaveFocus();
    expect(clinicStarter).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("What are you thinking about building?")).toHaveValue(
      "A workflow assistant for independent clinics that automates patient scheduling follow-ups, no-show recovery, and front-desk task handoffs.",
    );

    fireEvent.keyDown(clinicStarter, { key: "End" });

    expect(retailStarter).toHaveFocus();
    expect(retailStarter).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Target user (optional)")).toHaveValue(
      "Operators at small e-commerce brands doing $1M-$10M in annual revenue",
    );

    fireEvent.keyDown(retailStarter, { key: "Home" });

    expect(researchStarter).toHaveFocus();
    expect(researchStarter).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Main uncertainty (optional)")).toHaveValue(
      "Will founders trust an AI-generated brief enough to use it before talking to more customers?",
    );
  });

  it("clears the selected starter state after a manual intake edit", () => {
    render(<OnboardingModal open onComplete={onComplete} onSkip={onSkip} />);

    moveToIdeaStep();
    const clinicStarter = screen.getByRole("radio", { name: /Ops assistant for clinics/i });

    fireEvent.click(clinicStarter);
    expect(clinicStarter).toHaveAttribute("aria-checked", "true");
    expect(clinicStarter).toHaveClass("border-stone-900", "bg-stone-950", "text-white");

    fireEvent.change(screen.getByLabelText("What are you thinking about building?"), {
      target: { value: "A workflow assistant for independent clinics with custom routing." },
    });

    expect(clinicStarter).toHaveAttribute("aria-checked", "false");
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

  it("prefills the intake, opens on the idea step, and selects the matching starter when initialIntake matches", () => {
    render(
      <OnboardingModal
        open
        onComplete={onComplete}
        onSkip={onSkip}
        initialIntake={{
          primaryIdea:
            "A workflow assistant for independent clinics that automates patient scheduling follow-ups, no-show recovery, and front-desk task handoffs.",
          url: "",
          targetUser: "Practice managers at independent primary care clinics",
          mainUncertainty:
            "Is the biggest wedge missed appointments, or do clinic teams care more about reducing manual coordination across channels?",
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "About Your Idea" })).toBeInTheDocument();
    expect(screen.getByLabelText("What are you thinking about building?")).toHaveValue(
      "A workflow assistant for independent clinics that automates patient scheduling follow-ups, no-show recovery, and front-desk task handoffs.",
    );
    expect(screen.getByLabelText("Target user (optional)")).toHaveValue(
      "Practice managers at independent primary care clinics",
    );
    expect(screen.getByRole("radio", { name: /Ops assistant for clinics/i })).toHaveAttribute("aria-checked", "true");
  });

  it("leaves all starter briefs unselected when initialIntake does not match a starter", () => {
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
    expect(screen.getByRole("radio", { name: /Customer research copilot/i })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: /Ops assistant for clinics/i })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: /Retail demand planner/i })).toHaveAttribute("aria-checked", "false");
  });

  it("resyncs the selected starter when initialIntake updates while the modal is open", () => {
    const { rerender } = render(
      <OnboardingModal open onComplete={onComplete} onSkip={onSkip} initialIntake={{ primaryIdea: "Carry this prompt into onboarding." }} />,
    );

    expect(screen.getByRole("radio", { name: /Ops assistant for clinics/i })).toHaveAttribute("aria-checked", "false");

    rerender(
      <OnboardingModal
        open
        onComplete={onComplete}
        onSkip={onSkip}
        initialIntake={{
          primaryIdea:
            "A workflow assistant for independent clinics that automates patient scheduling follow-ups, no-show recovery, and front-desk task handoffs.",
          url: "",
          targetUser: "Practice managers at independent primary care clinics",
          mainUncertainty:
            "Is the biggest wedge missed appointments, or do clinic teams care more about reducing manual coordination across channels?",
        }}
      />,
    );

    expect(screen.getByRole("radio", { name: /Ops assistant for clinics/i })).toHaveAttribute("aria-checked", "true");
  });

  it("does not clobber user edits when rerendered with equivalent normalized initialIntake values", () => {
    const { rerender } = render(
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

    fireEvent.change(screen.getByLabelText("What are you thinking about building?"), {
      target: { value: "Edited locally after the first render." },
    });
    fireEvent.change(screen.getByLabelText("Target user (optional)"), {
      target: { value: "Edited founders" },
    });

    rerender(
      <OnboardingModal
        open
        onComplete={onComplete}
        onSkip={onSkip}
        initialIntake={{
          primaryIdea: "  Carry this prompt into onboarding.  ",
          url: "   ",
          targetUser: "Founders",
          mainUncertainty: "",
        }}
      />,
    );

    expect(screen.getByLabelText("What are you thinking about building?")).toHaveValue(
      "Edited locally after the first render.",
    );
    expect(screen.getByLabelText("Target user (optional)")).toHaveValue("Edited founders");
    expect(screen.getByRole("radio", { name: /Customer research copilot/i })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: /Ops assistant for clinics/i })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: /Retail demand planner/i })).toHaveAttribute("aria-checked", "false");
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
