import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PhaseTracker from "@/components/PhaseTracker";
import type { Phase } from "@/lib/types";

const createPhases = (): Phase[] => [
  {
    id: "getting-started",
    title: "Getting started",
    tasks: [
      { id: "setup", label: "Set up project", done: true },
      { id: "brief", label: "Write project brief", done: false },
      { id: "scope", label: "Define scope", done: true },
    ],
  },
  {
    id: "build",
    title: "Build MVP",
    tasks: [
      { id: "ui", label: "Design UI", done: false },
      { id: "api", label: "Connect API", done: false },
    ],
  },
];

type RenderOptions = {
  phases?: Phase[];
  activePhaseId?: string;
  collapsed?: boolean;
};

const renderPhaseTracker = ({
  phases = createPhases(),
  activePhaseId = "getting-started",
  collapsed = false,
}: RenderOptions = {}) => {
  const onToggleCollapsed = vi.fn();
  const onSetActivePhase = vi.fn();
  const onToggleTask = vi.fn();

  render(
    <PhaseTracker
      phases={phases}
      activePhaseId={activePhaseId}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      onSetActivePhase={onSetActivePhase}
      onToggleTask={onToggleTask}
    />,
  );

  return { onToggleCollapsed, onSetActivePhase, onToggleTask };
};

describe("PhaseTracker", () => {
  describe("render basics", () => {
    it("renders headings, phase labels, titles, and progress counts", () => {
      renderPhaseTracker();

      expect(screen.getByText("Progress")).toBeInTheDocument();
      expect(screen.getByText("Phase tracker")).toBeInTheDocument();
      expect(screen.getByText("Phase 1")).toBeInTheDocument();
      expect(screen.getByText("Phase 2")).toBeInTheDocument();
      expect(screen.getByText("Getting started (2 of 3 done)")).toBeInTheDocument();
      expect(screen.getByText("Build MVP")).toBeInTheDocument();
      expect(screen.getByText("2/3")).toBeInTheDocument();
      expect(screen.getByText("0/2")).toBeInTheDocument();
    });

    it("renders an empty phases array without crashing", () => {
      renderPhaseTracker({ phases: [] });

      expect(screen.getByText("Progress")).toBeInTheDocument();
      expect(screen.getByText("Phase tracker")).toBeInTheDocument();
      expect(screen.queryByText(/Phase \d+/)).not.toBeInTheDocument();
    });
  });

  describe("collapse and expand", () => {
    it("shows Collapse when expanded and calls onToggleCollapsed", () => {
      const { onToggleCollapsed } = renderPhaseTracker({ collapsed: false });

      const button = screen.getByRole("button", { name: "Collapse" });

      expect(button).toBeInTheDocument();

      fireEvent.click(button);

      expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
    });

    it("shows Expand when collapsed", () => {
      renderPhaseTracker({ collapsed: true });

      expect(screen.getByRole("button", { name: "Expand" })).toBeInTheDocument();
    });
  });

  describe("active phase and tasks", () => {
    it("shows only the active phase tasks when not collapsed and matches checkbox state", () => {
      const { onToggleTask } = renderPhaseTracker({
        activePhaseId: "getting-started",
        collapsed: false,
      });

      const completedTask = screen.getByLabelText("Set up project");
      const incompleteTask = screen.getByLabelText("Write project brief");

      expect(completedTask).toBeChecked();
      expect(incompleteTask).not.toBeChecked();
      expect(screen.getByText("Define scope")).toBeInTheDocument();
      expect(screen.queryByLabelText("Design UI")).not.toBeInTheDocument();

      fireEvent.click(incompleteTask);

      expect(onToggleTask).toHaveBeenCalledTimes(1);
      expect(onToggleTask).toHaveBeenCalledWith("getting-started", "brief");
    });

    it("does not show tasks when collapsed even if the phase is active", () => {
      renderPhaseTracker({
        activePhaseId: "getting-started",
        collapsed: true,
      });

      expect(screen.queryByLabelText("Set up project")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Write project brief")).not.toBeInTheDocument();
    });

    it("does not show tasks for phases that are not active", () => {
      renderPhaseTracker({
        activePhaseId: "build",
        collapsed: false,
      });

      expect(screen.getByLabelText("Design UI")).toBeInTheDocument();
      expect(screen.getByLabelText("Connect API")).toBeInTheDocument();
      expect(screen.queryByLabelText("Set up project")).not.toBeInTheDocument();
    });
  });

  describe("set active phase", () => {
    it("calls onSetActivePhase with the clicked phase id and applies active styling", () => {
      const { onSetActivePhase } = renderPhaseTracker({
        activePhaseId: "getting-started",
      });

      const gettingStartedButton = screen.getByRole("button", {
        name: /Phase 1\s+Getting started \(2 of 3 done\)\s+2\/3/i,
      });
      const buildButton = screen.getByRole("button", {
        name: /Phase 2\s+Build MVP\s+0\/2/i,
      });

      const activeCard = gettingStartedButton.parentElement;
      const inactiveCard = buildButton.parentElement;

      expect(activeCard).toHaveClass("border-stone-900");
      expect(inactiveCard).toHaveClass("border-stone-200");

      fireEvent.click(buildButton);

      expect(onSetActivePhase).toHaveBeenCalledTimes(1);
      expect(onSetActivePhase).toHaveBeenCalledWith("build");
    });
  });

  describe("getting-started special format", () => {
    it("shows the done summary only for the getting-started phase", () => {
      renderPhaseTracker();

      expect(screen.getByText("Getting started (2 of 3 done)")).toBeInTheDocument();
      expect(screen.getByText("Build MVP")).toBeInTheDocument();
      expect(screen.queryByText(/Build MVP \(\d+ of \d+ done\)/)).not.toBeInTheDocument();
    });
  });

  describe("task styling", () => {
    it("applies line-through only to completed tasks", () => {
      renderPhaseTracker({
        activePhaseId: "getting-started",
        collapsed: false,
      });

      expect(screen.getByText("Set up project")).toHaveClass("line-through");
      expect(screen.getByText("Define scope")).toHaveClass("line-through");
      expect(screen.getByText("Write project brief")).not.toHaveClass("line-through");
    });
  });

  describe("edge cases", () => {
    it("renders a phase with no tasks without crashing and shows the correct count", () => {
      renderPhaseTracker({
        phases: [
          {
            id: "empty-phase",
            title: "Empty phase",
            tasks: [],
          },
        ],
        activePhaseId: "empty-phase",
        collapsed: false,
      });

      expect(screen.getByText("Phase 1")).toBeInTheDocument();
      expect(screen.getByText("Empty phase")).toBeInTheDocument();
      expect(screen.getByText("0/0")).toBeInTheDocument();
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("shows the correct count when all tasks are done", () => {
      renderPhaseTracker({
        phases: [
          {
            id: "getting-started",
            title: "Getting started",
            tasks: [
              { id: "one", label: "First", done: true },
              { id: "two", label: "Second", done: true },
            ],
          },
        ],
        activePhaseId: "getting-started",
        collapsed: false,
      });

      expect(screen.getByText("Getting started (2 of 2 done)")).toBeInTheDocument();
      expect(screen.getByText("2/2")).toBeInTheDocument();
      expect(screen.getByLabelText("First")).toBeChecked();
      expect(screen.getByLabelText("Second")).toBeChecked();
    });
  });
});
