import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Canvas from "@/components/Canvas";
import type { StickyNoteData } from "@/lib/types";

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

describe("Canvas", () => {
  const getZoomOutButton = () => screen.getByRole("button", { name: "-" });

  const getZoomInButton = () =>
    screen
      .getAllByRole("button", { name: "+" })
      .find((button) => !button.className.includes("bg-stone-950"));

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
    render(<Canvas notes={createNotes()} onChangeNotes={vi.fn()} />);

    expect(screen.getByDisplayValue("Launch plan")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Research")).toBeInTheDocument();
  });

  it("shows the default zoom level text", () => {
    render(<Canvas notes={createNotes()} onChangeNotes={vi.fn()} />);

    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("calls onChangeNotes with an added note when the add button is clicked", () => {
    const notes = createNotes();
    const onChangeNotes = vi.fn();

    render(<Canvas notes={notes} onChangeNotes={onChangeNotes} />);

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
    render(<Canvas notes={createNotes()} onChangeNotes={vi.fn()} />);

    const yellowButton = screen.getByRole("button", { name: "Select yellow note color" });

    expect(yellowButton).toHaveClass("bg-amber-200", "ring-2", "ring-offset-2", "ring-stone-400");
    expect(screen.getByRole("button", { name: "Select blue note color" })).toHaveClass("bg-sky-200");
    expect(screen.getByRole("button", { name: "Select green note color" })).toHaveClass("bg-emerald-200");
    expect(screen.getByRole("button", { name: "Select pink note color" })).toHaveClass("bg-pink-200");
    expect(screen.getByRole("button", { name: "Select purple note color" })).toHaveClass("bg-violet-200");
  });

  it("updates the selected color when a color circle is clicked", () => {
    render(<Canvas notes={createNotes()} onChangeNotes={vi.fn()} />);

    const yellowButton = screen.getByRole("button", { name: "Select yellow note color" });
    const pinkButton = screen.getByRole("button", { name: "Select pink note color" });

    fireEvent.click(pinkButton);

    expect(pinkButton).toHaveClass("ring-2", "ring-offset-2", "ring-stone-400");
    expect(yellowButton).not.toHaveClass("ring-2");
  });

  it("creates new notes with the selected color", () => {
    const notes = createNotes();
    const onChangeNotes = vi.fn();

    render(<Canvas notes={notes} onChangeNotes={onChangeNotes} />);

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

    render(<Canvas notes={notes} onChangeNotes={onChangeNotes} />);

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
    render(<Canvas notes={createNotes()} onChangeNotes={vi.fn()} />);

    fireEvent.click(getZoomOutButton());

    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("updates the zoom display to 110% when zooming in", () => {
    render(<Canvas notes={createNotes()} onChangeNotes={vi.fn()} />);

    const zoomInButton = getZoomInButton();

    expect(zoomInButton).toBeDefined();

    fireEvent.click(zoomInButton!);

    expect(screen.getByText("110%")).toBeInTheDocument();
  });

  it("does not zoom out below 80%", () => {
    render(<Canvas notes={createNotes()} onChangeNotes={vi.fn()} />);

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
    render(<Canvas notes={createNotes()} onChangeNotes={vi.fn()} />);

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
    const { container } = render(<Canvas notes={createNotes()} onChangeNotes={vi.fn()} />);

    const boardContainer = Array.from(container.querySelectorAll("div")).find((element) =>
      element.className.includes("absolute inset-0 overflow-auto rounded-[28px]"),
    );

    expect(boardContainer).toBeInTheDocument();
  });

  it("calls onChangeNotes with a patched note when a sticky note title changes", () => {
    const notes = createNotes();
    const onChangeNotes = vi.fn();

    render(<Canvas notes={notes} onChangeNotes={onChangeNotes} />);

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
    const { container } = render(<Canvas notes={notes} onChangeNotes={onChangeNotes} />);

    const board = container.querySelector(".absolute.inset-0.overflow-auto") as HTMLDivElement | null;

    expect(board).not.toBeNull();

    vi.spyOn(board!, "getBoundingClientRect").mockReturnValue({
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

    const dragHandle = screen.getByDisplayValue("Launch plan").parentElement;

    expect(dragHandle).not.toBeNull();

    fireEvent.mouseDown(dragHandle!, { clientX: 140, clientY: 260 });

    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 220, clientY: 340 }));
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
      window.dispatchEvent(new MouseEvent("mouseup"));
    });
  });

  it("clamps dragged note coordinates to a minimum of 12", () => {
    const notes = createNotes();
    const onChangeNotes = vi.fn();
    const { container } = render(<Canvas notes={notes} onChangeNotes={onChangeNotes} />);

    const board = container.querySelector(".absolute.inset-0.overflow-auto") as HTMLDivElement | null;

    expect(board).not.toBeNull();

    vi.spyOn(board!, "getBoundingClientRect").mockReturnValue({
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

    const dragHandle = screen.getByDisplayValue("Launch plan").parentElement;

    expect(dragHandle).not.toBeNull();

    fireEvent.mouseDown(dragHandle!, { clientX: 140, clientY: 260 });

    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 1, clientY: 1 }));
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
      window.dispatchEvent(new MouseEvent("mouseup"));
    });
  });

  it("stops responding to mousemove after the drag mouseup cleanup runs", () => {
    const notes = createNotes();
    const onChangeNotes = vi.fn();
    const { container } = render(<Canvas notes={notes} onChangeNotes={onChangeNotes} />);

    const board = container.querySelector(".absolute.inset-0.overflow-auto") as HTMLDivElement | null;

    expect(board).not.toBeNull();

    vi.spyOn(board!, "getBoundingClientRect").mockReturnValue({
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

    const dragHandle = screen.getByDisplayValue("Launch plan").parentElement;

    expect(dragHandle).not.toBeNull();

    fireEvent.mouseDown(dragHandle!, { clientX: 140, clientY: 260 });

    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 180, clientY: 300 }));
    });

    expect(onChangeNotes).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup"));
    });

    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 260, clientY: 360 }));
    });

    expect(onChangeNotes).toHaveBeenCalledTimes(1);
  });

  it("does not crash if a note handle is removed before a drag can start", () => {
    const notes = createNotes();
    const onChangeNotes = vi.fn();
    const { rerender } = render(<Canvas notes={notes} onChangeNotes={onChangeNotes} />);

    const dragHandle = screen.getByDisplayValue("Launch plan").parentElement;

    expect(dragHandle).not.toBeNull();

    rerender(<Canvas notes={[]} onChangeNotes={onChangeNotes} />);

    expect(screen.queryByDisplayValue("Launch plan")).not.toBeInTheDocument();
    expect(() => fireEvent.mouseDown(dragHandle!, { clientX: 140, clientY: 260 })).not.toThrow();
    expect(onChangeNotes).not.toHaveBeenCalled();
  });

  it("renders an empty canvas without notes while keeping the toolbar available", () => {
    render(<Canvas notes={[]} onChangeNotes={vi.fn()} />);

    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.getByText("100%")).toBeInTheDocument();

    const toolbar = screen.getByText("100%").parentElement;

    expect(toolbar?.querySelectorAll("button")).toHaveLength(8);
  });
});
