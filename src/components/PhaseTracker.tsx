"use client";

import { Phase } from "@/lib/types";

type PhaseTrackerProps = {
  phases: Phase[];
  activePhaseId: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSetActivePhase: (phaseId: string) => void;
  onToggleTask: (phaseId: string, taskId: string) => void;
};

export default function PhaseTracker({
  phases,
  activePhaseId,
  collapsed,
  onToggleCollapsed,
  onSetActivePhase,
  onToggleTask,
}: PhaseTrackerProps) {
  return (
    <div className="rounded-[28px] border border-stone-200 bg-white/95 p-4 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Progress</div>
          <div className="text-base font-semibold text-stone-900">Phase tracker</div>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="rounded-full border border-stone-200 px-3 py-1.5 text-sm text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>

      <ol className="list-none space-y-3">
        {phases.map((phase, index) => {
          const completeCount = phase.tasks.filter((task) => task.done).length;
          const totalTasks = phase.tasks.length;
          const completionPercent = totalTasks > 0 ? Math.round((completeCount / totalTasks) * 100) : 0;
          const isActive = phase.id === activePhaseId;

          return (
            <li
              key={phase.id}
              className={`rounded-2xl border p-3 transition ${
                isActive ? "border-stone-900 bg-stone-50" : "border-stone-200 bg-white"
              }`}
            >
              <button
                type="button"
                onClick={() => onSetActivePhase(phase.id)}
                aria-current={isActive ? "step" : undefined}
                className="flex w-full items-start justify-between gap-4 text-left"
              >
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Phase {index + 1}
                  </div>
                  <div className="text-sm font-semibold text-stone-900">
                    {phase.title}
                    {phase.id === "getting-started" ? ` (${completeCount} of ${totalTasks} done)` : ""}
                  </div>
                </div>
                <div className="text-xs text-stone-500">{completeCount}/{totalTasks}</div>
              </button>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200"
                role="progressbar"
                aria-label={`${phase.title} completion`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={completionPercent}
                aria-valuetext={`${completionPercent}% complete`}
              >
                <div className="h-full rounded-full bg-stone-900" style={{ width: `${completionPercent}%` }} />
              </div>

              {!collapsed && isActive ? (
                <div className="mt-3 space-y-2">
                  {phase.tasks.map((task) => (
                    <label
                      key={task.id}
                      className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"
                    >
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => onToggleTask(phase.id, task.id)}
                        className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-400"
                      />
                      <span className={task.done ? "line-through text-stone-400" : ""}>{task.label}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
