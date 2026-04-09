"use client";

import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { useEffect, useRef, useState } from "react";
import DocumentCard from "@/components/DocumentCard";
import GeneratedDiagram from "@/components/GeneratedDiagram";
import Section from "@/components/Section";
import StickyNote from "@/components/StickyNote";
import WebsiteBuilder from "@/components/WebsiteBuilder";
import type {
  DocumentCardData,
  NoteColor,
  ProjectDiagram,
  SectionData,
  StickyNoteData,
  WebsiteBuilderData,
} from "@/lib/types";

type CanvasProps = {
  notes: StickyNoteData[];
  documents: DocumentCardData[];
  sections?: SectionData[];
  websiteBuilders?: WebsiteBuilderData[];
  diagram?: ProjectDiagram;
  onChangeNotes: (notes: StickyNoteData[]) => void;
  onChangeDocuments: (documents: DocumentCardData[]) => void;
  onChangeSections?: (sections: SectionData[]) => void;
  onChangeWebsiteBuilders?: (websiteBuilders: WebsiteBuilderData[]) => void;
  onChangeDiagram?: (diagram: ProjectDiagram) => void;
  onNoteCreated?: (note: StickyNoteData) => void;
  onNoteDragged?: (note: StickyNoteData) => void;
};

type DragState = {
  itemId: string;
  type: "note" | "document" | "section" | "website" | "diagram";
  offsetX: number;
  offsetY: number;
  width?: number;
  height?: number;
} | null;

type PanDragState = {
  startX: number;
  startY: number;
  originPanX: number;
  originPanY: number;
} | null;

const NOTE_COLORS: Array<{ color: NoteColor; bgClass: string }> = [
  { color: "yellow", bgClass: "bg-amber-200" },
  { color: "blue", bgClass: "bg-sky-200" },
  { color: "green", bgClass: "bg-emerald-200" },
  { color: "pink", bgClass: "bg-pink-200" },
  { color: "purple", bgClass: "bg-violet-200" },
];

function createNote(color: NoteColor) {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`,
    title: "New note",
    content: "Capture an insight, a research question, or a next step here.",
    color,
    x: 180,
    y: 180,
  };
}

function createDocument() {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`,
    title: "New Document",
    content: "# Getting Started\n\nWrite your ideas here...",
    x: 220,
    y: 220,
  };
}

function createSection(color: NoteColor): SectionData {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`,
    title: "New section",
    color,
    x: 140,
    y: 140,
    width: 300,
    height: 200,
  };
}

function createWebsiteBuilder(): WebsiteBuilderData {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`,
    title: "Startup landing page",
    blocks: [
      {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-hero`,
        type: "hero",
        heading: "Explain your startup in one sentence",
        body: "Describe the customer, the problem, and the outcome your product creates.",
        buttonText: "Join the waitlist",
      },
    ],
    x: 260,
    y: 260,
  };
}

function clampCanvasCoordinate(value: number): number {
  return Math.max(12, value);
}

function getDiagramNodeWidth(node: NonNullable<ProjectDiagram["nodes"]>[number]): number {
  return node.width ?? (node.type === "topic" ? 260 : 220);
}

function getDiagramNodeHeight(node: NonNullable<ProjectDiagram["nodes"]>[number]): number {
  return node.height ?? 64;
}

function clampDiagramCoordinate(value: number, size: number): number {
  return Math.max(12 + size / 2, value);
}

function updateDiagramNodePosition(
  diagram: ProjectDiagram | undefined,
  nodeId: string,
  x: number,
  y: number,
): ProjectDiagram | undefined {
  if (!diagram) {
    return undefined;
  }

  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => (node.id === nodeId ? { ...node, x, y } : node)),
  };
}

export default function Canvas({
  notes,
  documents,
  sections = [],
  websiteBuilders = [],
  diagram,
  onChangeNotes,
  onChangeDocuments,
  onChangeSections = () => undefined,
  onChangeWebsiteBuilders = () => undefined,
  onChangeDiagram = () => undefined,
  onNoteCreated = () => undefined,
  onNoteDragged = () => undefined,
}: CanvasProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const notesRef = useRef(notes);
  const dragStateRef = useRef<DragState>(null);
  const diagramDraftRef = useRef<ProjectDiagram | undefined>(diagram);
  const pendingDiagramCommitRef = useRef<ProjectDiagram | undefined>(undefined);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [dragState, setDragState] = useState<DragState>(null);
  const [panDragState, setPanDragState] = useState<PanDragState>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [selectedColor, setSelectedColor] = useState<NoteColor>("yellow");
  const [diagramDraft, setDiagramDraft] = useState(diagram);
  const didDragRef = useRef(false);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    diagramDraftRef.current = diagramDraft;
  }, [diagramDraft]);

  useEffect(() => {
    if (dragStateRef.current?.type === "diagram") {
      return;
    }

    pendingDiagramCommitRef.current = undefined;
    setDiagramDraft(diagram);
  }, [diagram]);

  const commitPendingDiagramDrag = () => {
    const pendingDiagram = pendingDiagramCommitRef.current;

    if (!pendingDiagram) {
      return;
    }

    pendingDiagramCommitRef.current = undefined;
    onChangeDiagram(pendingDiagram);
  };

  const clearPointerInteraction = (pointerId?: number) => {
    if (pointerId !== undefined && activePointerIdRef.current !== null && pointerId !== activePointerIdRef.current) {
      return;
    }

    activePointerIdRef.current = null;

    const currentDragState = dragStateRef.current;

    if (currentDragState?.type === "note" && didDragRef.current) {
      const note = notesRef.current.find((entry) => entry.id === currentDragState.itemId);

      if (note) {
        onNoteDragged(note);
      }
    }

    if (currentDragState?.type === "diagram") {
      commitPendingDiagramDrag();
    }

    didDragRef.current = false;
    setDragState(null);
    setPanDragState(null);
  };

  useEffect(() => {
    if (!dragState && !panDragState) {
      return;
    }

    const handleMove = (event: PointerEvent) => {
      if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) {
        return;
      }

      const board = boardRef.current;

      if (!board) {
        return;
      }

      if (panDragState) {
        setPanX(panDragState.originPanX + (event.clientX - panDragState.startX) / zoom);
        setPanY(panDragState.originPanY + (event.clientY - panDragState.startY) / zoom);
        return;
      }

      if (!dragState) {
        return;
      }

      const rect = board.getBoundingClientRect();
      let nextX = (event.clientX - rect.left - dragState.offsetX) / zoom - panX;
      let nextY = (event.clientY - rect.top - dragState.offsetY) / zoom - panY;

      if (dragState.type === "note") {
        nextX = clampCanvasCoordinate(nextX);
        nextY = clampCanvasCoordinate(nextY);
        didDragRef.current = true;
        onChangeNotes(
          notes.map((note) =>
            note.id === dragState.itemId
              ? {
                  ...note,
                  x: nextX,
                  y: nextY,
                }
              : note,
          ),
        );
        return;
      }

      if (dragState.type === "section") {
        nextX = clampCanvasCoordinate(nextX);
        nextY = clampCanvasCoordinate(nextY);
        onChangeSections(
          sections.map((section) =>
            section.id === dragState.itemId
              ? {
                  ...section,
                  x: nextX,
                  y: nextY,
                }
              : section,
          ),
        );
        return;
      }

      if (dragState.type === "website") {
        nextX = clampCanvasCoordinate(nextX);
        nextY = clampCanvasCoordinate(nextY);
        onChangeWebsiteBuilders(
          websiteBuilders.map((websiteBuilder) =>
            websiteBuilder.id === dragState.itemId
              ? {
                  ...websiteBuilder,
                  x: nextX,
                  y: nextY,
                }
              : websiteBuilder,
          ),
        );
        return;
      }

      if (dragState.type === "diagram") {
        nextX = clampDiagramCoordinate(nextX, dragState.width ?? 0);
        nextY = clampDiagramCoordinate(nextY, dragState.height ?? 0);
        const nextDiagram = updateDiagramNodePosition(diagramDraftRef.current, dragState.itemId, nextX, nextY);

        if (nextDiagram) {
          pendingDiagramCommitRef.current = nextDiagram;
          setDiagramDraft(nextDiagram);
        }

        return;
      }

      nextX = clampCanvasCoordinate(nextX);
      nextY = clampCanvasCoordinate(nextY);
      onChangeDocuments(
        documents.map((document) =>
          document.id === dragState.itemId
            ? {
                ...document,
                x: nextX,
                y: nextY,
              }
            : document,
        ),
      );
    };

    const handleUp = (event: PointerEvent) => {
      clearPointerInteraction(event.pointerId);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [
    documents,
    dragState,
    notes,
    onChangeDocuments,
    onChangeDiagram,
    onChangeNotes,
    onChangeSections,
    onChangeWebsiteBuilders,
    onNoteDragged,
    panDragState,
    panX,
    panY,
    sections,
    websiteBuilders,
    zoom,
    diagram,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        const target = event.target as HTMLElement | null;
        const tagName = target?.tagName;
        const isEditableTarget =
          tagName === "INPUT" || tagName === "TEXTAREA" || target?.isContentEditable === true;

        if (!isEditableTarget) {
          event.preventDefault();
        }

        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    const handleBlur = () => {
      setIsSpacePressed(false);
      clearPointerInteraction();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  const handleDragStart = (
    type: "note" | "document" | "section" | "website" | "diagram",
    itemId: string,
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (event.button !== 0 || isSpacePressed) {
      return;
    }

    const board = boardRef.current;

    if (!board) {
      return;
    }

    const rect = board.getBoundingClientRect();
    const diagramNode = type === "diagram" ? diagram?.nodes.find((entry) => entry.id === itemId) : undefined;
    const item =
      type === "note"
        ? notes.find((entry) => entry.id === itemId)
        : type === "section"
          ? sections.find((entry) => entry.id === itemId)
          : type === "website"
            ? websiteBuilders.find((entry) => entry.id === itemId)
            : type === "diagram"
              ? diagramNode
          : documents.find((entry) => entry.id === itemId);

    if (!item) {
      return;
    }
    const nodeRect = diagramNode ? event.currentTarget.getBoundingClientRect() : null;

    activePointerIdRef.current = event.pointerId;
    didDragRef.current = false;

    setDragState({
      itemId,
      type,
      offsetX: event.clientX - rect.left - (item.x + panX) * zoom,
      offsetY: event.clientY - rect.top - (item.y + panY) * zoom,
      width:
        diagramNode
          ? nodeRect && nodeRect.width > 0
            ? nodeRect.width / zoom
            : getDiagramNodeWidth(diagramNode)
          : undefined,
      height:
        diagramNode
          ? nodeRect && nodeRect.height > 0
            ? nodeRect.height / zoom
            : getDiagramNodeHeight(diagramNode)
          : undefined,
    });
  };

  const startPan = (clientX: number, clientY: number) => {
    setPanDragState({
      startX: clientX,
      startY: clientY,
      originPanX: panX,
      originPanY: panY,
    });
  };

  const handleBoardPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const tagName = target?.tagName;
    const isEditableTarget =
      tagName === "INPUT" || tagName === "TEXTAREA" || target?.isContentEditable === true;

    if (event.pointerType === "touch" && !isEditableTarget) {
      activePointerIdRef.current = event.pointerId;
      startPan(event.clientX, event.clientY);
      return;
    }

    if (event.button === 1) {
      event.preventDefault();
      activePointerIdRef.current = event.pointerId;
      startPan(event.clientX, event.clientY);
      return;
    }

    if (event.button === 0 && isSpacePressed && !isEditableTarget) {
      event.preventDefault();
      activePointerIdRef.current = event.pointerId;
      startPan(event.clientX, event.clientY);
    }
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    const horizontalDelta = event.deltaX || (event.shiftKey ? event.deltaY : 0);
    const verticalDelta = event.deltaX ? event.deltaY : event.shiftKey ? 0 : event.deltaY;

    setPanX((current) => current - horizontalDelta / zoom);
    setPanY((current) => current - verticalDelta / zoom);
  };

  const handleNoteChange = (noteId: string, patch: Partial<StickyNoteData>) => {
    onChangeNotes(notes.map((note) => (note.id === noteId ? { ...note, ...patch } : note)));
  };

  const handleDocumentChange = (documentId: string, patch: Partial<DocumentCardData>) => {
    onChangeDocuments(
      documents.map((document) => (document.id === documentId ? { ...document, ...patch } : document)),
    );
  };

  const handleSectionChange = (sectionId: string, patch: Partial<SectionData>) => {
    onChangeSections(sections.map((section) => (section.id === sectionId ? { ...section, ...patch } : section)));
  };

  const handleWebsiteBuilderChange = (websiteBuilderId: string, patch: Partial<WebsiteBuilderData>) => {
    onChangeWebsiteBuilders(
      websiteBuilders.map((websiteBuilder) =>
        websiteBuilder.id === websiteBuilderId ? { ...websiteBuilder, ...patch } : websiteBuilder,
      ),
    );
  };

  const deleteNote = (noteId: string) => {
    onChangeNotes(notes.filter((note) => note.id !== noteId));
  };

  const deleteDocument = (documentId: string) => {
    onChangeDocuments(documents.filter((document) => document.id !== documentId));
  };

  const deleteSection = (sectionId: string) => {
    onChangeSections(sections.filter((section) => section.id !== sectionId));
  };

  const deleteWebsiteBuilder = (websiteBuilderId: string) => {
    onChangeWebsiteBuilders(websiteBuilders.filter((websiteBuilder) => websiteBuilder.id !== websiteBuilderId));
  };

  const addNote = () => {
    const note = createNote(selectedColor);
    onChangeNotes([...notes, note]);
    onNoteCreated(note);
  };

  const addDocument = () => {
    onChangeDocuments([...documents, createDocument()]);
  };

  const addSection = () => {
    onChangeSections([...sections, createSection(selectedColor)]);
  };

  const addWebsiteBuilder = () => {
    onChangeWebsiteBuilders([...websiteBuilders, createWebsiteBuilder()]);
  };

  return (
    <div className="relative h-full min-h-[400px] overflow-hidden rounded-[28px] border border-stone-200 bg-[#faf7f2] shadow-sm md:min-h-[520px]">
      <div
        ref={boardRef}
        data-testid="canvas-board"
        onPointerDown={handleBoardPointerDown}
        onWheel={handleWheel}
        className={`absolute inset-0 overflow-hidden rounded-[28px] touch-none bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_transparent_36%),linear-gradient(180deg,_rgba(255,255,255,0.55),_rgba(250,247,242,1))] ${
          panDragState ? "cursor-grabbing" : isSpacePressed ? "cursor-grab" : "cursor-default"
        }`}
      >
        <div
          data-testid="canvas-surface"
          className="relative min-h-[2400px] min-w-[2400px]"
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {diagramDraft ? (
            <GeneratedDiagram
              diagram={diagramDraft}
              onNodeDragStart={(nodeId, event) => handleDragStart("diagram", nodeId, event)}
            />
          ) : null}
          {sections.map((section) => (
            <Section
              key={section.id}
              section={section}
              onChange={handleSectionChange}
              onDelete={deleteSection}
              onDragStart={(sectionId, event) => handleDragStart("section", sectionId, event)}
            />
          ))}
          {notes.map((note) => (
            <StickyNote
              key={note.id}
              note={note}
              onChange={handleNoteChange}
              onDelete={deleteNote}
              onDragStart={(noteId, event) => handleDragStart("note", noteId, event)}
            />
          ))}
          {documents.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              onChange={handleDocumentChange}
              onDelete={deleteDocument}
              onDragStart={(documentId, event) => handleDragStart("document", documentId, event)}
            />
          ))}
          {websiteBuilders.map((websiteBuilder) => (
            <WebsiteBuilder
              key={websiteBuilder.id}
              websiteBuilder={websiteBuilder}
              onChange={handleWebsiteBuilderChange}
              onDelete={deleteWebsiteBuilder}
              onDragStart={(websiteBuilderId, event) => handleDragStart("website", websiteBuilderId, event)}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-5 right-5 flex items-center gap-2 rounded-full border border-stone-200 bg-white/95 p-2 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          {NOTE_COLORS.map(({ color, bgClass }) => (
            <button
              key={color}
              type="button"
              aria-label={`Select ${color} note color`}
              onClick={() => setSelectedColor(color)}
              className={`h-6 w-6 rounded-full ${bgClass} cursor-pointer transition ${
                selectedColor === color ? "ring-2 ring-offset-2 ring-stone-400" : ""
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addNote}
          className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
        >
          +
        </button>
        <button
          type="button"
          onClick={addDocument}
          className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
        >
          Doc
        </button>
        <button
          type="button"
          onClick={addSection}
          className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
        >
          Section
        </button>
        <button
          type="button"
          onClick={addWebsiteBuilder}
          className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
        >
          Website
        </button>
        <button
          type="button"
          onClick={() => setZoom((current) => Math.max(0.8, Number((current - 0.1).toFixed(1))))}
          className="rounded-full border border-stone-200 px-3 py-2 text-sm text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
        >
          -
        </button>
        <div className="min-w-14 text-center text-sm font-medium text-stone-600">{Math.round(zoom * 100)}%</div>
        <button
          type="button"
          onClick={() => {
            setPanX(0);
            setPanY(0);
            setZoom(1);
          }}
          className="rounded-full border border-stone-200 px-3 py-2 text-sm text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
        >
          Reset view
        </button>
        <button
          type="button"
          onClick={() => setZoom((current) => Math.min(1.4, Number((current + 0.1).toFixed(1))))}
          className="rounded-full border border-stone-200 px-3 py-2 text-sm text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
        >
          +
        </button>
      </div>
    </div>
  );
}
