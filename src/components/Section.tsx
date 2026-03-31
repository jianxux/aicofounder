"use client";

import type { MouseEvent } from "react";
import { useEffect, useState } from "react";
import type { NoteColor, SectionData } from "@/lib/types";

type SectionProps = {
  section: SectionData;
  zoom: number;
  onChange: (id: string, patch: Partial<SectionData>) => void;
  onDragStart: (id: string, event: MouseEvent<HTMLDivElement>) => void;
};

const COLOR_MAP: Record<NoteColor, { background: string; border: string; text: string }> = {
  yellow: {
    background: "bg-amber-100/60",
    border: "border-amber-300",
    text: "text-amber-900",
  },
  blue: {
    background: "bg-sky-100/60",
    border: "border-sky-300",
    text: "text-sky-900",
  },
  green: {
    background: "bg-emerald-100/60",
    border: "border-emerald-300",
    text: "text-emerald-900",
  },
  pink: {
    background: "bg-pink-100/60",
    border: "border-pink-300",
    text: "text-pink-900",
  },
  purple: {
    background: "bg-violet-100/60",
    border: "border-violet-300",
    text: "text-violet-900",
  },
};

export default function Section({ section, zoom, onChange, onDragStart }: SectionProps) {
  const colors = COLOR_MAP[section.color] ?? COLOR_MAP.yellow;
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(section.title);

  useEffect(() => {
    setDraftTitle(section.title);
  }, [section.title]);

  const commitTitle = () => {
    setIsEditing(false);
    onChange(section.id, { title: draftTitle.trim() || "Untitled section" });
  };

  return (
    <div
      className={`absolute rounded-3xl border-2 border-dashed ${colors.border} ${colors.background} shadow-sm`}
      style={{
        left: section.x * zoom,
        top: section.y * zoom,
        width: section.width * zoom,
        height: section.height * zoom,
      }}
    >
      <div
        onMouseDown={(event) => onDragStart(section.id, event)}
        className={`flex h-11 cursor-grab items-center rounded-t-3xl px-4 active:cursor-grabbing ${colors.text}`}
      >
        {isEditing ? (
          <input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitTitle();
              }

              if (event.key === "Escape") {
                setDraftTitle(section.title);
                setIsEditing(false);
              }
            }}
            onMouseDown={(event) => event.stopPropagation()}
            autoFocus
            className="w-full border-none bg-transparent text-sm font-semibold outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            onMouseDown={(event) => event.stopPropagation()}
            className="truncate bg-transparent text-left text-sm font-semibold outline-none"
          >
            {section.title}
          </button>
        )}
      </div>
    </div>
  );
}
