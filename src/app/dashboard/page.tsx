"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthButton from "@/components/AuthButton";
import BrandMark from "@/components/BrandMark";
import OnboardingModal, {
  STARTER_BRIEFS,
  type OnboardingIntake,
  type OnboardingStarterBrief,
} from "@/components/OnboardingModal";
import { ARTIFACT_INTAKE_SUBMITTED_EVENT, trackEvent } from "@/lib/analytics";
import { applyOnboardingStarterContent, createProject, getProjects, saveProject } from "@/lib/projects";
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
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isBootstrappingProjects, setIsBootstrappingProjects] = useState(true);
  const [projectsLoadError, setProjectsLoadError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingInitialIntake, setOnboardingInitialIntake] = useState<Partial<OnboardingIntake>>({});
  const [isSubmittingOnboarding, setIsSubmittingOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const hasProjects = projects.length > 0;
  const showEmptyStateGuide = !isBootstrappingProjects && !projectsLoadError && !hasProjects && !showOnboarding;

  useEffect(() => {
    let isActive = true;

    void trackEvent("dashboard_view", {
      page: "/dashboard",
    });

    const loadProjects = async () => {
      try {
        const loadedProjects = await getProjects();

        if (!isActive) {
          return;
        }

        const landingPromptDraft = window.sessionStorage.getItem(LANDING_PROMPT_DRAFT_KEY)?.trim() ?? "";
        const shouldShowDraftHandoff = loadedProjects.length === 0 && landingPromptDraft.length > 0;

        setProjectsLoadError(null);
        setOnboardingInitialIntake(
          shouldShowDraftHandoff
            ? {
                primaryIdea: landingPromptDraft,
              }
            : {},
        );
        setProjects(loadedProjects);
        setShowOnboarding(
          loadedProjects.length === 0 &&
            (shouldShowDraftHandoff || window.localStorage.getItem(ONBOARDING_DISMISSED_KEY) !== "true"),
        );
      } catch {
        if (!isActive) {
          return;
        }

        setProjects([]);
        setProjectsLoadError("We couldn't load your projects. You can still start a new project.");
        setOnboardingInitialIntake({});
        setShowOnboarding(false);
      } finally {
        if (isActive) {
          setIsBootstrappingProjects(false);
        }
      }
    };

    void loadProjects();

    return () => {
      isActive = false;
    };
  }, []);

  const handleOpenOnboarding = (initialIntake?: Partial<OnboardingIntake>) => {
    const landingPromptDraft = window.sessionStorage.getItem(LANDING_PROMPT_DRAFT_KEY)?.trim() ?? "";

    setOnboardingError(null);
    setOnboardingInitialIntake(
      initialIntake ?? (landingPromptDraft ? { primaryIdea: landingPromptDraft } : {}),
    );
    setShowOnboarding(true);
  };

  const handleOpenStarterBrief = (starter: OnboardingStarterBrief) => {
    handleOpenOnboarding({
      primaryIdea: starter.primaryIdea,
      url: starter.url,
      targetUser: starter.targetUser,
      mainUncertainty: starter.mainUncertainty,
    });
  };

  const handleCloseOnboarding = () => {
    setOnboardingError(null);
    setShowOnboarding(false);
  };

  const handleSkipOnboarding = () => {
    window.localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    window.sessionStorage.removeItem(LANDING_PROMPT_DRAFT_KEY);
    setOnboardingError(null);
    setOnboardingInitialIntake({});
    setShowOnboarding(false);
  };

  const handleCompleteOnboarding = async (intake: OnboardingIntake) => {
    if (isSubmittingOnboarding) {
      return;
    }

    setIsSubmittingOnboarding(true);
    setOnboardingError(null);

    try {
      const project = await createProject();
      const nextProject = applyOnboardingStarterContent(project, intake);
      const personalizedProject = {
        ...nextProject,
        name: deriveProjectName(intake.primaryIdea),
        description: buildProjectDescription(intake),
        updatedAt: new Date().toISOString(),
      };

      await saveProject(personalizedProject);
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
      setOnboardingInitialIntake({});
      setShowOnboarding(false);
      router.push(`/project/${project.id}`);
    } catch {
      setOnboardingError("We couldn't create your project. Please try again.");
    } finally {
      setIsSubmittingOnboarding(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#faf7f2]">
      <OnboardingModal
        open={showOnboarding}
        initialIntake={onboardingInitialIntake}
        onComplete={(intake) => void handleCompleteOnboarding(intake)}
        onClose={handleCloseOnboarding}
        onSkip={handleSkipOnboarding}
        isSubmitting={isSubmittingOnboarding}
        submissionError={onboardingError}
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
            onClick={() => handleOpenOnboarding()}
            className="rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
          >
            New Project
          </button>
        </div>

        {projectsLoadError ? (
          <div
            role="alert"
            className="mb-8 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950"
          >
            {projectsLoadError}
          </div>
        ) : null}

        {showEmptyStateGuide ? (
          <section className="mb-8 rounded-[32px] border border-stone-200 bg-white/80 p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">First project</div>
                <h2 className="mt-3 text-3xl font-semibold text-stone-950">Start with a brief, not a blank page</h2>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  Your first session turns one founder idea into a sharper project brief with a target user, core
                  assumption, and recommended next steps for discovery.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenOnboarding()}
                  className="mt-5 rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
                >
                  Start your first project
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:max-w-2xl">
                {STARTER_BRIEFS.map((starter) => (
                  <button
                    key={starter.title}
                    type="button"
                    onClick={() => handleOpenStarterBrief(starter)}
                    className="rounded-[24px] border border-stone-200 bg-[#fcfbf8] p-4 text-left transition hover:-translate-y-0.5 hover:border-stone-400 hover:bg-white"
                  >
                    <div className="text-sm font-semibold text-stone-900">{starter.title}</div>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{starter.summary}</p>
                    <div className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Use this starter
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={() => handleOpenOnboarding()}
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
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-stone-600">{project.description}</p>
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
