import type {
  CustomerResearchMemoArtifact,
  DiagramDragMetadata,
  DiagramEdge,
  DiagramNode,
  NoteColor,
  ProjectDiagram,
  ResearchMemoEntity,
  ResearchMemoSharedState,
  ResearchMemoViewLayout,
} from "@/lib/types";

const ROOT_NODE_ID = "research-memo-map-root";
const DEFAULT_DRAG: DiagramDragMetadata = {
  snapToGrid: false,
  gridSize: 24,
  reparentOnDrop: false,
};

const ENTITY_COLORS: Record<ResearchMemoEntity["kind"], NoteColor> = {
  summary: "yellow",
  section: "blue",
  finding: "green",
  contradiction: "pink",
  question: "purple",
  source: "blue",
  error: "pink",
};

function compactText(value: string | undefined, maxLength = 150) {
  const normalized = value?.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function getProjectFactValue(sharedState: ResearchMemoSharedState, key: string) {
  return sharedState.projectFacts.find((fact) => fact.key === key)?.value;
}

function getOrderedLayouts(sharedState: ResearchMemoSharedState): ResearchMemoViewLayout[] {
  const entityIds = new Set(sharedState.entities.map((entity) => entity.id));
  const diagramLayouts = sharedState.views.find((view) => view.view === "diagram")?.layouts ?? [];

  if (diagramLayouts.length > 0) {
    return diagramLayouts.filter((layout) => entityIds.has(layout.entityId));
  }

  return sharedState.entities.map((entity, index) => ({
    entityId: entity.id,
    order: index,
  }));
}

function createNode(input: {
  id: string;
  type: DiagramNode["type"];
  label: string;
  content?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: NoteColor;
  parentId?: string;
  order?: number;
}): DiagramNode {
  return {
    id: input.id,
    type: input.type,
    label: input.label,
    content: input.content,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    source: { type: "generated" },
    style: {
      color: input.color,
      shape: input.type === "topic" ? "pill" : input.type === "reference" ? "circle" : "rounded_rect",
    },
    layout:
      input.parentId || typeof input.order === "number"
        ? {
            parentId: input.parentId,
            order: input.order,
          }
        : undefined,
  };
}

function createEdge(from: string, to: string): DiagramEdge {
  return {
    id: `edge:${from}->${to}`,
    from,
    to,
    type: "parent_child",
  };
}

function createEntityNode(entity: ResearchMemoEntity, layout: ResearchMemoViewLayout, index: number): DiagramNode {
  const lane = index % 2 === 0 ? -1 : 1;
  const row = Math.floor(index / 2);
  const fallbackX = 880 + lane * 360;
  const fallbackY = 520 + row * 150;
  const isReference = entity.kind === "source";

  return createNode({
    id: `research-memo-map:${entity.id}`,
    type: isReference ? "reference" : "detail",
    label: entity.title,
    content: compactText(entity.content, isReference ? 90 : 150),
    x: layout.x ?? fallbackX,
    y: layout.y ?? fallbackY,
    width: isReference ? 220 : 270,
    height: isReference ? 70 : 94,
    color: ENTITY_COLORS[entity.kind],
    parentId: ROOT_NODE_ID,
    order: layout.order ?? index,
  });
}

export function buildResearchMemoCanvasMap(artifact: CustomerResearchMemoArtifact | null): ProjectDiagram {
  const sharedState = artifact?.sharedState;
  const rootLabel = artifact?.title?.trim() || "Customer research memo";
  const rootContent = sharedState
    ? compactText(
        getProjectFactValue(sharedState, "research-question") ??
          getProjectFactValue(sharedState, "project-description") ??
          "Memo-linked canvas map",
        170,
      )
    : "Memo-linked canvas map";
  const rootNode = createNode({
    id: ROOT_NODE_ID,
    type: "topic",
    label: rootLabel,
    content: rootContent,
    x: 880,
    y: 320,
    width: 280,
    height: 96,
    color: "yellow",
  });

  if (!sharedState) {
    return {
      nodes: [rootNode],
      edges: [],
      layout: {
        algorithm: "mind_map",
        direction: "horizontal",
        rootNodeId: ROOT_NODE_ID,
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      drag: DEFAULT_DRAG,
    };
  }

  const entitiesById = new Map(sharedState.entities.map((entity) => [entity.id, entity]));
  const orderedLayouts = getOrderedLayouts(sharedState).sort(
    (left, right) =>
      (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) ||
      left.entityId.localeCompare(right.entityId),
  );
  const entityNodes = orderedLayouts
    .map((layout, index) => {
      const entity = entitiesById.get(layout.entityId);
      return entity ? createEntityNode(entity, layout, index) : null;
    })
    .filter((node): node is DiagramNode => node !== null);

  return {
    nodes: [rootNode, ...entityNodes],
    edges: entityNodes.map((node) => createEdge(ROOT_NODE_ID, node.id)),
    layout: {
      algorithm: "mind_map",
      direction: "horizontal",
      rootNodeId: ROOT_NODE_ID,
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    drag: DEFAULT_DRAG,
  };
}

export function summarizeResearchMemoCanvasMap(artifact: CustomerResearchMemoArtifact | null) {
  const sharedState = artifact?.sharedState;

  return {
    nodeCount: sharedState?.entities.length ?? 0,
    sourceCount: sharedState?.sourceRefs.length ?? 0,
    evidenceCount: sharedState?.evidenceRefs.length ?? 0,
    updatedAt: sharedState?.updatedAt ?? artifact?.updatedAt,
  };
}
