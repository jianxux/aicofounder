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

function buildDraftPreview(draft: string) {
  const normalizedDraft = draft.trim().replace(/\s+/g, " ");

  if (normalizedDraft.length <= 140) {
    return normalizedDraft;
  }

  return `${normalizedDraft.slice(0, 137).trimEnd()}...`;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [landingPromptDraft, setLandingPromptDraft] = useState("");
  const [prefilledOnboardingIntake, setPrefilledOnboardingIntake] = useState<Partial<OnboardingIntake>>({});

  useEffect(() => {
    void trackEvent("dashboard_view", {
      page: "/dashboard",
    });

    getProjects().then((loadedProjects) => {
      const nextLandingPromptDraft = window.sessionStorage.getItem(LANDING_PROMPT_DRAFT_KEY)?.trim() ?? "";
      const shouldShowDraftHandoff = loadedProjects.length === 0 && nextLandingPromptDraft.length > 0;

      setLandingPromptDraft(nextLandingPromptDraft);
      setPrefilledOnboardingIntake(
        shouldShowDraftHandoff ? parseLandingPromptDraft(nextLandingPromptDraft) : {},
      );
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
    setShowOnboarding(true);
  };

  const handleOpenDraftHandoff = () => {
    if (!landingPromptDraft) {
      handleOpenOnboarding();
      return;
    }

    window.localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
    setPrefilledOnboardingIntake(parseLandingPromptDraft(landingPromptDraft));
    setShowOnboarding(true);
  };

  const handleSkipOnboarding = () => {
    window.localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    window.sessionStorage.removeItem(LANDING_PROMPT_DRAFT_KEY);
    setLandingPromptDraft("");
    setPrefilledOnboardingIntake({});
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
    setShowOnboarding(false);
    window.location.href = `/project/${project.id}`;
  };

  return (
    <main className="min-h-screen bg-[#faf7f2]">
      <OnboardingModal
        open={showOnboarding}
        initialIntake={prefilledOnboardingIntake}
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

        {projects.length > 0 && landingPromptDraft ? (
          <section
            aria-label="Saved landing page draft"
            className="mb-8 rounded-[28px] border border-amber-200 bg-amber-50/80 p-6 shadow-sm"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
                  Saved draft from the landing page
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-stone-950">Keep building from your last idea</h2>
                <p className="mt-3 text-sm leading-7 text-stone-700">
                  You already have projects here, but this saved draft came from the landing page and can
                  become a separate new project whenever you are ready.
                </p>
                <p className="mt-4 rounded-[20px] border border-amber-200/80 bg-white/80 px-4 py-3 text-sm leading-7 text-stone-700">
                  {buildDraftPreview(landingPromptDraft)}
                </p>
              </div>

              <div className="flex shrink-0 items-start">
                <button
                  type="button"
                  onClick={handleOpenDraftHandoff}
                  className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
                >
                  Start a project from this draft
                </button>
              </div>
            </div>
          </section>
        ) : null}

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
