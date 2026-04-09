import type { DiagramEdge, DiagramEdgeType, DiagramNode, ProjectDiagram } from "@/lib/types";

const DEFAULT_TOPIC_NODE_WIDTH = 260;
const DEFAULT_DIAGRAM_NODE_WIDTH = 220;
const DEFAULT_DIAGRAM_NODE_HEIGHT = 64;

type DiagramDirection = ProjectDiagram["layout"]["direction"];

export function getDiagramNodeWidth(node: DiagramNode): number {
  return node.width ?? (node.type === "topic" ? DEFAULT_TOPIC_NODE_WIDTH : DEFAULT_DIAGRAM_NODE_WIDTH);
}

export function getDiagramNodeHeight(node: DiagramNode): number {
  return node.height ?? DEFAULT_DIAGRAM_NODE_HEIGHT;
}

function getDiagramNodeBounds(node: DiagramNode) {
  const width = getDiagramNodeWidth(node);
  const height = getDiagramNodeHeight(node);

  return {
    centerX: node.x,
    centerY: node.y,
    width,
    height,
  };
}

export function getDiagramEdgePath(
  edge: DiagramEdge,
  nodesById: ReadonlyMap<string, DiagramNode>,
  direction: DiagramDirection,
): string | null {
  const fromNode = nodesById.get(edge.from);
  const toNode = nodesById.get(edge.to);

  if (!fromNode || !toNode) {
    return null;
  }

  const fromBounds = getDiagramNodeBounds(fromNode);
  const toBounds = getDiagramNodeBounds(toNode);
  const deltaX = toBounds.centerX - fromBounds.centerX;
  const deltaY = toBounds.centerY - fromBounds.centerY;
  const useVerticalCurve = direction === "vertical" || Math.abs(deltaY) > Math.abs(deltaX);

  if (useVerticalCurve) {
    const directionY = deltaY === 0 ? 1 : Math.sign(deltaY);
    const controlOffsetY = Math.max(40, fromBounds.height / 2, toBounds.height / 2, Math.abs(deltaY) * 0.35);

    return [
      `M ${fromBounds.centerX} ${fromBounds.centerY}`,
      `C ${fromBounds.centerX} ${fromBounds.centerY + directionY * controlOffsetY}`,
      `${toBounds.centerX} ${toBounds.centerY - directionY * controlOffsetY}`,
      `${toBounds.centerX} ${toBounds.centerY}`,
    ].join(" ");
  }

  const directionX = deltaX === 0 ? 1 : Math.sign(deltaX);
  const controlOffsetX = Math.max(48, fromBounds.width / 2, toBounds.width / 2, Math.abs(deltaX) * 0.35);

  return [
    `M ${fromBounds.centerX} ${fromBounds.centerY}`,
    `C ${fromBounds.centerX + directionX * controlOffsetX} ${fromBounds.centerY}`,
    `${toBounds.centerX - directionX * controlOffsetX} ${toBounds.centerY}`,
    `${toBounds.centerX} ${toBounds.centerY}`,
  ].join(" ");
}

export function getDiagramEdgePresentation(type: DiagramEdgeType) {
  if (type === "association") {
    return {
      className: "stroke-stone-400/80",
      dashArray: "8 8",
      strokeWidth: 2,
    };
  }

  return {
    className: "stroke-stone-500/70",
    dashArray: undefined,
    strokeWidth: 2.5,
  };
}
