import { Phase } from "@/lib/types";

export function getNextPhaseId(phases: Phase[], currentPhaseId: string): string | null {
  const currentIndex = phases.findIndex((phase) => phase.id === currentPhaseId);

  if (currentIndex === -1 || currentIndex === phases.length - 1) {
    return null;
  }

  return phases[currentIndex + 1]?.id ?? null;
}

export function shouldAdvancePhase(phases: Phase[], currentPhaseId: string): boolean {
  const currentPhase = phases.find((phase) => phase.id === currentPhaseId);

  if (!currentPhase) {
    return false;
  }

  return currentPhase.tasks.every((task) => task.done) && getNextPhaseId(phases, currentPhaseId) !== null;
}

export function getPhaseAdvanceMessage(completedPhaseTitle: string, nextPhaseTitle: string): string {
  return `Great work! You've completed the "${completedPhaseTitle}" phase. Let's move on to "${nextPhaseTitle}" - here's where things get interesting.`;
}
