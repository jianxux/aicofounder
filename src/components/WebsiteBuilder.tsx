"use client";

import type { PointerEvent } from "react";
import { useState } from "react";
import type { WebsiteBlock, WebsiteBlockType, WebsiteBuilderData } from "@/lib/types";

type WebsiteBuilderProps = {
  websiteBuilder: WebsiteBuilderData;
  onChange: (id: string, patch: Partial<WebsiteBuilderData>) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string, event: PointerEvent<HTMLDivElement>) => void;
};

const BLOCK_OPTIONS: Array<{ type: WebsiteBlockType; label: string }> = [
  { type: "hero", label: "Hero" },
  { type: "features", label: "Features" },
  { type: "cta", label: "CTA" },
  { type: "text", label: "Text" },
];

type LaunchChecklistItem = {
  title: string;
  detail: string;
};

const LAUNCH_READINESS_CHECKLIST: LaunchChecklistItem[] = [
  {
    title: "Clear one-sentence promise",
    detail: "State what you do, who it is for, and why it matters in a single line.",
  },
  {
    title: "Primary conversion path",
    detail: "Keep one obvious next step with a clear CTA above the fold and near the close.",
  },
  {
    title: "Search/discovery basics",
    detail: "Use a descriptive page title, scannable headings, and copy that matches search intent.",
  },
];

function createBlock(type: WebsiteBlockType): WebsiteBlock {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;

  if (type === "hero") {
    return {
      id,
      type,
      heading: "Turn your startup idea into a clear promise",
      body: "Explain what you do, who it is for, and why it matters in one sharp sentence.",
      buttonText: "Get started",
    };
  }

  if (type === "features") {
    return {
      id,
      type,
      heading: "Why customers care",
      body: "Feature one\nFeature two\nFeature three",
    };
  }

  if (type === "cta") {
    return {
      id,
      type,
      heading: "Ready to validate demand?",
      body: "Invite visitors to book a call, join a waitlist, or try the product.",
      buttonText: "Join waitlist",
    };
  }

  return {
    id,
    type,
    heading: "Tell the story",
    body: "Use this section to add supporting detail, social proof, or your founder point of view.",
  };
}

export default function WebsiteBuilder({ websiteBuilder, onChange, onDelete, onDragStart }: WebsiteBuilderProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const updateBlock = (blockId: string, patch: Partial<WebsiteBlock>) => {
    onChange(websiteBuilder.id, {
      blocks: websiteBuilder.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
    });
  };

  const deleteBlock = (blockId: string) => {
    onChange(websiteBuilder.id, {
      blocks: websiteBuilder.blocks.filter((block) => block.id !== blockId),
    });
  };

  const addBlock = (type: WebsiteBlockType) => {
    onChange(websiteBuilder.id, {
      blocks: [...websiteBuilder.blocks, createBlock(type)],
    });
  };

  return (
    <div
      className="absolute w-[460px] rounded-[28px] border border-stone-200 bg-[#fdfbf7] shadow-sm transition hover:shadow-md"
      style={{ position: "absolute", left: websiteBuilder.x, top: websiteBuilder.y }}
    >
      <div
        onPointerDown={(event) => onDragStart(websiteBuilder.id, event)}
        className="relative flex cursor-grab items-center justify-between rounded-t-[28px] border-b border-stone-200 bg-stone-100 px-4 py-3 active:cursor-grabbing"
      >
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Website Builder</div>
          <div className="text-sm text-stone-600">Landing page canvas</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setMode((current) => (current === "edit" ? "preview" : "edit"));
            }}
            className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
          >
            {mode === "edit" ? "Preview" : "Edit"}
          </button>
          <button
            type="button"
            aria-label="Delete website builder"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(websiteBuilder.id);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-stone-400 transition hover:text-red-500"
          >
            ×
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <input
          value={websiteBuilder.title}
          onChange={(event) => onChange(websiteBuilder.id, { title: event.target.value })}
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base font-semibold text-stone-900 outline-none transition focus:border-stone-300"
          placeholder="Website title"
        />

        {mode === "edit" ? (
          <div className="space-y-4">
            {websiteBuilder.blocks.map((block, index) => (
              <div key={block.id} className="rounded-3xl border border-stone-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    {index + 1}. {block.type}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteBlock(block.id)}
                    className="text-xs font-medium text-stone-500 transition hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    value={block.heading}
                    onChange={(event) => updateBlock(block.id, { heading: event.target.value })}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-stone-300"
                    placeholder="Heading"
                  />
                  <textarea
                    value={block.body}
                    onChange={(event) => updateBlock(block.id, { body: event.target.value })}
                    className="min-h-24 w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-700 outline-none transition focus:border-stone-300"
                    placeholder="Body copy"
                  />
                  <input
                    value={block.buttonText ?? ""}
                    onChange={(event) => updateBlock(block.id, { buttonText: event.target.value })}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-stone-300"
                    placeholder="Button text (optional)"
                  />
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              {BLOCK_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => addBlock(option.type)}
                  className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
                >
                  Add {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white">
              <div className="bg-[linear-gradient(180deg,_#f7efe5_0%,_#fffdf8_42%,_#ffffff_100%)] p-6">
                {websiteBuilder.blocks.map((block) => {
                  if (block.type === "hero") {
                    return (
                      <section key={block.id} className="rounded-[24px] border border-stone-200 bg-white/80 px-6 py-8 text-center shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                          {websiteBuilder.title}
                        </div>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">{block.heading}</h2>
                        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-stone-600">{block.body}</p>
                        {block.buttonText ? (
                          <button
                            type="button"
                            className="mt-5 rounded-full bg-stone-950 px-5 py-2.5 text-sm font-semibold text-white"
                          >
                            {block.buttonText}
                          </button>
                        ) : null}
                      </section>
                    );
                  }

                  if (block.type === "features") {
                    const features = block.body
                      .split("\n")
                      .map((entry) => entry.trim())
                      .filter(Boolean);

                    return (
                      <section key={block.id} className="mt-5">
                        <h3 className="text-xl font-semibold text-stone-950">{block.heading}</h3>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {features.map((feature) => (
                            <div key={feature} className="rounded-3xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm leading-6 text-stone-700">
                              {feature}
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  }

                  if (block.type === "cta") {
                    return (
                      <section key={block.id} className="mt-5 rounded-[24px] border border-stone-200 bg-stone-900 px-6 py-8 text-center text-stone-50">
                        <h3 className="text-2xl font-semibold">{block.heading}</h3>
                        <p className="mt-3 text-sm leading-7 text-stone-300">{block.body}</p>
                        {block.buttonText ? (
                          <button
                            type="button"
                            className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-stone-900"
                          >
                            {block.buttonText}
                          </button>
                        ) : null}
                      </section>
                    );
                  }

                  return (
                    <section key={block.id} className="mt-5">
                      <h3 className="text-xl font-semibold text-stone-950">{block.heading}</h3>
                      <p className="mt-3 text-sm leading-7 text-stone-600">{block.body}</p>
                    </section>
                  );
                })}
              </div>
            </div>
            <section aria-label="Launch readiness checklist" className="rounded-3xl border border-stone-200 bg-stone-50 px-4 py-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">Launch readiness checklist</h3>
              <ul className="mt-3 space-y-2">
                {LAUNCH_READINESS_CHECKLIST.map((item) => (
                  <li key={item.title} className="rounded-2xl border border-stone-200 bg-white px-3 py-2 text-xs">
                    <p className="font-semibold text-stone-800">{item.title}</p>
                    <p className="mt-1 text-stone-600">{item.detail}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
