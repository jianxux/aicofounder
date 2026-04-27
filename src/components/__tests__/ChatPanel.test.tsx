import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ChatPanel from "@/components/ChatPanel";
import type { ChatMessage, Phase } from "@/lib/types";

const mockPhaseTracker = vi.fn();

vi.mock("@/components/PhaseTracker", () => ({
  default: (props: {
    phases: Phase[];
    activePhaseId: string;
    collapsed: boolean;
    onToggleCollapsed: () => void;
    onSetActivePhase: (phaseId: string) => void;
    onToggleTask: (phaseId: string, taskId: string) => void;
  }) => {
    mockPhaseTracker(props);

    return (
      <div data-testid="phase-tracker">
        <div>collapsed: {String(props.collapsed)}</div>
        <button type="button" onClick={props.onToggleCollapsed}>
          Toggle collapsed
        </button>
      </div>
    );
  },
}));

const createMessages = (): ChatMessage[] => [
  {
    id: "user-1",
    sender: "user",
    content: "Build me a landing page",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "assistant-1",
    sender: "assistant",
    content: "Let's define the target audience first.",
    createdAt: "2024-01-01T00:01:00.000Z",
  },
];

const createPhases = (): Phase[] => [
  {
    id: "discovery",
    title: "Discovery",
    tasks: [
      { id: "research", label: "Research market", done: true },
      { id: "personas", label: "Define personas", done: false },
    ],
  },
  {
    id: "build",
    title: "Build MVP",
    tasks: [{ id: "prototype", label: "Create prototype", done: false }],
  },
];

const validationCreateModeStarters = [
  "Summarize the strongest evidence we already have for this scorecard.",
  "What assumptions should we validate before locking any scores?",
  "Draft the next validation step that would most reduce risk.",
];
const validationCreateModeLabels = ["Evidence check", "Assumption scan", "Risk reducer"];
const validationFollowUpStarters = [
  "What score in this scorecard needs the strongest challenge right now?",
  "Which evidence gap is keeping this scorecard from being decision-ready?",
  "Turn this scorecard into the next validation experiment plan.",
];
const validationFollowUpLabels = ["Score challenge", "Proof gap", "Experiment plan"];

const memoCreateModeStarters = [
  "Summarize the strongest customer signals we should capture in this memo.",
  "What open questions should guide the next round of interviews?",
  "Draft the next research move that would sharpen this memo fastest.",
];
const memoCreateModeLabels = ["Evidence check", "Assumption scan", "Experiment plan"];

const memoFollowUpStarters = [
  "What contradictions in this memo need to be resolved first?",
  "Which missing evidence would most improve this memo?",
  "Turn these findings into the next customer interview plan.",
];
const memoFollowUpLabels = ["Contradiction scan", "Proof gap", "Interview plan"];

const starterButtonName = (label: string, prompt: string) => `${label}: ${prompt}`;

type RenderOptions = {
  messages?: ChatMessage[];
  phases?: Phase[];
  activePhaseId?: string;
  isLoading?: boolean;
  activeArtifactLabel?: string;
  activeArtifactType?: "validation-scorecard" | "customer-research-memo";
  activeArtifactHasOutput?: boolean;
  activeArtifactChatMode?: "create" | "artifact-follow-up";
  onResearch?: (() => void) | undefined;
  onUltraplan?: (() => void) | undefined;
};

const renderChatPanel = (options: RenderOptions = {}) => {
  const {
    messages = createMessages(),
    phases = createPhases(),
    activePhaseId = "build",
    isLoading = false,
    activeArtifactLabel = "Validation scorecard",
    activeArtifactType = "validation-scorecard",
    activeArtifactHasOutput = false,
    activeArtifactChatMode = activeArtifactHasOutput ? "artifact-follow-up" : "create",
  } = options;
  const onResearch = Object.prototype.hasOwnProperty.call(options, "onResearch") ? options.onResearch : vi.fn();
  const onUltraplan = Object.prototype.hasOwnProperty.call(options, "onUltraplan") ? options.onUltraplan : vi.fn();

  const onSendMessage = vi.fn();
  const onRemind = vi.fn();
  const onBrainstorm = vi.fn();
  const onToggleTask = vi.fn();
  const onSetActivePhase = vi.fn();

  render(
    <ChatPanel
      messages={messages}
      phases={phases}
      activePhaseId={activePhaseId}
      activeArtifactLabel={activeArtifactLabel}
      activeArtifactType={activeArtifactType}
      activeArtifactHasOutput={activeArtifactHasOutput}
      activeArtifactChatMode={activeArtifactChatMode}
      onSendMessage={onSendMessage}
      isLoading={isLoading}
      onRemind={onRemind}
      onBrainstorm={onBrainstorm}
      onResearch={onResearch}
      onUltraplan={onUltraplan}
      onToggleTask={onToggleTask}
      onSetActivePhase={onSetActivePhase}
    />,
  );

  return { onSendMessage, onRemind, onBrainstorm, onResearch, onUltraplan, onToggleTask, onSetActivePhase };
};

describe("ChatPanel", () => {
  beforeEach(() => {
    mockPhaseTracker.mockClear();
  });

  describe("render basics", () => {
    it("renders the header label and subtitle", () => {
      renderChatPanel();

      expect(screen.getByText("AI Cofounder")).toBeInTheDocument();
      expect(screen.getByText("Build the validation scorecard")).toBeInTheDocument();
      expect(screen.getByText("Active artifact")).toBeInTheDocument();
      expect(screen.getByText("Validation scorecard")).toBeInTheDocument();
      expect(screen.getByText("Create mode")).toBeInTheDocument();
    });

    it("switches the framing when the customer research memo is active", () => {
      renderChatPanel({
        activeArtifactLabel: "Customer research memo",
        activeArtifactType: "customer-research-memo",
      });

      expect(screen.getByText("Build the customer research memo")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Update memo" })).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Add findings, contradictions, or next questions for the customer research memo..."),
      ).toBeInTheDocument();
    });

    it("renders user messages with user styling", () => {
      renderChatPanel();

      const content = screen.getByText("Build me a landing page");
      const bubble = content.parentElement;
      const row = bubble?.parentElement;

      expect(bubble).toHaveClass("bg-sky-600");
      expect(row).toHaveClass("justify-end");
    });

    it("renders assistant messages with assistant styling", () => {
      renderChatPanel();

      const content = screen.getByText("Let's define the target audience first.");
      const bubble = content.parentElement;
      const row = bubble?.parentElement;

      expect(bubble).toHaveClass("bg-stone-100");
      expect(row).toHaveClass("justify-start");
    });

    it("preserves multiline formatting in chat bubbles", () => {
      renderChatPanel({
        messages: [
          {
            id: "assistant-multiline",
            sender: "assistant",
            content: "Line one\nLine two",
            createdAt: "2024-01-01T00:02:00.000Z",
          },
        ],
      });

      const bubble = screen.getByText((_, element) => {
        if (!element?.classList.contains("whitespace-pre-wrap")) {
          return false;
        }

        const content = element.textContent ?? "";
        return content.includes("Line one") && content.includes("Line two");
      });

      expect(bubble).toHaveClass("whitespace-pre-wrap");
      expect(bubble).toHaveTextContent("Line one");
      expect(bubble).toHaveTextContent("Line two");
    });

    it("renders an empty messages list without crashing", () => {
      renderChatPanel({ messages: [] });

      expect(screen.getByText("AI Cofounder")).toBeInTheDocument();
      expect(screen.queryByText("Build me a landing page")).not.toBeInTheDocument();
      expect(screen.queryByText("Let's define the target audience first.")).not.toBeInTheDocument();
    });

    it("does not render the structured form for empty artifacts", () => {
      renderChatPanel({
        activeArtifactHasOutput: false,
      });

      expect(screen.queryByRole("form", { name: "Structured refinement" })).not.toBeInTheDocument();
      expect(screen.getByRole("form", { name: "Freeform chat" })).toBeInTheDocument();
      expect(screen.getByText("Create mode")).toBeInTheDocument();
    });

    it("renders the structured form for a populated validation scorecard", () => {
      renderChatPanel({
        activeArtifactHasOutput: true,
      });

      expect(screen.getByRole("form", { name: "Structured refinement" })).toBeInTheDocument();
      expect(screen.getByLabelText("Strongest signal")).toBeInTheDocument();
      expect(screen.getByLabelText("Biggest risk")).toBeInTheDocument();
      expect(screen.getByText("Ask about the validation scorecard")).toBeInTheDocument();
      expect(screen.getByText("Artifact follow-up")).toBeInTheDocument();
      expect(screen.getByText("Freeform chat is grounded in the active artifact and its latest revision.")).toBeInTheDocument();
      expect(screen.getByRole("form", { name: "Freeform chat" })).toBeInTheDocument();
    });

    it("renders the structured form for a populated customer research memo", () => {
      renderChatPanel({
        activeArtifactLabel: "Customer research memo",
        activeArtifactType: "customer-research-memo",
        activeArtifactHasOutput: true,
      });

      expect(screen.getByRole("form", { name: "Structured refinement" })).toBeInTheDocument();
      expect(screen.getByLabelText("Contradiction to resolve")).toBeInTheDocument();
      expect(screen.getByLabelText("Missing evidence")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ask about memo" })).toBeInTheDocument();
    });

    it("shows validation-scorecard starter prompts that are specific to create mode", () => {
      renderChatPanel({
        activeArtifactHasOutput: false,
        activeArtifactChatMode: "create",
      });

      for (const [index, starter] of validationCreateModeStarters.entries()) {
        expect(
          screen.getByRole("button", { name: starterButtonName(validationCreateModeLabels[index], starter) }),
        ).toBeInTheDocument();
      }

      for (const label of validationCreateModeLabels) {
        expect(screen.getByText(label)).toBeInTheDocument();
      }

      expect(
        screen.queryByRole("button", {
          name: starterButtonName(memoFollowUpLabels[0], memoFollowUpStarters[0]),
        }),
      ).not.toBeInTheDocument();
    });

    it("omits optional action controls when research callbacks are not provided", () => {
      renderChatPanel({
        onResearch: undefined,
        onUltraplan: undefined,
      });

      for (const [index, starter] of validationCreateModeStarters.entries()) {
        expect(
          screen.getByRole("button", { name: starterButtonName(validationCreateModeLabels[index], starter) }),
        ).toBeInTheDocument();
      }

      expect(screen.queryByRole("button", { name: /update customer research memo/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /ultraplan/i })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /brainstorm pain points/i })).toBeInTheDocument();
    });

    it("shows different starter prompts when following up on a customer research memo", () => {
      renderChatPanel({
        activeArtifactLabel: "Customer research memo",
        activeArtifactType: "customer-research-memo",
        activeArtifactHasOutput: true,
        activeArtifactChatMode: "artifact-follow-up",
      });

      for (const [index, starter] of memoFollowUpStarters.entries()) {
        expect(
          screen.getByRole("button", { name: starterButtonName(memoFollowUpLabels[index], starter) }),
        ).toBeInTheDocument();
      }

      for (const label of memoFollowUpLabels) {
        expect(screen.getByText(label)).toBeInTheDocument();
      }

      expect(
        screen.queryByRole("button", {
          name: starterButtonName(validationCreateModeLabels[0], validationCreateModeStarters[0]),
        }),
      ).not.toBeInTheDocument();
    });

    it("shows validation-scorecard follow-up starter prompts with cue labels", () => {
      renderChatPanel({
        activeArtifactHasOutput: true,
        activeArtifactChatMode: "artifact-follow-up",
      });

      for (const [index, starter] of validationFollowUpStarters.entries()) {
        expect(
          screen.getByRole("button", { name: starterButtonName(validationFollowUpLabels[index], starter) }),
        ).toBeInTheDocument();
      }

      for (const label of validationFollowUpLabels) {
        expect(screen.getByText(label)).toBeInTheDocument();
      }
    });

    it("shows customer research memo create starter prompts with cue labels", () => {
      renderChatPanel({
        activeArtifactLabel: "Customer research memo",
        activeArtifactType: "customer-research-memo",
        activeArtifactHasOutput: false,
        activeArtifactChatMode: "create",
      });

      for (const [index, starter] of memoCreateModeStarters.entries()) {
        expect(
          screen.getByRole("button", { name: starterButtonName(memoCreateModeLabels[index], starter) }),
        ).toBeInTheDocument();
      }

      for (const label of memoCreateModeLabels) {
        expect(screen.getByText(label)).toBeInTheDocument();
      }
    });
  });

  describe("message form", () => {
    it("updates the draft value when typing into the textarea", () => {
      renderChatPanel();

      const textarea = screen.getByPlaceholderText(
        "Add evidence, scores, or next validation checks for the scorecard...",
      );

      fireEvent.change(textarea, { target: { value: "New idea" } });

      expect(textarea).toHaveValue("New idea");
    });

    it("gives the freeform chat textarea an accessible name", () => {
      renderChatPanel();

      expect(screen.getByRole("textbox", { name: /freeform chat/i })).toBeInTheDocument();
    });

    it("submits trimmed text, calls onSendMessage, and clears the textarea", () => {
      const { onSendMessage } = renderChatPanel();
      const textarea = screen.getByPlaceholderText(
        "Add evidence, scores, or next validation checks for the scorecard...",
      );
      const form = screen.getByRole("button", { name: "Update scorecard" }).closest("form");

      fireEvent.change(textarea, { target: { value: "  Validate this market  " } });
      fireEvent.submit(form!);

      expect(onSendMessage).toHaveBeenCalledTimes(1);
      expect(onSendMessage).toHaveBeenCalledWith("Validate this market");
      expect(textarea).toHaveValue("");
    });

    it("does not submit empty or whitespace-only drafts", () => {
      const { onSendMessage } = renderChatPanel();
      const textarea = screen.getByPlaceholderText(
        "Add evidence, scores, or next validation checks for the scorecard...",
      );
      const form = screen.getByRole("button", { name: "Update scorecard" }).closest("form");

      fireEvent.change(textarea, { target: { value: "   " } });
      fireEvent.submit(form!);

      expect(onSendMessage).not.toHaveBeenCalled();
      expect(textarea).toHaveValue("   ");
    });

    it("disables freeform submit for empty or whitespace-only drafts and enables it for non-whitespace input", () => {
      renderChatPanel();

      const textarea = screen.getByPlaceholderText(
        "Add evidence, scores, or next validation checks for the scorecard...",
      );
      const submitButton = screen.getByRole("button", { name: "Update scorecard" });

      expect(submitButton).toBeDisabled();

      fireEvent.change(textarea, { target: { value: "   " } });
      expect(submitButton).toBeDisabled();

      fireEvent.change(textarea, { target: { value: "Refine the evidence summary" } });
      expect(submitButton).toBeEnabled();
    });

    it("calls onRemind when the remind button is clicked", () => {
      const { onRemind } = renderChatPanel();

      fireEvent.click(screen.getByRole("button", { name: "Remind me what we were working on" }));

      expect(onRemind).toHaveBeenCalledTimes(1);
    });

    it("calls onBrainstorm when the brainstorm button is clicked", () => {
      const { onBrainstorm } = renderChatPanel();

      fireEvent.click(screen.getByRole("button", { name: /brainstorm pain points/i }));

      expect(onBrainstorm).toHaveBeenCalledTimes(1);
    });

    it("calls onResearch when the deep research button is clicked", () => {
      const { onResearch } = renderChatPanel();

      fireEvent.click(screen.getByRole("button", { name: /update customer research memo/i }));

      expect(onResearch).toHaveBeenCalledTimes(1);
    });

    it("clicking a starter prompt populates the textarea without sending immediately", () => {
      const { onSendMessage } = renderChatPanel();
      const textarea = screen.getByPlaceholderText(
        "Add evidence, scores, or next validation checks for the scorecard...",
      );

      fireEvent.click(
        screen.getByRole("button", {
          name: starterButtonName(validationCreateModeLabels[1], validationCreateModeStarters[1]),
        }),
      );

      expect(textarea).toHaveValue(validationCreateModeStarters[1]);
      expect(onSendMessage).not.toHaveBeenCalled();
    });

    it("shows the typing indicator when isLoading is true", () => {
      renderChatPanel({ isLoading: true });

      expect(screen.getByLabelText("AI is thinking")).toBeInTheDocument();
    });

    it("disables the textarea and send button when isLoading is true", () => {
      renderChatPanel({ isLoading: true, activeArtifactHasOutput: true });

      expect(
        screen.getByPlaceholderText("Ask about this scorecard, challenge a score, or request the next validation step..."),
      ).toBeDisabled();
      expect(screen.getByRole("button", { name: "Ask about scorecard" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Submit structured refinement" })).toBeDisabled();
      expect(screen.getByLabelText("Strongest signal")).toBeDisabled();
      expect(screen.getByRole("button", { name: /brainstorm pain points/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /update customer research memo/i })).toBeDisabled();
    });

    it("disables starter prompt interactions while loading", () => {
      const { onSendMessage } = renderChatPanel({ isLoading: true });

      const starter = screen.getByRole("button", {
        name: starterButtonName(validationCreateModeLabels[0], validationCreateModeStarters[0]),
      });
      const textarea = screen.getByPlaceholderText(
        "Add evidence, scores, or next validation checks for the scorecard...",
      );

      expect(starter).toBeDisabled();
      fireEvent.click(starter);

      expect(textarea).toHaveValue("");
      expect(onSendMessage).not.toHaveBeenCalled();
    });

    it("does not show the typing indicator when isLoading is false", () => {
      renderChatPanel({ isLoading: false });

      expect(screen.queryByLabelText("AI is thinking")).not.toBeInTheDocument();
    });

    it("composes a focused refinement message on structured submit", () => {
      const { onSendMessage } = renderChatPanel({
        activeArtifactHasOutput: true,
      });

      fireEvent.change(screen.getByLabelText("Strongest signal"), {
        target: { value: "Founders repeatedly mention manual follow-up pain." },
      });
      fireEvent.change(screen.getByLabelText("Next validation step"), {
        target: { value: "Run five calls focused on switching triggers." },
      });
      fireEvent.click(screen.getByRole("button", { name: "Submit structured refinement" }));

      expect(onSendMessage).toHaveBeenCalledWith(
        "Refine the validation scorecard with this update:\n" +
          "Strongest signal: Founders repeatedly mention manual follow-up pain.\n" +
          "Next validation step: Run five calls focused on switching triggers.",
      );
      expect(screen.getByLabelText("Strongest signal")).toHaveValue("");
      expect(screen.getByLabelText("Next validation step")).toHaveValue("");
    });

    it("trims and includes all validation refinement fields when provided", () => {
      const { onSendMessage } = renderChatPanel({
        activeArtifactHasOutput: true,
      });

      fireEvent.change(screen.getByLabelText("Strongest signal"), {
        target: { value: "  High interview conversion  " },
      });
      fireEvent.change(screen.getByLabelText("Biggest risk"), {
        target: { value: "  Weak willingness to pay  " },
      });
      fireEvent.change(screen.getByLabelText("Score"), {
        target: { value: "  3.5/5  " },
      });
      fireEvent.change(screen.getByLabelText("Confidence"), {
        target: { value: "  Medium  " },
      });
      fireEvent.change(screen.getByLabelText("Next validation step"), {
        target: { value: "  Run pricing tests next week.  " },
      });
      fireEvent.click(screen.getByRole("button", { name: "Submit structured refinement" }));

      expect(onSendMessage).toHaveBeenCalledWith(
        "Refine the validation scorecard with this update:\n" +
          "Strongest signal: High interview conversion\n" +
          "Biggest risk: Weak willingness to pay\n" +
          "Score: 3.5/5\n" +
          "Confidence: Medium\n" +
          "Next validation step: Run pricing tests next week.",
      );
    });

    it("composes a focused research memo refinement message on structured submit", () => {
      const { onSendMessage } = renderChatPanel({
        activeArtifactLabel: "Customer research memo",
        activeArtifactType: "customer-research-memo",
        activeArtifactHasOutput: true,
      });

      fireEvent.change(screen.getByLabelText("Contradiction to resolve"), {
        target: { value: "  Teams want automation but fear losing control.  " },
      });
      fireEvent.change(screen.getByLabelText("Missing evidence"), {
        target: { value: "  No budget-owner interviews yet.  " },
      });
      fireEvent.change(screen.getByLabelText("Target user question"), {
        target: { value: "  What breaks your current workflow most often?  " },
      });
      fireEvent.change(screen.getByLabelText("Next research question"), {
        target: { value: "  Which trigger would make you switch tools this quarter?  " },
      });
      fireEvent.click(screen.getByRole("button", { name: "Submit structured refinement" }));

      expect(onSendMessage).toHaveBeenCalledWith(
        "Refine the customer research memo with this update:\n" +
          "Contradiction to resolve: Teams want automation but fear losing control.\n" +
          "Missing evidence: No budget-owner interviews yet.\n" +
          "Target user question: What breaks your current workflow most often?\n" +
          "Next research question: Which trigger would make you switch tools this quarter?",
      );
      expect(screen.getByLabelText("Contradiction to resolve")).toHaveValue("");
      expect(screen.getByLabelText("Next research question")).toHaveValue("");
    });

    it("keeps structured submit disabled for whitespace-only refinement input", () => {
      const { onSendMessage } = renderChatPanel({
        activeArtifactHasOutput: true,
      });

      fireEvent.change(screen.getByLabelText("Strongest signal"), {
        target: { value: "   " },
      });

      const submitButton = screen.getByRole("button", { name: "Submit structured refinement" });

      expect(submitButton).toBeDisabled();
      fireEvent.click(submitButton);
      expect(onSendMessage).not.toHaveBeenCalled();
    });

    it("disables structured submit while loading", () => {
      renderChatPanel({
        activeArtifactHasOutput: true,
        isLoading: true,
      });

      expect(screen.getByRole("button", { name: "Submit structured refinement" })).toBeDisabled();
      expect(screen.getByLabelText("Strongest signal")).toBeDisabled();
    });

    it("switching active artifacts swaps refinement fields correctly", () => {
      const onSendMessage = vi.fn();
      const onRemind = vi.fn();
      const onBrainstorm = vi.fn();
      const onResearch = vi.fn();
      const onToggleTask = vi.fn();
      const onSetActivePhase = vi.fn();
      const phases = createPhases();
      const messages = createMessages();
      const { rerender } = render(
        <ChatPanel
          messages={messages}
          phases={phases}
          activePhaseId="build"
          activeArtifactLabel="Validation scorecard"
          activeArtifactType="validation-scorecard"
          activeArtifactHasOutput={true}
          activeArtifactChatMode="artifact-follow-up"
          onSendMessage={onSendMessage}
          isLoading={false}
          onRemind={onRemind}
          onBrainstorm={onBrainstorm}
          onResearch={onResearch}
          onToggleTask={onToggleTask}
          onSetActivePhase={onSetActivePhase}
        />,
      );

      fireEvent.change(screen.getByLabelText("Strongest signal"), {
        target: { value: "Strong retention signal" },
      });

      rerender(
        <ChatPanel
          messages={messages}
          phases={phases}
          activePhaseId="build"
          activeArtifactLabel="Customer research memo"
          activeArtifactType="customer-research-memo"
          activeArtifactHasOutput={true}
          activeArtifactChatMode="artifact-follow-up"
          onSendMessage={onSendMessage}
          isLoading={false}
          onRemind={onRemind}
          onBrainstorm={onBrainstorm}
          onResearch={onResearch}
          onToggleTask={onToggleTask}
          onSetActivePhase={onSetActivePhase}
        />,
      );

      expect(screen.queryByLabelText("Strongest signal")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Contradiction to resolve")).toHaveValue("");

      rerender(
        <ChatPanel
          messages={messages}
          phases={phases}
          activePhaseId="build"
          activeArtifactLabel="Validation scorecard"
          activeArtifactType="validation-scorecard"
          activeArtifactHasOutput={true}
          activeArtifactChatMode="artifact-follow-up"
          onSendMessage={onSendMessage}
          isLoading={false}
          onRemind={onRemind}
          onBrainstorm={onBrainstorm}
          onResearch={onResearch}
          onToggleTask={onToggleTask}
          onSetActivePhase={onSetActivePhase}
        />,
      );

      expect(screen.getByLabelText("Strongest signal")).toHaveValue("");
    });
  });

  describe("active phase", () => {
    it("displays the active phase title in the current phase section", () => {
      renderChatPanel({ activePhaseId: "build" });

      expect(screen.getByText("Current phase: Build MVP")).toBeInTheDocument();
    });

    it("falls back to the first phase when the active phase id does not match", () => {
      renderChatPanel({ activePhaseId: "missing-phase" });

      expect(screen.getByText("Current phase: Discovery")).toBeInTheDocument();
    });
  });

  describe("PhaseTracker integration", () => {
    it("renders PhaseTracker with the correct props and toggles collapsed state", () => {
      const phases = createPhases();
      const { onSetActivePhase, onToggleTask } = renderChatPanel({
        phases,
        activePhaseId: "build",
      });

      expect(screen.getByTestId("phase-tracker")).toBeInTheDocument();
      expect(mockPhaseTracker).toHaveBeenCalled();

      const firstCallProps = mockPhaseTracker.mock.calls[0][0] as {
        phases: Phase[];
        activePhaseId: string;
        collapsed: boolean;
        onToggleCollapsed: () => void;
        onSetActivePhase: (phaseId: string) => void;
        onToggleTask: (phaseId: string, taskId: string) => void;
      };

      expect(firstCallProps.phases).toBe(phases);
      expect(firstCallProps.activePhaseId).toBe("build");
      expect(firstCallProps.collapsed).toBe(false);
      expect(firstCallProps.onSetActivePhase).toBe(onSetActivePhase);
      expect(firstCallProps.onToggleTask).toBe(onToggleTask);
      expect(firstCallProps.onToggleCollapsed).toEqual(expect.any(Function));
      expect(screen.getByText("collapsed: false")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Toggle collapsed" }));

      const lastCallProps = mockPhaseTracker.mock.calls.at(-1)?.[0] as {
        collapsed: boolean;
      };

      expect(lastCallProps.collapsed).toBe(true);
      expect(screen.getByText("collapsed: true")).toBeInTheDocument();
    });
  });

  describe("auto-scroll", () => {
    const getMessagesRegion = () => screen.getByTestId("chat-messages-region") as HTMLDivElement;

    const defineScrollHeight = (element: HTMLElement, getValue: () => number) => {
      Object.defineProperty(element, "scrollHeight", {
        configurable: true,
        get: getValue,
      });
    };

    it("scrolls the messages region to the latest content when messages change", async () => {
      const phases = createPhases();
      const onSendMessage = vi.fn();
      const onRemind = vi.fn();
      const onBrainstorm = vi.fn();
      const onResearch = vi.fn();
      const onToggleTask = vi.fn();
      const onSetActivePhase = vi.fn();

      const initialMessages = createMessages();

      const { rerender } = render(
        <ChatPanel
          messages={initialMessages}
          phases={phases}
          activePhaseId="build"
          activeArtifactLabel="Validation scorecard"
          activeArtifactType="validation-scorecard"
          activeArtifactHasOutput={false}
          activeArtifactChatMode="create"
          onSendMessage={onSendMessage}
          isLoading={false}
          onRemind={onRemind}
          onBrainstorm={onBrainstorm}
          onResearch={onResearch}
          onToggleTask={onToggleTask}
          onSetActivePhase={onSetActivePhase}
        />,
      );

      const messagesRegion = getMessagesRegion();
      const scrollTo = vi.fn();
      Object.defineProperty(messagesRegion, "scrollTo", { configurable: true, value: scrollTo });

      let scrollHeight = 200;
      defineScrollHeight(messagesRegion, () => scrollHeight);

      scrollTo.mockClear();

      scrollHeight = 500;
      const nextMessages: ChatMessage[] = [
        ...initialMessages,
        {
          id: "assistant-2",
          sender: "assistant",
          content: "Here's a follow-up question to refine the scope.",
          createdAt: "2024-01-01T00:02:00.000Z",
        },
      ];

      rerender(
        <ChatPanel
          messages={nextMessages}
          phases={phases}
          activePhaseId="build"
          activeArtifactLabel="Validation scorecard"
          activeArtifactType="validation-scorecard"
          activeArtifactHasOutput={false}
          activeArtifactChatMode="create"
          onSendMessage={onSendMessage}
          isLoading={false}
          onRemind={onRemind}
          onBrainstorm={onBrainstorm}
          onResearch={onResearch}
          onToggleTask={onToggleTask}
          onSetActivePhase={onSetActivePhase}
        />,
      );

      expect(screen.getByText("Here's a follow-up question to refine the scope.")).toBeInTheDocument();

      await waitFor(() => {
        expect(scrollTo).toHaveBeenCalled();
      });
    });

    it("scrolls the messages region when the last assistant message streams in place", async () => {
      const phases = createPhases();
      const onSendMessage = vi.fn();
      const onRemind = vi.fn();
      const onBrainstorm = vi.fn();
      const onResearch = vi.fn();
      const onToggleTask = vi.fn();
      const onSetActivePhase = vi.fn();

      const initialMessages: ChatMessage[] = [
        ...createMessages(),
        {
          id: "assistant-streaming",
          sender: "assistant",
          content: "Draft",
          createdAt: "2024-01-01T00:02:00.000Z",
        },
      ];

      const { rerender } = render(
        <ChatPanel
          messages={initialMessages}
          phases={phases}
          activePhaseId="build"
          activeArtifactLabel="Validation scorecard"
          activeArtifactType="validation-scorecard"
          activeArtifactHasOutput={false}
          activeArtifactChatMode="create"
          onSendMessage={onSendMessage}
          isLoading={true}
          onRemind={onRemind}
          onBrainstorm={onBrainstorm}
          onResearch={onResearch}
          onToggleTask={onToggleTask}
          onSetActivePhase={onSetActivePhase}
        />,
      );

      const messagesRegion = getMessagesRegion();
      const scrollTo = vi.fn();
      Object.defineProperty(messagesRegion, "scrollTo", { configurable: true, value: scrollTo });

      let scrollHeight = 320;
      defineScrollHeight(messagesRegion, () => scrollHeight);

      scrollTo.mockClear();

      scrollHeight = 560;
      const streamedMessages: ChatMessage[] = [
        ...initialMessages.slice(0, -1),
        {
          ...initialMessages[initialMessages.length - 1],
          content: "Draft with more streamed detail",
        },
      ];

      rerender(
        <ChatPanel
          messages={streamedMessages}
          phases={phases}
          activePhaseId="build"
          activeArtifactLabel="Validation scorecard"
          activeArtifactType="validation-scorecard"
          activeArtifactHasOutput={false}
          activeArtifactChatMode="create"
          onSendMessage={onSendMessage}
          isLoading={true}
          onRemind={onRemind}
          onBrainstorm={onBrainstorm}
          onResearch={onResearch}
          onToggleTask={onToggleTask}
          onSetActivePhase={onSetActivePhase}
        />,
      );

      expect(screen.getByText("Draft with more streamed detail")).toBeInTheDocument();

      await waitFor(() => {
        expect(scrollTo).toHaveBeenCalledWith({ top: 560 });
      });
    });

    it("scrolls the messages region to the latest content when the thinking indicator appears", async () => {
      const phases = createPhases();
      const onSendMessage = vi.fn();
      const onRemind = vi.fn();
      const onBrainstorm = vi.fn();
      const onResearch = vi.fn();
      const onToggleTask = vi.fn();
      const onSetActivePhase = vi.fn();

      const { rerender } = render(
        <ChatPanel
          messages={createMessages()}
          phases={phases}
          activePhaseId="build"
          activeArtifactLabel="Validation scorecard"
          activeArtifactType="validation-scorecard"
          activeArtifactHasOutput={false}
          activeArtifactChatMode="create"
          onSendMessage={onSendMessage}
          isLoading={false}
          onRemind={onRemind}
          onBrainstorm={onBrainstorm}
          onResearch={onResearch}
          onToggleTask={onToggleTask}
          onSetActivePhase={onSetActivePhase}
        />,
      );

      const messagesRegion = getMessagesRegion();
      const scrollTo = vi.fn();
      Object.defineProperty(messagesRegion, "scrollTo", { configurable: true, value: scrollTo });

      let scrollHeight = 300;
      defineScrollHeight(messagesRegion, () => scrollHeight);

      scrollTo.mockClear();

      scrollHeight = 420;
      rerender(
        <ChatPanel
          messages={createMessages()}
          phases={phases}
          activePhaseId="build"
          activeArtifactLabel="Validation scorecard"
          activeArtifactType="validation-scorecard"
          activeArtifactHasOutput={false}
          activeArtifactChatMode="create"
          onSendMessage={onSendMessage}
          isLoading={true}
          onRemind={onRemind}
          onBrainstorm={onBrainstorm}
          onResearch={onResearch}
          onToggleTask={onToggleTask}
          onSetActivePhase={onSetActivePhase}
        />,
      );

      expect(screen.getByLabelText("AI is thinking")).toBeInTheDocument();

      await waitFor(() => {
        expect(scrollTo).toHaveBeenCalled();
      });
    });
  });
});
