import { fireEvent, render, screen } from "@testing-library/react";
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

type RenderOptions = {
  messages?: ChatMessage[];
  phases?: Phase[];
  activePhaseId?: string;
  isLoading?: boolean;
  activeArtifactLabel?: string;
  activeArtifactType?: "validation-scorecard" | "customer-research-memo";
  activeArtifactHasOutput?: boolean;
};

const renderChatPanel = ({
  messages = createMessages(),
  phases = createPhases(),
  activePhaseId = "build",
  isLoading = false,
  activeArtifactLabel = "Validation scorecard",
  activeArtifactType = "validation-scorecard",
  activeArtifactHasOutput = false,
}: RenderOptions = {}) => {
  const onSendMessage = vi.fn();
  const onRemind = vi.fn();
  const onBrainstorm = vi.fn();
  const onResearch = vi.fn();
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
      onSendMessage={onSendMessage}
      isLoading={isLoading}
      onRemind={onRemind}
      onBrainstorm={onBrainstorm}
      onResearch={onResearch}
      onToggleTask={onToggleTask}
      onSetActivePhase={onSetActivePhase}
    />,
  );

  return { onSendMessage, onRemind, onBrainstorm, onResearch, onToggleTask, onSetActivePhase };
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

      expect(screen.getByText("Update the customer research memo")).toBeInTheDocument();
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
      expect(screen.getAllByText("Refine mode")).toHaveLength(2);
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
      expect(screen.getByRole("button", { name: "Update memo" })).toBeInTheDocument();
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

    it("shows the typing indicator when isLoading is true", () => {
      renderChatPanel({ isLoading: true });

      expect(screen.getByLabelText("AI is thinking")).toBeInTheDocument();
    });

    it("disables the textarea and send button when isLoading is true", () => {
      renderChatPanel({ isLoading: true, activeArtifactHasOutput: true });

      expect(
        screen.getByPlaceholderText("Add evidence, scores, or next validation checks for the scorecard..."),
      ).toBeDisabled();
      expect(screen.getByRole("button", { name: "Update scorecard" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Submit structured refinement" })).toBeDisabled();
      expect(screen.getByLabelText("Strongest signal")).toBeDisabled();
      expect(screen.getByRole("button", { name: /brainstorm pain points/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /update customer research memo/i })).toBeDisabled();
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
});
