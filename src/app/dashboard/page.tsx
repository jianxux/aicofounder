"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthButton from "@/components/AuthButton";
import BrandMark from "@/components/BrandMark";
import OnboardingModal, { type OnboardingIntake } from "@/components/OnboardingModal";
import { parseLandingPromptDraft } from "@/app/prompt-handoff";
import { ARTIFACT_INTAKE_SUBMITTED_EVENT, trackEvent } from "@/lib/analytics";
import { createProject, getProjects, saveProject } from "@/lib/projects";
import { Project } from "@/lib/types";

const ONBOARDING_DISMISSED_KEY = "onboarding-dismissed";
const LANDING_PROMPT_DRAFT_KEY = "landingPromptDraft";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function deriveProjectName(primaryIdea: string) {
  const normalizedIdea = primaryIdea.trim().replace(/\s+/g, " ");

  if (!normalizedIdea) {
    return "Untitled Project";
  }

  const firstSentence = normalizedIdea.split(/[.!?]/)[0]?.trim() || normalizedIdea;

  if (firstSentence.length <= 60) {
    return firstSentence;
  }

  return `${firstSentence.slice(0, 57).trimEnd()}...`;
}

function buildProjectDescription({ primaryIdea, url, targetUser, mainUncertainty }: OnboardingIntake) {
  return [
    primaryIdea.trim(),
    targetUser.trim() ? `Target user: ${targetUser.trim()}` : null,
    mainUncertainty.trim() ? `Main uncertainty: ${mainUncertainty.trim()}` : null,
    url.trim() ? `Reference URL: ${url.trim()}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [prefilledOnboardingIntake, setPrefilledOnboardingIntake] = useState<Partial<OnboardingIntake>>({});
  const [importedLandingDraft, setImportedLandingDraft] = useState("");

  useEffect(() => {
    void trackEvent("dashboard_view", {
      page: "/dashboard",
    });

    getProjects().then((loadedProjects) => {
      const landingPromptDraftRaw = window.sessionStorage.getItem(LANDING_PROMPT_DRAFT_KEY) ?? "";
      const landingPromptDraftTrimmed = landingPromptDraftRaw.trim();
      const shouldShowDraftHandoff = loadedProjects.length === 0 && landingPromptDraftTrimmed.length > 0;

      setPrefilledOnboardingIntake(
        shouldShowDraftHandoff ? parseLandingPromptDraft(landingPromptDraftTrimmed) : {},
      );
      setImportedLandingDraft(shouldShowDraftHandoff ? landingPromptDraftRaw : "");
      setProjects(loadedProjects);
      setShowOnboarding(
        loadedProjects.length === 0 &&
          (shouldShowDraftHandoff || window.localStorage.getItem(ONBOARDING_DISMISSED_KEY) !== "true"),
      );
    });
  }, []);

  const handleOpenOnboarding = () => {
    window.localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
    setPrefilledOnboardingIntake({});
    setImportedLandingDraft("");
    setShowOnboarding(true);
  };

  const handleSkipOnboarding = () => {
    window.localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    window.sessionStorage.removeItem(LANDING_PROMPT_DRAFT_KEY);
    setPrefilledOnboardingIntake({});
    setImportedLandingDraft("");
    setShowOnboarding(false);
  };

  const handleCompleteOnboarding = async (intake: OnboardingIntake) => {
    const project = await createProject();
    const nextProject = {
      ...project,
      name: deriveProjectName(intake.primaryIdea),
      description: buildProjectDescription(intake),
      updatedAt: new Date().toISOString(),
    };

    await saveProject(nextProject);
    void trackEvent(ARTIFACT_INTAKE_SUBMITTED_EVENT, {
      page: "/dashboard",
      project_id: project.id,
      source: "onboarding",
      has_primary_idea: Boolean(intake.primaryIdea.trim()),
      has_url: Boolean(intake.url.trim()),
      has_target_user: Boolean(intake.targetUser.trim()),
      has_main_uncertainty: Boolean(intake.mainUncertainty.trim()),
    });
    void trackEvent("project_created", {
      page: "/dashboard",
      project_id: project.id,
      source: "onboarding",
    });
    window.sessionStorage.removeItem(LANDING_PROMPT_DRAFT_KEY);
    setPrefilledOnboardingIntake({});
    setImportedLandingDraft("");
    setShowOnboarding(false);
    window.location.href = `/project/${project.id}`;
  };

  return (
    <main className="min-h-screen bg-[#faf7f2]">
      <OnboardingModal
        open={showOnboarding}
        initialIntake={prefilledOnboardingIntake}
        importedLandingDraft={importedLandingDraft}
        onComplete={(intake) => void handleCompleteOnboarding(intake)}
        onSkip={handleSkipOnboarding}
      />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-3">
          <BrandMark className="h-11 w-11 shrink-0" />
          <div>
            <div className="text-base font-semibold tracking-[-0.02em] text-stone-900">AI Cofounder</div>
            <div className="text-sm font-medium text-stone-500">Your projects</div>
          </div>
        </Link>
        <AuthButton redirectTo="/dashboard" />
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Workspace</div>
            <h1 className="mt-3 text-4xl font-semibold text-stone-950">Your Projects</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
              Start a new company idea, collect evidence, and shape it with your AI cofounder.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenOnboarding}
            className="rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
          >
            New Project
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={handleOpenOnboarding}
            className="group flex min-h-64 flex-col justify-between rounded-[28px] border border-dashed border-stone-300 bg-white/70 p-7 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-stone-500 hover:bg-white"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-950 text-2xl text-white transition group-hover:bg-stone-800">
              +
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-stone-900">New Project</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                Create a workspace with starter notes, chat history, and a phased build plan.
              </p>
            </div>
          </button>

          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/project/${project.id}`}
              className="group flex min-h-64 flex-col justify-between rounded-[28px] border border-stone-200 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div>
                <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700">
                  {project.phase}
                </div>
                <h2 className="mt-5 text-2xl font-semibold text-stone-950">{project.name}</h2>
                <p className="mt-3 text-sm leading-7 text-stone-600">{project.description}</p>
              </div>
              <div className="flex items-center justify-between text-sm text-stone-500">
                <span>{project.notes.length} notes</span>
                <span>Updated {formatDate(project.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
