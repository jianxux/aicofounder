"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import StickyNote from "@/components/StickyNote";
import type { NoteColor, StickyNoteData } from "@/lib/types";

type CanvasProps = {
  notes: StickyNoteData[];
  onChangeNotes: (notes: StickyNoteData[]) => void;
};

type DragState = {
  noteId: string;
  offsetX: number;
  offsetY: number;
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

export default function Canvas({ notes, onChangeNotes }: CanvasProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dragState, setDragState] = useState<DragState>(null);
  const [selectedColor, setSelectedColor] = useState<NoteColor>("yellow");

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const handleMove = (event: MouseEvent) => {
      const board = boardRef.current;

      if (!board) {
        return;
      }

      const rect = board.getBoundingClientRect();
      const nextX = Math.max(12, (event.clientX - rect.left - dragState.offsetX) / zoom);
      const nextY = Math.max(12, (event.clientY - rect.top - dragState.offsetY) / zoom);

      onChangeNotes(
        notes.map((note) =>
          note.id === dragState.noteId
            ? {
                ...note,
                x: nextX,
                y: nextY,
              }
            : note,
        ),
      );
    };

    const handleUp = () => {
      setDragState(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragState, notes, onChangeNotes, zoom]);

  const handleDragStart = (noteId: string, event: ReactMouseEvent<HTMLDivElement>) => {
    const board = boardRef.current;

    if (!board) {
      return;
    }

    const rect = board.getBoundingClientRect();
    const note = notes.find((entry) => entry.id === noteId);

    if (!note) {
      return;
    }

    setDragState({
      noteId,
      offsetX: event.clientX - rect.left - note.x * zoom,
      offsetY: event.clientY - rect.top - note.y * zoom,
    });
  };

  const handleNoteChange = (noteId: string, patch: Partial<StickyNoteData>) => {
    onChangeNotes(notes.map((note) => (note.id === noteId ? { ...note, ...patch } : note)));
  };

  const addNote = () => {
    onChangeNotes([...notes, createNote(selectedColor)]);
  };

  return (
    <div className="relative h-full min-h-[520px] overflow-hidden rounded-[28px] border border-stone-200 bg-[#faf7f2] shadow-sm">
      <div
        ref={boardRef}
        className="absolute inset-0 overflow-auto rounded-[28px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_transparent_36%),linear-gradient(180deg,_rgba(255,255,255,0.55),_rgba(250,247,242,1))]"
      >
        <div className="relative h-[1200px] min-w-[900px]">
          {notes.map((note) => (
            <StickyNote
              key={note.id}
              note={note}
              zoom={zoom}
              onChange={handleNoteChange}
              onDragStart={handleDragStart}
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
          onClick={() => setZoom((current) => Math.max(0.8, Number((current - 0.1).toFixed(1))))}
          className="rounded-full border border-stone-200 px-3 py-2 text-sm text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
        >
          -
        </button>
        <div className="min-w-14 text-center text-sm font-medium text-stone-600">{Math.round(zoom * 100)}%</div>
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
