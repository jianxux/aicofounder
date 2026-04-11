import type { BrainstormResult } from "@/lib/brainstorm";
import {
  getProjectArtifactByType,
  normalizeProject,
  type ResearchMemoEntity,
  type ResearchMemoViewLayout,
} from "@/lib/types";
import type {
  DiagramDragMetadata,
  DiagramEdge,
  DiagramLayoutMetadata,
  DiagramLinkedCanvasItemKind,
  DiagramNode,
  DiagramNodeShape,
  DiagramNodeSource,
  NoteColor,
  Phase,
  Project,
  ProjectDiagram,
} from "@/lib/types";

type GeneratedDiagramOptions = {
  brainstormResult?: BrainstormResult | null;
};

type BranchDefinition = {
  id: string;
  label: string;
  x: number;
  y: number;
  color: NoteColor;
  shape?: DiagramNodeShape;
};

type BranchItem = {
  id: string;
  label: string;
  content?: string;
  kind: "detail" | "reference";
  source?: DiagramNodeSource;
};

const ROOT_NODE_ID = "diagram-root";
const DEFAULT_LAYOUT_VIEWPORT = {
  x: 0,
  y: 0,
  zoom: 1,
} as const;
const DEFAULT_DRAG: DiagramDragMetadata = {
  snapToGrid: false,
  gridSize: 24,
  reparentOnDrop: true,
};

const BRANCHES: BranchDefinition[] = [
  { id: "phase_tasks", label: "Phase & tasks", x: 1440, y: 360, color: "blue" },
  { id: "notes", label: "Notes", x: 520, y: 360, color: "yellow" },
  { id: "documents", label: "Documents", x: 520, y: 840, color: "green" },
  { id: "website_builders", label: "Website builders", x: 1440, y: 840, color: "pink" },
  { id: "research", label: "Research", x: 520, y: 1320, color: "purple" },
  { id: "brainstorm", label: "Brainstorm", x: 1440, y: 1320, color: "blue" },
];

function compactText(value: string | undefined | null, maxLength = 160): string | undefined {
  const normalized = value?.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function getCurrentPhase(project: Project): Phase | null {
  return project.phases.find((phase) => phase.title === project.phase) ?? project.phases[0] ?? null;
}

function createEdge(from: string, to: string): DiagramEdge {
  return {
    id: `edge:${from}->${to}`,
    from,
    to,
    type: "parent_child",
  };
}

function createNode(input: {
  id: string;
  type: DiagramNode["type"];
  label: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color?: NoteColor;
  shape?: DiagramNodeShape;
  source?: DiagramNodeSource;
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
    source: input.source,
    style:
      input.color || input.shape
        ? {
            color: input.color,
            shape: input.shape,
          }
        : undefined,
    layout:
      input.parentId || typeof input.order === "number"
        ? {
            parentId: input.parentId,
            order: input.order,
          }
        : undefined,
  };
}

function createCanvasItemSource(itemKind: DiagramLinkedCanvasItemKind, itemId: string): DiagramNodeSource {
  return {
    type: "canvas_item",
    itemKind,
    itemId,
  };
}

function getPhaseTaskItems(project: Project): BranchItem[] {
  const currentPhase = getCurrentPhase(project);
  const completedTasks = currentPhase?.tasks.filter((task) => task.done).length ?? 0;
  const items: BranchItem[] = [];

  if (currentPhase) {
    items.push({
      id: `phase:${currentPhase.id}`,
      label: currentPhase.title,
      content: `${completedTasks}/${currentPhase.tasks.length} tasks complete`,
      kind: "detail",
    });

    currentPhase.tasks.slice(0, 4).forEach((task) => {
      items.push({
        id: `task:${task.id}`,
        label: task.label,
        content: task.done ? "Completed task" : "Open task",
        kind: "detail",
      });
    });
  }

  [...project.messages]
    .filter((message) => message.sender === "user" && message.content.trim())
    .slice(-3)
    .forEach((message, index) => {
      items.push({
        id: `message:${message.id}`,
        label: `User context ${index + 1}`,
        content: compactText(message.content, 140),
        kind: "reference",
      });
    });

  return items;
}

function getNoteItems(project: Project): BranchItem[] {
  const noteItems = project.notes.slice(0, 5).map<BranchItem>((note) => ({
    id: `note:${note.id}`,
    label: note.title.trim() || "Untitled note",
    content: compactText(note.content, 120),
    kind: "detail",
    source: createCanvasItemSource("note", note.id),
  }));

  const sectionItems = (project.sections ?? []).slice(0, 3).map<BranchItem>((section) => ({
    id: `section:${section.id}`,
    label: section.title.trim() || "Untitled section",
    content: "Canvas section",
    kind: "reference",
    source: createCanvasItemSource("section", section.id),
  }));

  return [...noteItems, ...sectionItems];
}

function getDocumentItems(project: Project): BranchItem[] {
  return project.documents.slice(0, 4).map((document) => ({
    id: `document:${document.id}`,
    label: document.title.trim() || "Untitled document",
    content: compactText(document.content, 120),
    kind: "detail" as const,
    source: createCanvasItemSource("document", document.id),
  }));
}

function getWebsiteBuilderItems(project: Project): BranchItem[] {
  return (project.websiteBuilders ?? []).slice(0, 4).map((websiteBuilder) => ({
    id: `website:${websiteBuilder.id}`,
    label: websiteBuilder.title.trim() || "Untitled website",
    content: compactText(websiteBuilder.blocks.map((block) => block.heading).join(" • "), 120),
    kind: "detail" as const,
    source: createCanvasItemSource("website_builder", websiteBuilder.id),
  }));
}

function getResearchItems(project: Project): BranchItem[] {
  const normalizedProject = normalizeProject(project);
  const artifact = getProjectArtifactByType(normalizedProject, "customer-research-memo");

  if (!artifact || artifact.type !== "customer-research-memo") {
    return [];
  }

  const entityById = new Map(artifact.sharedState.entities.map((entity) => [entity.id, entity]));
  const diagramView = artifact.sharedState.views.find((view) => view.view === "diagram");

  if (!diagramView) {
    return [];
  }

  return diagramView.layouts
    .slice()
    .sort((left, right) => (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER))
    .map((layout) => getResearchBranchItem(layout, entityById))
    .filter((item): item is BranchItem => item !== null);
}

function getResearchBranchItem(
  layout: ResearchMemoViewLayout,
  entityById: Map<string, ResearchMemoEntity>,
): BranchItem | null {
  const entity = entityById.get(layout.entityId);

  if (!entity) {
    return null;
  }

  return {
    id: entity.id,
    label: entity.title,
    content: compactText(entity.content, entity.kind === "source" ? 80 : 160),
    kind: entity.kind === "source" ? "reference" : "detail",
  };
}

function getBrainstormItems(brainstormResult?: BrainstormResult | null): BranchItem[] {
  if (!brainstormResult) {
    return [];
  }

  const items: BranchItem[] = [];
  const summary = compactText(brainstormResult.summary, 160);

  if (summary) {
    items.push({
      id: "brainstorm:summary",
      label: "Summary",
      content: summary,
      kind: "detail",
    });
  }

  brainstormResult.painPoints.slice(0, 4).forEach((painPoint) => {
    items.push({
      id: `brainstorm:pain-point:${painPoint.id}`,
      label: painPoint.title,
      content: compactText(`${painPoint.description} Source: ${painPoint.source}.`, 140),
      kind: "detail",
    });
  });

  return items;
}

function getBranchItems(project: Project, options: GeneratedDiagramOptions): Record<string, BranchItem[]> {
  return {
    phase_tasks: getPhaseTaskItems(project),
    notes: getNoteItems(project),
    documents: getDocumentItems(project),
    website_builders: getWebsiteBuilderItems(project),
    research: getResearchItems(project),
    brainstorm: getBrainstormItems(options.brainstormResult),
  };
}

function createLayout(existingDiagram: Project["diagram"], rootNodeId: string): DiagramLayoutMetadata {
  const isExistingMindMap = existingDiagram?.layout.algorithm === "mind_map";

  return {
    algorithm: "mind_map",
    direction: isExistingMindMap ? existingDiagram.layout.direction : "horizontal",
    rootNodeId,
    viewport: existingDiagram?.layout.viewport ?? DEFAULT_LAYOUT_VIEWPORT,
  };
}

function createDrag(existingDiagram: Project["diagram"]): DiagramDragMetadata {
  return existingDiagram?.drag ?? DEFAULT_DRAG;
}

function applyPersistedNodePosition(node: DiagramNode, existingDiagram: Project["diagram"]): DiagramNode {
  const persistedNode = existingDiagram?.nodes.find((entry) => entry.id === node.id);

  if (!persistedNode) {
    return node;
  }

  return {
    ...node,
    x: persistedNode.x,
    y: persistedNode.y,
  };
}

export function generateProjectDiagram(project: Project, options: GeneratedDiagramOptions = {}): ProjectDiagram {
  const applyExistingPosition = (node: DiagramNode) => applyPersistedNodePosition(node, project.diagram);
  const branchItems = getBranchItems(project, options);
  const nodes: DiagramNode[] = [
    applyExistingPosition(
      createNode({
        id: ROOT_NODE_ID,
        type: "topic",
        label: project.name.trim() || "Untitled project",
        content: compactText(project.description, 180),
        x: 980,
        y: 840,
        width: 260,
        height: 100,
        color: "yellow",
        shape: "pill",
        source: { type: "generated" },
      }),
    ),
  ];
  const edges: DiagramEdge[] = [];

  BRANCHES.forEach((branch, branchIndex) => {
    const branchId = `branch:${branch.id}`;

    nodes.push(
      applyExistingPosition(
        createNode({
          id: branchId,
          type: "branch",
          label: branch.label,
          x: branch.x,
          y: branch.y,
          width: 220,
          height: 70,
          color: branch.color,
          shape: branch.shape ?? "rounded_rect",
          source: { type: "generated" },
          parentId: ROOT_NODE_ID,
          order: branchIndex,
        }),
      ),
    );
    edges.push(createEdge(ROOT_NODE_ID, branchId));

    const items = branchItems[branch.id] ?? [];
    const direction = branch.x >= 980 ? 1 : -1;
    const detailX = branch.x + direction * 320;
    const referenceX = branch.x + direction * 620;
    const startY = branch.y - ((items.length - 1) * 124) / 2;

    items.forEach((item, itemIndex) => {
      const itemId = `${branchId}:${item.id}`;
      const itemY = startY + itemIndex * 124;

      nodes.push(
        applyExistingPosition(
          createNode({
            id: itemId,
            type: item.kind,
            label: item.label,
            content: item.content,
            x: item.kind === "reference" ? referenceX : detailX,
            y: itemY,
            width: item.kind === "reference" ? 220 : 250,
            height: item.kind === "reference" ? 64 : 84,
            color: branch.color,
            shape: item.kind === "reference" ? "circle" : "rounded_rect",
            source: item.source ?? { type: "generated" },
            parentId: branchId,
            order: itemIndex,
          }),
        ),
      );
      edges.push(createEdge(branchId, itemId));
    });
  });

  return {
    nodes,
    edges,
    layout: createLayout(project.diagram, ROOT_NODE_ID),
    drag: createDrag(project.diagram),
  };
}
