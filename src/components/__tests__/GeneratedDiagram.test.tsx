import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GeneratedDiagram from "@/components/GeneratedDiagram";
import type { ProjectDiagram } from "@/lib/types";

function createDiagram(): ProjectDiagram {
  return {
    nodes: [
      {
        id: "diagram-root",
        type: "topic",
        label: "Topic node",
        x: 100,
        y: 120,
        style: { color: "yellow", shape: "pill" },
      },
      {
        id: "branch:notes",
        type: "branch",
        label: "Branch node",
        x: 240,
        y: 180,
        style: { color: "blue", shape: "rounded_rect" },
      },
      {
        id: "detail:1",
        type: "detail",
        label: "Detail node",
        x: 380,
        y: 240,
      },
      {
        id: "reference:1",
        type: "reference",
        label: "Reference node",
        x: 520,
        y: 300,
        style: { color: "green", shape: "circle" },
      },
    ],
    edges: [],
    layout: {
      algorithm: "mind_map",
      direction: "horizontal",
      rootNodeId: "diagram-root",
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    drag: {
      snapToGrid: false,
      gridSize: 24,
      reparentOnDrop: true,
    },
  };
}

describe("GeneratedDiagram", () => {
  it("renders each node type with the expected styling variants", () => {
    render(<GeneratedDiagram diagram={createDiagram()} />);

    const [topicNode, branchNode, detailNode, referenceNode] = screen.getAllByTestId("generated-diagram-node");

    expect(topicNode).toHaveClass("rounded-full", "border-amber-300", "cursor-grab", "active:cursor-grabbing");
    expect(branchNode).toHaveClass("rounded-[24px]", "border-stone-300");
    expect(detailNode).toHaveClass("rounded-[24px]", "border-stone-200", "bg-white/90");
    expect(referenceNode).toHaveClass("rounded-[28px]", "bg-[#f7f2e7]/92");

    expect(() => fireEvent.pointerDown(topicNode, { pointerId: 1, clientX: 100, clientY: 120 })).not.toThrow();
  });

  it("forwards drag starts for diagram nodes", () => {
    const onNodeDragStart = vi.fn();
    const onParentPointerDown = vi.fn();

    render(
      <div onPointerDown={onParentPointerDown}>
        <GeneratedDiagram diagram={createDiagram()} onNodeDragStart={onNodeDragStart} />
      </div>,
    );

    fireEvent.pointerDown(screen.getByText("Reference node").closest("[data-diagram-node-id]")!, {
      pointerId: 4,
      pointerType: "touch",
      clientX: 520,
      clientY: 300,
    });

    expect(onNodeDragStart).toHaveBeenCalledTimes(1);
    expect(onNodeDragStart.mock.calls[0]?.[0]).toBe("reference:1");
    expect(onParentPointerDown).not.toHaveBeenCalled();
  });
});
