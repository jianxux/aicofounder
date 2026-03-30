"use client";

import type { MouseEvent } from "react";
import { StickyNoteData } from "@/lib/types";

type StickyNoteProps = {
  note: StickyNoteData;
  zoom: number;
  onChange: (noteId: string, patch: Partial<StickyNoteData>) => void;
  onDragStart: (noteId: string, event: MouseEvent<HTMLDivElement>) => void;
};

export default function StickyNote({ note, zoom, onChange, onDragStart }: StickyNoteProps) {
  return (
    <div
      className="absolute w-60 rounded-2xl border border-amber-200 bg-amber-100 shadow-sm transition hover:shadow-md"
      style={{
        left: note.x,
        top: note.y,
        transform: `scale(${zoom})`,
        transformOrigin: "top left",
      }}
    >
      <div
        onMouseDown={(event) => onDragStart(note.id, event)}
        className="cursor-grab rounded-t-2xl border-b border-amber-200 bg-amber-200/80 px-4 py-3 active:cursor-grabbing"
      >
        <input
          value={note.title}
          onChange={(event) => onChange(note.id, { title: event.target.value })}
          className="w-full border-none bg-transparent text-sm font-semibold text-stone-900 outline-none"
        />
      </div>
      <textarea
        value={note.content}
        onChange={(event) => onChange(note.id, { content: event.target.value })}
        className="min-h-36 w-full resize-none rounded-b-2xl border-none bg-transparent px-4 py-3 text-sm leading-6 text-stone-700 outline-none"
      />
    </div>
  );
}
