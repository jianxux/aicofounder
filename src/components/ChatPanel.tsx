"use client";

import { FormEvent, useMemo, useState } from "react";
import PhaseTracker from "@/components/PhaseTracker";
import { ChatMessage, Phase } from "@/lib/types";

type ChatPanelProps = {
  messages: ChatMessage[];
  phases: Phase[];
  activePhaseId: string;
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onRemind: () => void;
  onBrainstorm: () => void;
  onToggleTask: (phaseId: string, taskId: string) => void;
  onSetActivePhase: (phaseId: string) => void;
};

export default function ChatPanel({
  messages,
  phases,
  activePhaseId,
  onSendMessage,
  isLoading,
  onRemind,
  onBrainstorm,
  onToggleTask,
  onSetActivePhase,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const activePhase = useMemo(
    () => phases.find((phase) => phase.id === activePhaseId) ?? phases[0],
    [activePhaseId, phases],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.trim()) {
      return;
    }

    onSendMessage(draft.trim());
    setDraft("");
  };

  return (
    <div className="flex h-full min-h-[720px] flex-col rounded-[28px] border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 px-6 py-5">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">AI Cofounder</div>
        <h2 className="mt-2 text-2xl font-semibold text-stone-900">Research and build your product</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Ask for market research, challenge assumptions, and turn loose concepts into a sharper plan.
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {messages.map((message) => {
          const isUser = message.sender === "user";

          return (
            <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
                  isUser ? "bg-sky-600 text-white" : "bg-stone-100 text-stone-800"
                }`}
              >
                {message.content}
              </div>
            </div>
          );
        })}
        {isLoading ? (
          <div className="flex justify-start" aria-label="AI is thinking">
            <div className="flex items-center gap-2 rounded-3xl bg-stone-100 px-4 py-3 shadow-sm">
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.3s]" />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.15s]" />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-stone-400" />
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-stone-200 px-6 py-5">
        <div className="mb-3 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onRemind}
            className="text-sm font-medium text-stone-500 underline decoration-stone-300 underline-offset-4 transition hover:text-stone-800"
          >
            Remind me what we were working on
          </button>
          <button
            type="button"
            onClick={onBrainstorm}
            disabled={isLoading}
            className="text-sm font-medium text-stone-500 underline decoration-stone-300 underline-offset-4 transition hover:text-stone-800 disabled:cursor-not-allowed disabled:text-stone-400"
          >
            🔎 Brainstorm pain points
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Tell your AI cofounder what you want to explore next..."
            disabled={isLoading}
            className="min-h-24 flex-1 resize-none rounded-3xl border border-stone-200 bg-[#fcfaf6] px-4 py-3 text-sm text-stone-800 outline-none transition focus:border-stone-400"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            Send
          </button>
        </form>
      </div>

      <div className="border-t border-stone-200 bg-[#fcfaf6] px-4 py-4">
        <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
          Current phase: {activePhase?.title}
        </div>
        <PhaseTracker
          phases={phases}
          activePhaseId={activePhaseId}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((current) => !current)}
          onSetActivePhase={onSetActivePhase}
          onToggleTask={onToggleTask}
        />
      </div>
    </div>
  );
}
