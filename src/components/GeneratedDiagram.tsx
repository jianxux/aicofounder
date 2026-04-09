"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { DiagramNode, ProjectDiagram } from "@/lib/types";

type GeneratedDiagramProps = {
  diagram: ProjectDiagram;
  onNodeDragStart?: (nodeId: string, event: ReactPointerEvent<HTMLElement>) => void;
};

function getNodeClasses(node: DiagramNode): string {
  if (node.type === "topic") {
    return "border-amber-300 bg-amber-100/90 text-stone-950 shadow-md";
  }

  if (node.type === "branch") {
    return "border-stone-300 bg-white/94 text-stone-900 shadow-sm";
  }

  if (node.type === "reference") {
    return "border-stone-200 bg-[#f7f2e7]/92 text-stone-700 shadow-sm";
  }

  return "border-stone-200 bg-white/90 text-stone-800 shadow-sm";
}

function getNodeShape(node: DiagramNode): string {
  if (node.style?.shape === "circle") {
    return "rounded-[28px]";
  }

  if (node.style?.shape === "pill") {
    return "rounded-full";
  }

  return "rounded-[24px]";
}

function getNodeWidth(node: DiagramNode): number {
  return node.width ?? (node.type === "topic" ? 260 : 220);
}

function getNodeMinHeight(node: DiagramNode): number {
  return node.height ?? 64;
}

export default function GeneratedDiagram({ diagram, onNodeDragStart = () => undefined }: GeneratedDiagramProps) {
  return (
    <div
      data-testid="generated-diagram"
      className="pointer-events-none absolute inset-0 z-0"
      aria-label="Generated project diagram"
    >
      {diagram.nodes.map((node) => (
        <article
          key={node.id}
          data-testid="generated-diagram-node"
          data-diagram-node-id={node.id}
          onPointerDown={(event) => {
            event.stopPropagation();
            onNodeDragStart(node.id, event);
          }}
          className={`pointer-events-auto absolute cursor-grab touch-none select-none border px-4 py-3 active:cursor-grabbing ${getNodeShape(node)} ${getNodeClasses(node)}`}
          style={{
            left: node.x,
            top: node.y,
            width: getNodeWidth(node),
            minHeight: getNodeMinHeight(node),
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="text-sm font-semibold leading-5">{node.label}</div>
          {node.content ? <p className="mt-1 text-xs leading-5 text-stone-600">{node.content}</p> : null}
        </article>
      ))}
    </div>
  );
}
