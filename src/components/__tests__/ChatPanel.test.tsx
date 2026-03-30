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
};

const renderChatPanel = ({
  messages = createMessages(),
  phases = createPhases(),
  activePhaseId = "build",
}: RenderOptions = {}) => {
  const onSendMessage = vi.fn();
  const onRemind = vi.fn();
  const onToggleTask = vi.fn();
  const onSetActivePhase = vi.fn();

  render(
    <ChatPanel
      messages={messages}
      phases={phases}
      activePhaseId={activePhaseId}
      onSendMessage={onSendMessage}
      onRemind={onRemind}
      onToggleTask={onToggleTask}
      onSetActivePhase={onSetActivePhase}
    />,
  );

  return { onSendMessage, onRemind, onToggleTask, onSetActivePhase };
};

describe("ChatPanel", () => {
  beforeEach(() => {
    mockPhaseTracker.mockClear();
  });

  describe("render basics", () => {
    it("renders the header label and subtitle", () => {
      renderChatPanel();

      expect(screen.getByText("AI Cofounder")).toBeInTheDocument();
      expect(screen.getByText("Research and build your product")).toBeInTheDocument();
    });

    it("renders user messages with user styling", () => {
      renderChatPanel();

      const bubble = screen.getByText("Build me a landing page");
      const row = bubble.parentElement;

      expect(bubble).toHaveClass("bg-sky-600");
      expect(row).toHaveClass("justify-end");
    });

    it("renders assistant messages with assistant styling", () => {
      renderChatPanel();

      const bubble = screen.getByText("Let's define the target audience first.");
      const row = bubble.parentElement;

      expect(bubble).toHaveClass("bg-stone-100");
      expect(row).toHaveClass("justify-start");
    });

    it("renders an empty messages list without crashing", () => {
      renderChatPanel({ messages: [] });

      expect(screen.getByText("AI Cofounder")).toBeInTheDocument();
      expect(screen.queryByText("Build me a landing page")).not.toBeInTheDocument();
      expect(screen.queryByText("Let's define the target audience first.")).not.toBeInTheDocument();
    });
  });

  describe("message form", () => {
    it("updates the draft value when typing into the textarea", () => {
      renderChatPanel();

      const textarea = screen.getByPlaceholderText(
        "Tell your AI cofounder what you want to explore next...",
      );

      fireEvent.change(textarea, { target: { value: "New idea" } });

      expect(textarea).toHaveValue("New idea");
    });

    it("submits trimmed text, calls onSendMessage, and clears the textarea", () => {
      const { onSendMessage } = renderChatPanel();
      const textarea = screen.getByPlaceholderText(
        "Tell your AI cofounder what you want to explore next...",
      );
      const form = screen.getByRole("button", { name: "Send" }).closest("form");

      fireEvent.change(textarea, { target: { value: "  Validate this market  " } });
      fireEvent.submit(form!);

      expect(onSendMessage).toHaveBeenCalledTimes(1);
      expect(onSendMessage).toHaveBeenCalledWith("Validate this market");
      expect(textarea).toHaveValue("");
    });

    it("does not submit empty or whitespace-only drafts", () => {
      const { onSendMessage } = renderChatPanel();
      const textarea = screen.getByPlaceholderText(
        "Tell your AI cofounder what you want to explore next...",
      );
      const form = screen.getByRole("button", { name: "Send" }).closest("form");

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
