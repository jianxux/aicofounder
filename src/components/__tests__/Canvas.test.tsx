import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Canvas from "@/components/Canvas";
import type { DocumentCardData, ProjectDiagram, SectionData, StickyNoteData, WebsiteBuilderData } from "@/lib/types";

const createNote = (overrides: Partial<StickyNoteData> = {}): StickyNoteData => ({
  id: "note-1",
  title: "Launch plan",
  content: "Validate the onboarding flow",
  color: "yellow",
  x: 120,
  y: 240,
  ...overrides,
});

const createNotes = (): StickyNoteData[] => [
  createNote(),
  createNote({
    id: "note-2",
    title: "Research",
    content: "Interview 5 target users",
    x: 320,
    y: 180,
  }),
];

const createDocument = (overrides: Partial<DocumentCardData> = {}): DocumentCardData => ({
  id: "doc-1",
  title: "My Document",
  content: "# Hello\n\nSome **bold** text",
  x: 100,
  y: 200,
  ...overrides,
});

const createSection = (overrides: Partial<SectionData> = {}): SectionData => ({
  id: "section-1",
  title: "Research Cluster",
  color: "yellow",
  x: 140,
  y: 160,
  width: 320,
  height: 220,
  ...overrides,
});

const createWebsiteBuilder = (overrides: Partial<WebsiteBuilderData> = {}): WebsiteBuilderData => ({
  id: "website-1",
  title: "Landing Page",
  blocks: [
    {
      id: "website-block-1",
      type: "hero",
      heading: "Ship faster",
      body: "Launch with confidence.",
      buttonText: "Start",
    },
  ],
  x: 180,
  y: 200,
  ...overrides,
});

const createDiagram = (): ProjectDiagram => ({
  nodes: [
    {
      id: "diagram-root",
      type: "topic",
      label: "Launchpad",
      content: "AI planning workspace",
      x: 980,
      y: 840,
      width: 260,
      height: 100,
      source: { type: "generated" },
      style: { color: "yellow", shape: "pill" },
    },
    {
      id: "branch:research",
      type: "branch",
      label: "Research",
      x: 520,
      y: 1320,
      width: 220,
      height: 70,
      source: { type: "generated" },
      style: { color: "purple", shape: "rounded_rect" },
      layout: { parentId: "diagram-root", order: 0 },
    },
    {
      id: "branch:research:summary",
      type: "detail",
      label: "Executive summary",
      content: "Evidence points to fragmented founder workflows.",
      x: 200,
      y: 1320,
      width: 250,
      height: 84,
      source: { type: "generated" },
      style: { color: "purple", shape: "rounded_rect" },
      layout: { parentId: "branch:research", order: 0 },
    },
  ],
  edges: [
    { id: "edge:diagram-root->branch:research", from: "diagram-root", to: "branch:research", type: "parent_child" },
    {
      id: "edge:branch:research->branch:research:summary",
      from: "branch:research",
      to: "branch:research:summary",
      type: "parent_child",
    },
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
});

function CanvasStateHarness({
  initialNotes = [],
  initialDocuments = [],
  initialSections = [],
  initialDiagram,
}: {
  initialNotes?: StickyNoteData[];
  initialDocuments?: DocumentCardData[];
  initialSections?: SectionData[];
  initialDiagram?: ProjectDiagram;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [documents, setDocuments] = useState(initialDocuments);
  const [sections, setSections] = useState(initialSections);
  const [diagram, setDiagram] = useState(initialDiagram);

  return (
    <Canvas
      notes={notes}
      documents={documents}
      sections={sections}
      diagram={diagram}
      onChangeNotes={setNotes}
      onChangeDocuments={setDocuments}
      onChangeSections={setSections}
      onChangeDiagram={setDiagram}
    />
  );
}

describe("Canvas", () => {
  const getZoomOutButton = () => screen.getByRole("button", { name: "-" });
  const getBoard = () => screen.getByTestId("canvas-board");
  const getSurface = () => screen.getByTestId("canvas-surface");

  const getZoomInButton = () =>
    screen
      .getAllByRole("button", { name: "+" })
      .find((button) => !button.className.includes("bg-stone-950"));

  const mockBoardRect = (board: Element) => {
    vi.spyOn(board, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      right: 900,
      bottom: 1200,
      width: 900,
      height: 1200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  };

  beforeEach(() => {
    Object.defineProperty(globalThis, "crypto", {
      value: {
        randomUUID: vi.fn(() => "mock-uuid-1"),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all provided sticky notes", () => {
    render(
      <Canvas
        notes={createNotes()}
        documents={[]}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("Launch plan")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Research")).toBeInTheDocument();
  });

  it("renders delete buttons for notes, documents, and sections", () => {
    render(
      <Canvas
        notes={[createNote()]}
        documents={[createDocument()]}
        sections={[createSection()]}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
        onChangeSections={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Delete note" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete document" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete section" })).toBeInTheDocument();
  });

  it("shows the default zoom level text", () => {
    render(
      <Canvas
        notes={createNotes()}
        documents={[]}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
      />,
    );

    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("calls onChangeNotes with an added note when the add button is clicked", () => {
    const notes = createNotes();
    const onChangeNotes = vi.fn();

    render(
      <Canvas
        notes={notes}
        documents={[]}
        onChangeNotes={onChangeNotes}
        onChangeDocuments={vi.fn()}
      />,
    );

    const addButton = screen
      .getAllByRole("button", { name: "+" })
      .find((button) => button.className.includes("bg-stone-950"));

    expect(addButton).toBeDefined();

    fireEvent.click(addButton!);

    expect(onChangeNotes).toHaveBeenCalledTimes(1);
    expect(onChangeNotes.mock.calls[0]?.[0]).toHaveLength(notes.length + 1);
    expect(onChangeNotes.mock.calls[0]?.[0]).toEqual([
      ...notes,
      {
        id: "mock-uuid-1",
        title: "New note",
        content: "Capture an insight, a research question, or a next step here.",
        color: "yellow",
        x: 180,
        y: 180,
      },
    ]);
  });

  it("renders the full color picker with yellow selected by default", () => {
    render(
      <Canvas
        notes={createNotes()}
        documents={[]}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
      />,
    );

    const yellowButton = screen.getByRole("button", { name: "Select yellow note color" });

    expect(yellowButton).toHaveClass("bg-amber-200", "ring-2", "ring-offset-2", "ring-stone-400");
    expect(screen.getByRole("button", { name: "Select blue note color" })).toHaveClass("bg-sky-200");
    expect(screen.getByRole("button", { name: "Select green note color" })).toHaveClass("bg-emerald-200");
    expect(screen.getByRole("button", { name: "Select pink note color" })).toHaveClass("bg-pink-200");
    expect(screen.getByRole("button", { name: "Select purple note color" })).toHaveClass("bg-violet-200");
  });

  it("updates the selected color when a color circle is clicked", () => {
    render(
      <Canvas
        notes={createNotes()}
        documents={[]}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
      />,
    );

    const yellowButton = screen.getByRole("button", { name: "Select yellow note color" });
    const pinkButton = screen.getByRole("button", { name: "Select pink note color" });

    fireEvent.click(pinkButton);

    expect(pinkButton).toHaveClass("ring-2", "ring-offset-2", "ring-stone-400");
    expect(yellowButton).not.toHaveClass("ring-2");
  });

  it("creates new notes with the selected color", () => {
    const notes = createNotes();
    const onChangeNotes = vi.fn();

    render(
      <Canvas
        notes={notes}
        documents={[]}
        onChangeNotes={onChangeNotes}
        onChangeDocuments={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select blue note color" }));

    const addButton = screen
      .getAllByRole("button", { name: "+" })
      .find((button) => button.className.includes("bg-stone-950"));

    expect(addButton).toBeDefined();

    fireEvent.click(addButton!);

    expect(onChangeNotes).toHaveBeenCalledWith([
      ...notes,
      {
        id: "mock-uuid-1",
        title: "New note",
        content: "Capture an insight, a research question, or a next step here.",
        color: "blue",
        x: 180,
        y: 180,
      },
    ]);
  });

  it("falls back to Date.now for the note id when crypto.randomUUID is unavailable", () => {
    const notes = createNotes();
    const onChangeNotes = vi.fn();

    Object.defineProperty(globalThis, "crypto", {
      value: {},
      configurable: true,
    });

    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(1234567890);

    render(
      <Canvas
        notes={notes}
        documents={[]}
        onChangeNotes={onChangeNotes}
        onChangeDocuments={vi.fn()}
      />,
    );

    const addButton = screen
      .getAllByRole("button", { name: "+" })
      .find((button) => button.className.includes("bg-stone-950"));

    expect(addButton).toBeDefined();

    fireEvent.click(addButton!);

    expect(dateNowSpy).toHaveBeenCalled();
    expect(onChangeNotes).toHaveBeenCalledTimes(1);
    expect(onChangeNotes.mock.calls[0]?.[0]).toEqual([
      ...notes,
      {
        id: "1234567890",
        title: "New note",
        content: "Capture an insight, a research question, or a next step here.",
        color: "yellow",
        x: 180,
        y: 180,
      },
    ]);
    expect(onChangeNotes.mock.calls[0]?.[0]?.[2]?.id).toMatch(/^\d+$/);
  });

  it("updates the zoom display to 90% when zooming out", () => {
    render(
      <Canvas
        notes={createNotes()}
        documents={[]}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
      />,
    );

    fireEvent.click(getZoomOutButton());

    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("updates the zoom display to 110% when zooming in", () => {
    render(
      <Canvas
        notes={createNotes()}
        documents={[]}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
      />,
    );

    const zoomInButton = getZoomInButton();

    expect(zoomInButton).toBeDefined();

    fireEvent.click(zoomInButton!);

    expect(screen.getByText("110%")).toBeInTheDocument();
  });

  it("does not zoom out below 80%", () => {
    render(
      <Canvas
        notes={createNotes()}
        documents={[]}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
      />,
    );

    const zoomOutButton = getZoomOutButton();

    fireEvent.click(zoomOutButton);
    fireEvent.click(zoomOutButton);
    fireEvent.click(zoomOutButton);
    fireEvent.click(zoomOutButton);
    fireEvent.click(zoomOutButton);

    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.queryByText("70%")).not.toBeInTheDocument();
  });

  it("does not zoom in above 140%", () => {
    render(
      <Canvas
        notes={createNotes()}
        documents={[]}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
      />,
    );

    const zoomInButton = getZoomInButton();

    expect(zoomInButton).toBeDefined();

    fireEvent.click(zoomInButton!);
    fireEvent.click(zoomInButton!);
    fireEvent.click(zoomInButton!);
    fireEvent.click(zoomInButton!);
    fireEvent.click(zoomInButton!);

    expect(screen.getByText("140%")).toBeInTheDocument();
    expect(screen.queryByText("150%")).not.toBeInTheDocument();
  });

  it("renders the canvas board container div", () => {
    render(
      <Canvas
        notes={createNotes()}
        documents={[]}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
      />,
    );

    expect(getBoard()).toBeInTheDocument();
  });

  it("renders generated diagram content on the canvas without removing existing items", () => {
    render(
      <Canvas
        notes={[createNote()]}
        documents={[]}
        diagram={createDiagram()}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
      />,
    );

    expect(screen.getByTestId("generated-diagram")).toBeInTheDocument();
    expect(screen.getByText("Launchpad")).toBeInTheDocument();
    expect(screen.getByText("Research")).toBeInTheDocument();
    expect(screen.getByText("Executive summary")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Launch plan")).toBeInTheDocument();
  });

  it("updates diagram node coordinates after dragging a generated node", () => {
    const diagram = createDiagram();
    const onChangeDiagram = vi.fn();

    render(
      <Canvas
        notes={[]}
        documents={[]}
        diagram={diagram}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
        onChangeDiagram={onChangeDiagram}
      />,
    );

    const board = getBoard();
    mockBoardRect(board);
    const researchBranch = screen
      .getAllByTestId("generated-diagram-node")
      .find((node) => node.getAttribute("data-diagram-node-id") === "branch:research");

    expect(researchBranch).toBeDefined();

    fireEvent.pointerDown(researchBranch!, { pointerId: 1, clientX: 540, clientY: 1340 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 620, clientY: 1420 }));
    });

    expect(onChangeDiagram).not.toHaveBeenCalled();
    expect(researchBranch).toHaveStyle({
      left: "600px",
      top: "1400px",
    });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    });

    expect(onChangeDiagram).toHaveBeenCalledWith({
      ...diagram,
      nodes: diagram.nodes.map((node) =>
        node.id === "branch:research"
          ? {
              ...node,
              x: 600,
              y: 1400,
            }
          : node,
      ),
    });
  });

  it("keeps rendered diagram edges aligned while a generated node is dragged", () => {
    render(<CanvasStateHarness initialDiagram={createDiagram()} />);

    const board = getBoard();
    mockBoardRect(board);
    const researchBranch = screen
      .getAllByTestId("generated-diagram-node")
      .find((node) => node.getAttribute("data-diagram-node-id") === "branch:research");
    const edge = screen
      .getByTestId("generated-diagram-edge-layer")
      .querySelector('[data-diagram-edge-id="edge:diagram-root->branch:research"]');

    expect(researchBranch).toBeDefined();
    expect(edge).toHaveAttribute("d", "M 980 840 C 980 1008 520 1152 520 1320");

    fireEvent.pointerDown(researchBranch!, { pointerId: 1, clientX: 540, clientY: 1340 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 620, clientY: 1420 }));
    });

    expect(edge).toHaveAttribute("d", "M 980 840 C 980 1036 600 1204 600 1400");

    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    });
  });

  it("clamps generated diagram node dragging using centered diagram node bounds", () => {
    const diagram = createDiagram();
    const onChangeDiagram = vi.fn();

    render(
      <Canvas
        notes={[]}
        documents={[]}
        diagram={diagram}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
        onChangeDiagram={onChangeDiagram}
      />,
    );

    const board = getBoard();
    mockBoardRect(board);
    const rootNode = screen
      .getAllByTestId("generated-diagram-node")
      .find((node) => node.getAttribute("data-diagram-node-id") === "diagram-root");

    fireEvent.pointerDown(rootNode!, { pointerId: 1, clientX: 1000, clientY: 860 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 1, clientY: 1 }));
    });

    expect(rootNode).toHaveStyle({
      left: "142px",
      top: "62px",
    });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    });

    expect(onChangeDiagram).toHaveBeenCalledWith({
      ...diagram,
      nodes: diagram.nodes.map((node) =>
        node.id === "diagram-root"
          ? {
              ...node,
              x: 142,
              y: 62,
            }
          : node,
      ),
    });
  });

  it("keeps generated diagram dragging correct when the canvas has a non-zero pan offset", () => {
    render(<CanvasStateHarness initialDiagram={createDiagram()} />);

    const board = getBoard();
    mockBoardRect(board);

    fireEvent.wheel(board, { shiftKey: true, deltaY: -40 });
    fireEvent.wheel(board, { deltaY: -30 });

    const rootNode = screen
      .getAllByTestId("generated-diagram-node")
      .find((node) => node.getAttribute("data-diagram-node-id") === "diagram-root");

    fireEvent.pointerDown(rootNode!, { pointerId: 1, button: 0, clientX: 1060, clientY: 910 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 1140, clientY: 980 }));
    });

    expect(rootNode).toHaveStyle({
      left: "1060px",
      top: "910px",
    });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    });
  });

  it("stops responding to pointermove after generated diagram drag cleanup runs", () => {
    const diagram = createDiagram();
    const onChangeDiagram = vi.fn();

    render(
      <Canvas
        notes={[]}
        documents={[]}
        diagram={diagram}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
        onChangeDiagram={onChangeDiagram}
      />,
    );

    const board = getBoard();
    mockBoardRect(board);
    const rootNode = screen
      .getAllByTestId("generated-diagram-node")
      .find((node) => node.getAttribute("data-diagram-node-id") === "diagram-root");

    fireEvent.pointerDown(rootNode!, { pointerId: 1, clientX: 1000, clientY: 860 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 1050, clientY: 900 }));
    });

    expect(onChangeDiagram).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    });

    expect(onChangeDiagram).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 1100, clientY: 940 }));
    });

    expect(onChangeDiagram).toHaveBeenCalledTimes(1);
  });

  it("ignores pointer moves from a different pointer id while dragging a generated diagram node", () => {
    const diagram = createDiagram();
    const onChangeDiagram = vi.fn();

    render(
      <Canvas
        notes={[]}
        documents={[]}
        diagram={diagram}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
        onChangeDiagram={onChangeDiagram}
      />,
    );

    const board = getBoard();
    mockBoardRect(board);
    const rootNode = screen
      .getAllByTestId("generated-diagram-node")
      .find((node) => node.getAttribute("data-diagram-node-id") === "diagram-root");

    fireEvent.pointerDown(rootNode!, { pointerId: 1, clientX: 1000, clientY: 860 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 2, clientX: 1050, clientY: 900 }));
    });

    expect(onChangeDiagram).not.toHaveBeenCalled();
  });

  it("keeps touch dragging on generated diagram nodes from starting board pan and commits once on release", () => {
    const diagram = createDiagram();
    const onChangeDiagram = vi.fn();

    render(
      <Canvas
        notes={[]}
        documents={[]}
        diagram={diagram}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
        onChangeDiagram={onChangeDiagram}
      />,
    );

    const board = getBoard();
    mockBoardRect(board);
    const rootNode = screen
      .getAllByTestId("generated-diagram-node")
      .find((node) => node.getAttribute("data-diagram-node-id") === "diagram-root");

    fireEvent.pointerDown(rootNode!, { pointerId: 5, pointerType: "touch", clientX: 1000, clientY: 860 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 5, clientX: 1040, clientY: 900 }));
    });

    expect(getSurface()).toHaveStyle({ transform: "translate(0px, 0px) scale(1)" });
    expect(rootNode).toHaveStyle({
      left: "1020px",
      top: "880px",
    });
    expect(onChangeDiagram).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 5 }));
    });

    expect(onChangeDiagram).toHaveBeenCalledTimes(1);
    expect(onChangeDiagram).toHaveBeenCalledWith({
      ...diagram,
      nodes: diagram.nodes.map((node) =>
        node.id === "diagram-root"
          ? {
              ...node,
              x: 1020,
              y: 880,
            }
          : node,
      ),
    });
  });

  it("persists the latest diagram drag position once instead of on every pointermove", () => {
    const diagram = createDiagram();
    const onChangeDiagram = vi.fn();

    render(
      <Canvas
        notes={[]}
        documents={[]}
        diagram={diagram}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
        onChangeDiagram={onChangeDiagram}
      />,
    );

    const board = getBoard();
    mockBoardRect(board);
    const rootNode = screen
      .getAllByTestId("generated-diagram-node")
      .find((node) => node.getAttribute("data-diagram-node-id") === "diagram-root");

    fireEvent.pointerDown(rootNode!, { pointerId: 1, clientX: 1000, clientY: 860 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 1040, clientY: 900 }));
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 1120, clientY: 980 }));
    });

    expect(onChangeDiagram).not.toHaveBeenCalled();
    expect(rootNode).toHaveStyle({
      left: "1100px",
      top: "960px",
    });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    });

    expect(onChangeDiagram).toHaveBeenCalledTimes(1);
    expect(onChangeDiagram).toHaveBeenCalledWith({
      ...diagram,
      nodes: diagram.nodes.map((node) =>
        node.id === "diagram-root"
          ? {
              ...node,
              x: 1100,
              y: 960,
            }
          : node,
      ),
    });
  });

  it("calls onChangeNotes with a patched note when a sticky note title changes", () => {
    const notes = createNotes();
    const onChangeNotes = vi.fn();

    render(
      <Canvas
        notes={notes}
        documents={[]}
        onChangeNotes={onChangeNotes}
        onChangeDocuments={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("Launch plan"), {
      target: { value: "Updated launch plan" },
    });

    expect(onChangeNotes).toHaveBeenCalledTimes(1);
    expect(onChangeNotes).toHaveBeenCalledWith([
      {
        ...notes[0],
        title: "Updated launch plan",
      },
      notes[1],
    ]);
  });

  it("updates note coordinates after dragging from the sticky note handle", () => {
    const notes = createNotes();
    const onChangeNotes = vi.fn();
    render(
      <Canvas
        notes={notes}
        documents={[]}
        onChangeNotes={onChangeNotes}
        onChangeDocuments={vi.fn()}
      />,
    );

    const board = getBoard();
    mockBoardRect(board);

    const dragHandle = screen.getByDisplayValue("Launch plan").parentElement;

    expect(dragHandle).not.toBeNull();

    fireEvent.pointerDown(dragHandle!, { pointerId: 1, clientX: 140, clientY: 260 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 220, clientY: 340 }));
    });

    expect(onChangeNotes).toHaveBeenCalledWith([
      {
        ...notes[0],
        x: 200,
        y: 320,
      },
      notes[1],
    ]);

    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    });
  });

  it("calls onNoteDragged after a note drag completes", () => {
    const note = createNote();
    const onNoteDragged = vi.fn();

    render(
      <Canvas
        notes={[note]}
        documents={[]}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
        onNoteDragged={onNoteDragged}
      />,
    );

    const board = getBoard();
    mockBoardRect(board);
    const dragHandle = screen.getByDisplayValue("Launch plan").parentElement;

    fireEvent.pointerDown(dragHandle!, { pointerId: 1, clientX: 140, clientY: 260 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 200, clientY: 320 }));
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    });

    expect(onNoteDragged).toHaveBeenCalledWith(note);
  });

  it("ignores pointer moves from a different pointer id while dragging", () => {
    const notes = createNotes();
    const onChangeNotes = vi.fn();

    render(
      <Canvas
        notes={notes}
        documents={[]}
        onChangeNotes={onChangeNotes}
        onChangeDocuments={vi.fn()}
      />,
    );

    const board = getBoard();
    mockBoardRect(board);
    const dragHandle = screen.getByDisplayValue("Launch plan").parentElement;

    fireEvent.pointerDown(dragHandle!, { pointerId: 1, clientX: 140, clientY: 260 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 2, clientX: 220, clientY: 340 }));
    });

    expect(onChangeNotes).not.toHaveBeenCalled();
  });

  it("clamps dragged note coordinates to a minimum of 12", () => {
    const notes = createNotes();
    const onChangeNotes = vi.fn();
    render(
      <Canvas
        notes={notes}
        documents={[]}
        onChangeNotes={onChangeNotes}
        onChangeDocuments={vi.fn()}
      />,
    );

    const board = getBoard();
    mockBoardRect(board);

    const dragHandle = screen.getByDisplayValue("Launch plan").parentElement;

    expect(dragHandle).not.toBeNull();

    fireEvent.pointerDown(dragHandle!, { pointerId: 1, clientX: 140, clientY: 260 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 1, clientY: 1 }));
    });

    expect(onChangeNotes).toHaveBeenCalledWith([
      {
        ...notes[0],
        x: 12,
        y: 12,
      },
      notes[1],
    ]);

    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    });
  });

  it("stops responding to mousemove after the drag mouseup cleanup runs", () => {
    const notes = createNotes();
    const onChangeNotes = vi.fn();
    render(
      <Canvas
        notes={notes}
        documents={[]}
        onChangeNotes={onChangeNotes}
        onChangeDocuments={vi.fn()}
      />,
    );

    const board = getBoard();
    mockBoardRect(board);

    const dragHandle = screen.getByDisplayValue("Launch plan").parentElement;

    expect(dragHandle).not.toBeNull();

    fireEvent.pointerDown(dragHandle!, { pointerId: 1, clientX: 140, clientY: 260 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 180, clientY: 300 }));
    });

    expect(onChangeNotes).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 260, clientY: 360 }));
    });

    expect(onChangeNotes).toHaveBeenCalledTimes(1);
  });

  it("does not crash if a note handle is removed before a drag can start", () => {
    const notes = createNotes();
    const onChangeNotes = vi.fn();
    const { rerender } = render(
      <Canvas
        notes={notes}
        documents={[]}
        onChangeNotes={onChangeNotes}
        onChangeDocuments={vi.fn()}
      />,
    );

    const dragHandle = screen.getByDisplayValue("Launch plan").parentElement;

    expect(dragHandle).not.toBeNull();

    rerender(
      <Canvas
        notes={[]}
        documents={[]}
        onChangeNotes={onChangeNotes}
        onChangeDocuments={vi.fn()}
      />,
    );

    expect(screen.queryByDisplayValue("Launch plan")).not.toBeInTheDocument();
    expect(() =>
      fireEvent.pointerDown(dragHandle!, { pointerId: 1, clientX: 140, clientY: 260 }),
    ).not.toThrow();
    expect(onChangeNotes).not.toHaveBeenCalled();
  });

  it("renders an empty canvas without notes while keeping the toolbar available", () => {
    render(<Canvas notes={[]} documents={[]} onChangeNotes={vi.fn()} onChangeDocuments={vi.fn()} />);

    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.getByText("100%")).toBeInTheDocument();

    const toolbar = screen.getByText("100%").parentElement;

    expect(toolbar?.querySelectorAll("button")).toHaveLength(12);
  });

  it("updates pan offset when the board receives wheel events", () => {
    render(<CanvasStateHarness initialNotes={[createNote()]} />);

    const board = getBoard();

    fireEvent.wheel(board, { deltaY: 120 });

    expect(getSurface()).toHaveStyle({ transform: "translate(0px, -120px) scale(1)" });

    fireEvent.wheel(board, { shiftKey: true, deltaY: 50 });

    expect(getSurface()).toHaveStyle({ transform: "translate(-50px, -120px) scale(1)" });
  });

  it("resets zoom and pan when Reset view is clicked", () => {
    render(<CanvasStateHarness initialNotes={[createNote()]} />);

    fireEvent.click(getZoomInButton()!);
    fireEvent.wheel(getBoard(), { deltaY: 80, shiftKey: true });

    expect(screen.getByText("110%")).toBeInTheDocument();
    expect(getSurface()).toHaveStyle({ transform: "translate(-72.72727272727272px, 0px) scale(1.1)" });

    fireEvent.click(screen.getByRole("button", { name: "Reset view" }));

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(getSurface()).toHaveStyle({ transform: "translate(0px, 0px) scale(1)" });
  });

  it("pans the canvas when middle-click dragging on the board", () => {
    render(<CanvasStateHarness initialNotes={[createNote()]} />);

    const board = getBoard();

    fireEvent.pointerDown(board, { pointerId: 1, button: 1, clientX: 100, clientY: 120 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 160, clientY: 210 }));
    });

    expect(getSurface()).toHaveStyle({ transform: "translate(60px, 90px) scale(1)" });
    expect(board).toHaveClass("cursor-grabbing");

    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    });
  });

  it("pans the canvas when space plus left-drag is used on the board", () => {
    render(<CanvasStateHarness initialNotes={[createNote()]} />);

    const board = getBoard();

    fireEvent.keyDown(window, { code: "Space" });
    expect(board).toHaveClass("cursor-grab");

    fireEvent.pointerDown(board, { pointerId: 1, button: 0, clientX: 80, clientY: 90 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 130, clientY: 150 }));
    });

    expect(getSurface()).toHaveStyle({ transform: "translate(50px, 60px) scale(1)" });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    });

    fireEvent.keyUp(window, { code: "Space" });
    expect(board).toHaveClass("cursor-default");
  });

  it("keeps item dragging correct when the canvas has a non-zero pan offset", () => {
    render(<CanvasStateHarness initialNotes={[createNote()]} />);

    const board = getBoard();
    mockBoardRect(board);

    fireEvent.wheel(board, { shiftKey: true, deltaY: -40 });
    fireEvent.wheel(board, { deltaY: -30 });

    expect(getSurface()).toHaveStyle({ transform: "translate(40px, 30px) scale(1)" });

    const dragHandle = screen.getByDisplayValue("Launch plan").parentElement;

    expect(dragHandle).not.toBeNull();

    fireEvent.pointerDown(dragHandle!, { pointerId: 1, button: 0, clientX: 170, clientY: 280 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 250, clientY: 390 }));
    });

    expect(screen.getByDisplayValue("Launch plan").parentElement?.parentElement).toHaveStyle({
      left: "200px",
      top: "350px",
    });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    });
  });

  it("calls onChangeDocuments with an added document when the Doc button is clicked", () => {
    const onChangeDocuments = vi.fn();

    render(<Canvas notes={[]} documents={[]} onChangeNotes={vi.fn()} onChangeDocuments={onChangeDocuments} />);

    fireEvent.click(screen.getByRole("button", { name: "Doc" }));

    expect(onChangeDocuments).toHaveBeenCalledTimes(1);
    expect(onChangeDocuments).toHaveBeenCalledWith([
      {
        id: "mock-uuid-1",
        title: "New Document",
        content: "# Getting Started\n\nWrite your ideas here...",
        x: 220,
        y: 220,
      },
    ]);
  });

  it("updates document coordinates after dragging a document", () => {
    const document = createDocument();
    const onChangeDocuments = vi.fn();

    render(
      <Canvas
        notes={[]}
        documents={[document]}
        onChangeNotes={vi.fn()}
        onChangeDocuments={onChangeDocuments}
      />,
    );

    const board = getBoard();
    mockBoardRect(board);
    const dragHandle = screen.getByDisplayValue("My Document").parentElement;

    fireEvent.pointerDown(dragHandle!, { pointerId: 1, clientX: 120, clientY: 220 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 200, clientY: 310 }));
    });

    expect(onChangeDocuments).toHaveBeenCalledWith([
      {
        ...document,
        x: 180,
        y: 290,
      },
    ]);
  });

  it("renders document cards on the canvas", () => {
    render(
      <Canvas
        notes={[]}
        documents={[createDocument()]}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("My Document")).toBeInTheDocument();
  });

  it("calls onChangeDocuments with patched document when title changes", () => {
    const document = createDocument();
    const onChangeDocuments = vi.fn();

    render(
      <Canvas
        notes={[]}
        documents={[document]}
        onChangeNotes={vi.fn()}
        onChangeDocuments={onChangeDocuments}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("My Document"), {
      target: { value: "Updated document title" },
    });

    expect(onChangeDocuments).toHaveBeenCalledTimes(1);
    expect(onChangeDocuments).toHaveBeenCalledWith([
      {
        ...document,
        title: "Updated document title",
      },
    ]);
  });

  it("calls onChangeNotes with the filtered list when deleting a note", () => {
    const notes = createNotes();
    const onChangeNotes = vi.fn();

    render(
      <Canvas
        notes={notes}
        documents={[]}
        onChangeNotes={onChangeNotes}
        onChangeDocuments={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Delete note" })[0]!);

    expect(onChangeNotes).toHaveBeenCalledWith([notes[1]]);
  });

  it("removes a note from the rendered canvas after deletion", () => {
    render(<CanvasStateHarness initialNotes={createNotes()} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Delete note" })[0]!);

    expect(screen.queryByDisplayValue("Launch plan")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Research")).toBeInTheDocument();
  });

  it("calls onChangeDocuments with the filtered list when deleting a document", () => {
    const documents = [createDocument(), createDocument({ id: "doc-2", title: "Second doc" })];
    const onChangeDocuments = vi.fn();

    render(
      <Canvas
        notes={[]}
        documents={documents}
        onChangeNotes={vi.fn()}
        onChangeDocuments={onChangeDocuments}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Delete document" })[0]!);

    expect(onChangeDocuments).toHaveBeenCalledWith([documents[1]]);
  });

  it("removes a document from the rendered canvas after deletion", () => {
    render(
      <CanvasStateHarness
        initialDocuments={[createDocument(), createDocument({ id: "doc-2", title: "Second doc" })]}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Delete document" })[0]!);

    expect(screen.queryByDisplayValue("My Document")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Second doc")).toBeInTheDocument();
  });

  it("renders the Section button in the toolbar", () => {
    render(<Canvas notes={[]} documents={[]} onChangeNotes={vi.fn()} onChangeDocuments={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Section" })).toBeInTheDocument();
  });

  it("clicking the Section button calls onChangeSections with a new section added", () => {
    const sections = [createSection()];
    const onChangeSections = vi.fn();

    render(
      <Canvas
        notes={[]}
        documents={[]}
        sections={sections}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
        onChangeSections={onChangeSections}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Section" }));

    expect(onChangeSections).toHaveBeenCalledTimes(1);
    expect(onChangeSections).toHaveBeenCalledWith([
      ...sections,
      {
        id: "mock-uuid-1",
        title: "New section",
        color: "yellow",
        x: 140,
        y: 140,
        width: 300,
        height: 200,
      },
    ]);
  });

  it("renders section components when sections are provided", () => {
    render(
      <Canvas
        notes={[]}
        documents={[]}
        sections={[createSection()]}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
        onChangeSections={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Research Cluster" })).toBeInTheDocument();
  });

  it("calls onChangeSections with the filtered list when deleting a section", () => {
    const sections = [createSection(), createSection({ id: "section-2", title: "Second section" })];
    const onChangeSections = vi.fn();

    render(
      <Canvas
        notes={[]}
        documents={[]}
        sections={sections}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
        onChangeSections={onChangeSections}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Delete section" })[0]!);

    expect(onChangeSections).toHaveBeenCalledWith([sections[1]]);
  });

  it("updates section coordinates after dragging a section", () => {
    const section = createSection();
    const onChangeSections = vi.fn();

    render(
      <Canvas
        notes={[]}
        documents={[]}
        sections={[section]}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
        onChangeSections={onChangeSections}
      />,
    );

    const board = getBoard();
    mockBoardRect(board);
    const dragHandle = screen.getByRole("button", { name: "Research Cluster" }).parentElement;

    fireEvent.pointerDown(dragHandle!, { pointerId: 1, clientX: 160, clientY: 190 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 240, clientY: 280 }));
    });

    expect(onChangeSections).toHaveBeenCalledWith([
      {
        ...section,
        x: 220,
        y: 250,
      },
    ]);
  });

  it("adds, drags, and deletes website builders", () => {
    const existingBuilder = createWebsiteBuilder();
    const onChangeWebsiteBuilders = vi.fn();

    render(
      <Canvas
        notes={[]}
        documents={[]}
        websiteBuilders={[existingBuilder]}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
        onChangeWebsiteBuilders={onChangeWebsiteBuilders}
      />,
    );

    expect(screen.getByDisplayValue("Landing Page")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Website" }));
    expect(onChangeWebsiteBuilders).toHaveBeenCalledWith([
      existingBuilder,
      {
        id: "mock-uuid-1",
        title: "Startup landing page",
        blocks: [
          {
            id: "mock-uuid-1",
            type: "hero",
            heading: "Explain your startup in one sentence",
            body: "Describe the customer, the problem, and the outcome your product creates.",
            buttonText: "Join the waitlist",
          },
        ],
        x: 260,
        y: 260,
      },
    ]);

    const board = getBoard();
    mockBoardRect(board);
    const dragHandle = screen.getByText("Website Builder").parentElement?.parentElement;

    fireEvent.pointerDown(dragHandle!, { pointerId: 1, clientX: 200, clientY: 220 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 290, clientY: 330 }));
    });

    expect(onChangeWebsiteBuilders).toHaveBeenCalledWith([
      {
        ...existingBuilder,
        x: 270,
        y: 310,
      },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Delete website builder" }));
    expect(onChangeWebsiteBuilders).toHaveBeenCalledWith([]);
  });

  it("removes a section from the rendered canvas after deletion", () => {
    render(
      <CanvasStateHarness
        initialSections={[createSection(), createSection({ id: "section-2", title: "Second section" })]}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Delete section" })[0]!);

    expect(screen.queryByRole("button", { name: "Research Cluster" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Second section" })).toBeInTheDocument();
  });

  it("pans the canvas for touch pointer drags on non-editable targets", () => {
    render(<CanvasStateHarness initialNotes={[createNote()]} />);

    const board = getBoard();

    fireEvent.pointerDown(board, { pointerId: 5, pointerType: "touch", clientX: 40, clientY: 50 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 5, clientX: 90, clientY: 120 }));
    });

    expect(getSurface()).toHaveStyle({ transform: "translate(50px, 70px) scale(1)" });
  });

  it("works without a sections prop for backward compatibility", () => {
    expect(() =>
      render(<Canvas notes={[]} documents={[]} onChangeNotes={vi.fn()} onChangeDocuments={vi.fn()} />),
    ).not.toThrow();

    expect(screen.queryByRole("button", { name: "Research Cluster" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Section" })).toBeInTheDocument();
  });

  it("commits a generated diagram drag on window blur cleanup", () => {
    const diagram = createDiagram();
    const onChangeDiagram = vi.fn();

    render(
      <Canvas
        notes={[]}
        documents={[]}
        diagram={diagram}
        onChangeNotes={vi.fn()}
        onChangeDocuments={vi.fn()}
        onChangeDiagram={onChangeDiagram}
      />,
    );

    const board = getBoard();
    mockBoardRect(board);
    const rootNode = screen
      .getAllByTestId("generated-diagram-node")
      .find((node) => node.getAttribute("data-diagram-node-id") === "diagram-root");

    fireEvent.pointerDown(rootNode!, { pointerId: 1, clientX: 1000, clientY: 860 });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 1050, clientY: 900 }));
    });

    fireEvent.blur(window);

    expect(onChangeDiagram).toHaveBeenCalledTimes(1);
    expect(onChangeDiagram).toHaveBeenCalledWith({
      ...diagram,
      nodes: diagram.nodes.map((node) =>
        node.id === "diagram-root"
          ? {
              ...node,
              x: 1030,
              y: 880,
            }
          : node,
      ),
    });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 1050, clientY: 900 }));
    });

    expect(onChangeDiagram).toHaveBeenCalledTimes(1);
  });
});
