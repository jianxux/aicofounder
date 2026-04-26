# AI Cofounder

AI Cofounder is a founder workflow app for turning rough product ideas into structured projects, research artifacts, and next-step plans.

## Supported features

### Landing and onboarding
- Prompt-first landing flow for founder ideas
- Guided example launchers for common founder workflows
- Structured landing-to-onboarding handoff
- Session-stored draft preservation between landing and dashboard
- Continue-to-workspace flow for signed-in users
- Onboarding intake for:
  - primary idea
  - relevant URL
  - target user
  - main uncertainty

### Dashboard and project creation
- Dashboard project grid
- Empty-state onboarding guidance for first project creation
- Starter brief shortcuts to prefill onboarding
- New project creation from onboarding intake
- Duplicate-submission protection during project creation
- Visible project creation failure state
- Project cards with phase, description, note count, and updated date

### Workspace
- Project snapshot panel summarizing:
  - project brief
  - target user
  - main uncertainty
  - reference URL
  - current phase
  - current focus
  - artifact/task progress
- Workspace save status surface:
  - Saved
  - Saving
  - Sync failed
  - Retry
- Realtime refresh handling with optimistic state protection
- Artifact switching and active phase switching

### Artifacts and outputs
- Validation scorecard support
- Customer research memo support
- Research memo dual-view experience
- Framework template panel
- Ultraplan report support
- Brainstorm results support
- Project memory panel

### Chat and persistence
- Persisted project chat history
- Streaming assistant responses into project state
- Follow-up artifact refinement flows
- Create/update project persistence flows

## Notes
- Landing draft handoff should use the shared structured parser consistently across dashboard entry points.
- Supporting behaviors should be documented alongside headline features when PRs affect onboarding, handoff, or project creation semantics.
