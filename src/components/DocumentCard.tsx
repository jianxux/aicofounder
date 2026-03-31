"use client";

import type { PointerEvent } from "react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { DocumentCardData } from "@/lib/types";

type DocumentCardProps = {
  document: DocumentCardData;
  zoom?: number;
  onChange: (id: string, patch: Partial<DocumentCardData>) => void;
  onDragStart: (id: string, event: PointerEvent<HTMLDivElement>) => void;
  onDelete?: (id: string) => void;
};

export default function DocumentCard({ document, onChange, onDragStart, onDelete }: DocumentCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div
      className="absolute w-80 rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
      style={{
        left: document.x,
        top: document.y,
      }}
    >
      <div
        onPointerDown={(event) => onDragStart(document.id, event)}
        className="relative cursor-grab rounded-t-2xl border-b border-stone-200 bg-stone-100 px-4 py-3 active:cursor-grabbing"
      >
        <input
          value={document.title}
          onChange={(event) => onChange(document.id, { title: event.target.value })}
          className="w-full border-none bg-transparent pr-8 text-sm font-semibold text-stone-900 outline-none"
        />
        {onDelete ? (
          <button
            type="button"
            aria-label="Delete document"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(document.id);
            }}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs text-stone-400 hover:text-red-500"
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="min-h-40 rounded-b-2xl px-4 py-3">
        {isEditing ? (
          <textarea
            value={document.content}
            onChange={(event) => onChange(document.id, { content: event.target.value })}
            onBlur={() => setIsEditing(false)}
            autoFocus
            className="min-h-36 w-full resize-none border-none bg-transparent text-sm leading-6 text-stone-700 outline-none"
          />
        ) : (
          <div
            onDoubleClick={() => setIsEditing(true)}
            className="cursor-text text-sm leading-6 text-stone-700 [&_blockquote]:border-l-2 [&_blockquote]:border-stone-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-stone-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_h1]:mt-0 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol]:my-3 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:my-3 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-stone-900 [&_pre]:p-3 [&_pre]:text-stone-100 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:my-3 [&_ul]:ml-5 [&_ul]:list-disc"
          >
            <ReactMarkdown>{document.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
