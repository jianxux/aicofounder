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
        source: { type: "canvas_item", itemKind: "document", itemId: "doc-1" },
        links: [
          { type: "canvas_item", itemKind: "document", itemId: "doc-1" },
          { type: "artifact", artifactId: "artifact-customer-research-memo", artifactType: "customer-research-memo" },
        ],
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
    edges: [
      { id: "edge:root->branch", from: "diagram-root", to: "branch:notes", type: "parent_child" },
      { id: "edge:branch->detail", from: "branch:notes", to: "detail:1", type: "association" },
    ],
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

  it("renders an edge layer behind nodes and styles supported edge types", () => {
    render(<GeneratedDiagram diagram={createDiagram()} />);

    const edgeLayer = screen.getByTestId("generated-diagram-edge-layer");
    const edges = screen.getAllByTestId("generated-diagram-edge");
    const parentChildEdge = edgeLayer.querySelector('[data-diagram-edge-id="edge:root->branch"]');
    const associationEdge = edgeLayer.querySelector('[data-diagram-edge-id="edge:branch->detail"]');

    expect(edgeLayer).toHaveClass("pointer-events-none");
    expect(edges).toHaveLength(2);
    expect(parentChildEdge).toHaveAttribute("d", "M 100 120 C 230 120 110 180 240 180");
    expect(parentChildEdge).toHaveAttribute("stroke-width", "2.5");
    expect(parentChildEdge).not.toHaveAttribute("stroke-dasharray");
    expect(associationEdge).toHaveAttribute("stroke-dasharray", "8 8");
  });

  it("skips edges that reference missing nodes and renders no edge layer for empty lists", () => {
    const diagramWithMissingEdge = createDiagram();

    diagramWithMissingEdge.edges = [
      { id: "edge:missing", from: "diagram-root", to: "missing-node", type: "parent_child" },
    ];

    const { rerender } = render(<GeneratedDiagram diagram={diagramWithMissingEdge} />);

    expect(screen.queryByTestId("generated-diagram-edge-layer")).not.toBeInTheDocument();
    expect(screen.queryByTestId("generated-diagram-edge")).not.toBeInTheDocument();

    rerender(
      <GeneratedDiagram
        diagram={{
          ...createDiagram(),
          edges: [],
        }}
      />,
    );

    expect(screen.queryByTestId("generated-diagram-edge-layer")).not.toBeInTheDocument();
  });

  it("uses the same node size defaults and custom dimensions for rendered geometry", () => {
    const diagram = createDiagram();
    diagram.nodes = [
      { ...diagram.nodes[0], x: 100, y: 120, width: 320, height: 120 },
      { ...diagram.nodes[1], x: 100, y: 360, height: 96 },
    ];
    diagram.edges = [{ id: "edge:vertical", from: "diagram-root", to: "branch:notes", type: "parent_child" }];

    render(<GeneratedDiagram diagram={diagram} />);

    const [topicNode, branchNode] = screen.getAllByTestId("generated-diagram-node");
    const edge = screen.getByTestId("generated-diagram-edge");

    expect(topicNode).toHaveStyle({ width: "320px", minHeight: "120px" });
    expect(branchNode).toHaveStyle({ width: "220px", minHeight: "96px" });
    expect(edge).toHaveAttribute("d", "M 100 120 C 100 204 100 276 100 360");
  });

  it("renders machine-readable source and link metadata on nodes", () => {
    render(<GeneratedDiagram diagram={createDiagram()} />);

    const detailNode = screen.getByText("Detail node").closest("[data-diagram-node-id]");

    expect(detailNode).toHaveAttribute(
      "data-diagram-node-source",
      JSON.stringify({ type: "canvas_item", itemKind: "document", itemId: "doc-1" }),
    );
    expect(detailNode).toHaveAttribute("data-diagram-source-type", "canvas_item");
    expect(detailNode).toHaveAttribute("data-diagram-source-item-kind", "document");
    expect(detailNode).toHaveAttribute("data-diagram-source-item-id", "doc-1");
    expect(detailNode).toHaveAttribute(
      "data-diagram-node-links",
      JSON.stringify([
        { type: "canvas_item", itemKind: "document", itemId: "doc-1" },
        { type: "artifact", artifactId: "artifact-customer-research-memo", artifactType: "customer-research-memo" },
      ]),
    );
  });
});
