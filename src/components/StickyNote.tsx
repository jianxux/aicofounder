"use client";

import type { MouseEvent } from "react";
import type { NoteColor, StickyNoteData } from "@/lib/types";

type StickyNoteProps = {
  note: StickyNoteData;
  zoom?: number;
  onChange: (noteId: string, patch: Partial<StickyNoteData>) => void;
  onDragStart: (noteId: string, event: MouseEvent<HTMLDivElement>) => void;
  onDelete?: (noteId: string) => void;
};

const COLOR_MAP: Record<
  NoteColor,
  { borderColor: string; bgColor: string; headerBg: string }
> = {
  yellow: {
    borderColor: "border-amber-200",
    bgColor: "bg-amber-100",
    headerBg: "bg-amber-200/80",
  },
  blue: {
    borderColor: "border-sky-200",
    bgColor: "bg-sky-100",
    headerBg: "bg-sky-200/80",
  },
  green: {
    borderColor: "border-emerald-200",
    bgColor: "bg-emerald-100",
    headerBg: "bg-emerald-200/80",
  },
  pink: {
    borderColor: "border-pink-200",
    bgColor: "bg-pink-100",
    headerBg: "bg-pink-200/80",
  },
  purple: {
    borderColor: "border-violet-200",
    bgColor: "bg-violet-100",
    headerBg: "bg-violet-200/80",
  },
};

export default function StickyNote({ note, onChange, onDragStart, onDelete }: StickyNoteProps) {
  const colors = COLOR_MAP[note.color] ?? COLOR_MAP.yellow;

  return (
    <div
      className={`absolute w-60 rounded-2xl border ${colors.borderColor} ${colors.bgColor} shadow-sm transition hover:shadow-md`}
      style={{
        left: note.x,
        top: note.y,
      }}
    >
      <div
        onMouseDown={(event) => onDragStart(note.id, event)}
        className={`relative cursor-grab rounded-t-2xl border-b ${colors.borderColor} ${colors.headerBg} px-4 py-3 active:cursor-grabbing`}
      >
        <input
          value={note.title}
          onChange={(event) => onChange(note.id, { title: event.target.value })}
          className="w-full border-none bg-transparent pr-8 text-sm font-semibold text-stone-900 outline-none"
        />
        {onDelete ? (
          <button
            type="button"
            aria-label="Delete note"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(note.id);
            }}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs text-stone-400 hover:text-red-500"
          >
            ×
          </button>
        ) : null}
      </div>
      <textarea
        value={note.content}
        onChange={(event) => onChange(note.id, { content: event.target.value })}
        className="min-h-36 w-full resize-none rounded-b-2xl border-none bg-transparent px-4 py-3 text-sm leading-6 text-stone-700 outline-none"
      />
    </div>
  );
}
