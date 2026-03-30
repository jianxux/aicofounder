import {
  getNextPhaseId,
  getPhaseAdvanceMessage,
  shouldAdvancePhase,
} from "@/lib/phases";
import type { Phase } from "@/lib/types";

function buildTask(index: number, done = false) {
  return {
    id: `task-${index}`,
    label: `Task ${index}`,
    done,
  };
}

function buildPhase(
  id: string,
  title: string,
  taskStates: boolean[] = [],
): Phase {
  return {
    id,
    title,
    tasks: taskStates.map((done, index) => buildTask(index + 1, done)),
  };
}

describe("getNextPhaseId", () => {
  it("returns next phase id when current is not the last", () => {
    const phases = [
      buildPhase("discovery", "Discovery", [true, false]),
      buildPhase("build", "Build", [false]),
      buildPhase("launch", "Launch", [false]),
    ];

    expect(getNextPhaseId(phases, "discovery")).toBe("build");
  });

  it("returns null when current is the last phase", () => {
    const phases = [
      buildPhase("discovery", "Discovery", [true]),
      buildPhase("launch", "Launch", [false]),
    ];

    expect(getNextPhaseId(phases, "launch")).toBeNull();
  });

  it("returns null when currentPhaseId doesn't exist in the array", () => {
    const phases = [
      buildPhase("discovery", "Discovery", [true]),
      buildPhase("build", "Build", [false]),
    ];

    expect(getNextPhaseId(phases, "missing")).toBeNull();
  });

  it("returns null for empty phases array", () => {
    expect(getNextPhaseId([], "discovery")).toBeNull();
  });

  it("works with exactly 2 phases", () => {
    const phases = [
      buildPhase("start", "Start", [true]),
      buildPhase("finish", "Finish", [false]),
    ];

    expect(getNextPhaseId(phases, "start")).toBe("finish");
  });
});

describe("shouldAdvancePhase", () => {
  it("returns true when all tasks in current phase are done and there is a next phase", () => {
    const phases = [
      buildPhase("discovery", "Discovery", [true, true]),
      buildPhase("build", "Build", [false]),
    ];

    expect(shouldAdvancePhase(phases, "discovery")).toBe(true);
  });

  it("returns false when not all tasks are done", () => {
    const phases = [
      buildPhase("discovery", "Discovery", [true, false]),
      buildPhase("build", "Build", [false]),
    ];

    expect(shouldAdvancePhase(phases, "discovery")).toBe(false);
  });

  it("returns false when all tasks done but it's the last phase", () => {
    const phases = [
      buildPhase("discovery", "Discovery", [true]),
      buildPhase("launch", "Launch", [true, true]),
    ];

    expect(shouldAdvancePhase(phases, "launch")).toBe(false);
  });

  it("returns false when currentPhaseId doesn't exist", () => {
    const phases = [
      buildPhase("discovery", "Discovery", [true]),
      buildPhase("build", "Build", [false]),
    ];

    expect(shouldAdvancePhase(phases, "missing")).toBe(false);
  });

  it("returns false for empty phases array", () => {
    expect(shouldAdvancePhase([], "discovery")).toBe(false);
  });

  it("returns true when phase has empty tasks array", () => {
    const phases = [
      buildPhase("discovery", "Discovery"),
      buildPhase("build", "Build", [false]),
    ];

    expect(shouldAdvancePhase(phases, "discovery")).toBe(true);
  });

  it("returns false when only some tasks are done", () => {
    const phases = [
      buildPhase("discovery", "Discovery", [false, true, true]),
      buildPhase("build", "Build", [false]),
    ];

    expect(shouldAdvancePhase(phases, "discovery")).toBe(false);
  });
});

describe("getPhaseAdvanceMessage", () => {
  it("returns correctly formatted message with both titles", () => {
    expect(getPhaseAdvanceMessage("Discovery", "Build")).toBe(
      `Great work! You've completed the "Discovery" phase. Let's move on to "Build" - here's where things get interesting.`,
    );
  });

  it("handles empty strings", () => {
    expect(getPhaseAdvanceMessage("", "")).toBe(
      `Great work! You've completed the "" phase. Let's move on to "" - here's where things get interesting.`,
    );
  });
});
