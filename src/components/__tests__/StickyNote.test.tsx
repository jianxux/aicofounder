import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import StickyNote from "@/components/StickyNote";
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

describe("StickyNote", () => {
  it("renders the note title in an input and content in a textarea", () => {
    render(
      <StickyNote
        note={createNote()}
        zoom={1}
        onChange={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("Launch plan")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Validate the onboarding flow")).toBeInTheDocument();
  });

  it("renders with the correct position styles and zoom scale", () => {
    const { container } = render(
      <StickyNote
        note={createNote({ x: 48, y: 96 })}
        zoom={1.5}
        onChange={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    expect(container.firstChild).toHaveStyle({
      left: "48px",
      top: "96px",
      transform: "scale(1.5)",
      transformOrigin: "top left",
    });
  });

  it("calls onChange with a title patch when the title input changes", () => {
    const onChange = vi.fn();

    render(
      <StickyNote
        note={createNote()}
        zoom={1}
        onChange={onChange}
        onDragStart={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("Launch plan"), {
      target: { value: "Updated title" },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("note-1", { title: "Updated title" });
  });

  it("calls onChange with a content patch when the textarea changes", () => {
    const onChange = vi.fn();

    render(
      <StickyNote
        note={createNote()}
        zoom={1}
        onChange={onChange}
        onDragStart={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("Validate the onboarding flow"), {
      target: { value: "New note body" },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("note-1", { content: "New note body" });
  });

  it("calls onDragStart with the note id and mouse event when the header is pressed", () => {
    const onDragStart = vi.fn();

    render(
      <StickyNote
        note={createNote()}
        zoom={1}
        onChange={vi.fn()}
        onDragStart={onDragStart}
      />,
    );

    const header = screen.getByDisplayValue("Launch plan").parentElement;

    expect(header).not.toBeNull();

    fireEvent.mouseDown(header!);

    expect(onDragStart).toHaveBeenCalledTimes(1);
    expect(onDragStart.mock.calls[0]?.[0]).toBe("note-1");
    expect(onDragStart.mock.calls[0]?.[1].type).toBe("mousedown");
  });

  it("renders empty title and content values", () => {
    render(
      <StickyNote
        note={createNote({ title: "", content: "" })}
        zoom={1}
        onChange={vi.fn()}
        onDragStart={vi.fn()}
      />,
    );

    const [titleInput, contentTextarea] = screen.getAllByRole("textbox");

    expect(titleInput).toHaveValue("");
    expect(contentTextarea).toHaveValue("");
  });
});
