import { describe, expect, it } from "vitest";
import { getDiagramEdgePath } from "@/components/generatedDiagramGeometry";
import type { DiagramEdge, DiagramNode } from "@/lib/types";

function createNodesById(nodes: DiagramNode[]) {
  return new Map(nodes.map((node) => [node.id, node]));
}

function createEdge(from: string, to: string): DiagramEdge {
  return {
    id: `${from}->${to}`,
    from,
    to,
    type: "parent_child",
  };
}

describe("generatedDiagramGeometry", () => {
  it("uses a vertical curve for radial layouts when vertical distance dominates", () => {
    const nodesById = createNodesById([
      { id: "from", type: "topic", label: "From", x: 100, y: 100 },
      { id: "to", type: "detail", label: "To", x: 160, y: 260 },
    ]);

    expect(getDiagramEdgePath(createEdge("from", "to"), nodesById, "radial")).toBe(
      "M 100 100 C 100 156 160 204 160 260",
    );
  });

  it("uses a horizontal curve for radial layouts when distances tie", () => {
    const nodesById = createNodesById([
      { id: "from", type: "topic", label: "From", x: 100, y: 100 },
      { id: "to", type: "detail", label: "To", x: 180, y: 180 },
    ]);

    expect(getDiagramEdgePath(createEdge("from", "to"), nodesById, "radial")).toBe(
      "M 100 100 C 230 100 50 180 180 180",
    );
  });

  it("falls back to positive control directions when nodes share the same axis", () => {
    const horizontalNodesById = createNodesById([
      { id: "from", type: "topic", label: "From", x: 200, y: 220 },
      { id: "to", type: "detail", label: "To", x: 200, y: 220 },
    ]);

    const verticalNodesById = createNodesById([
      { id: "from", type: "topic", label: "From", x: 240, y: 180 },
      { id: "to", type: "detail", label: "To", x: 320, y: 180 },
    ]);

    expect(getDiagramEdgePath(createEdge("from", "to"), horizontalNodesById, "horizontal")).toBe(
      "M 200 220 C 330 220 70 220 200 220",
    );
    expect(getDiagramEdgePath(createEdge("from", "to"), verticalNodesById, "vertical")).toBe(
      "M 240 180 C 240 220 320 140 320 180",
    );
  });
});
