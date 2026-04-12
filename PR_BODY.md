## Summary
- add three starter briefs to onboarding step 2 so founders can begin from a concrete example instead of a blank form
- prefill the existing intake fields from a chosen starter while keeping starter URLs blank to avoid misleading sample data
- make starter selection visible and accessible, then clear the selected state when the founder edits the brief manually

## What changed
- added a `STARTER_BRIEFS` dataset in `src/components/OnboardingModal.tsx` with three example use cases:
  - Customer research copilot
  - Ops assistant for clinics
  - Retail demand planner
- added a new "Starter briefs" section to onboarding step 2 with button-based cards
- wired starter selection to prefill `primaryIdea`, `targetUser`, `mainUncertainty`, and `url`
- added selected-state handling with `aria-pressed` plus visual styling for the active starter
- cleared selected starter state whenever the user edits an intake field so the UI does not overstate that the unchanged template is still active
- expanded `src/components/__tests__/OnboardingModal.test.tsx` to cover:
  - starter brief rendering
  - prefill behavior
  - selected-state switching
  - blank URL behavior
  - clearing selected state after manual edits

## Why this change
AI Cofounder’s onboarding already asks good discovery questions, but step 2 still relies on founders inventing a clean brief from scratch. That creates unnecessary blank-state friction at exactly the moment the product should feel easiest to start.

This change makes the first meaningful action easier: a founder can choose a plausible starting brief, see how a good intake looks, and then adapt it. The implementation stays narrow and preserves the existing flow, while directly addressing the activation gap between "I have a rough idea" and "I can fill this form confidently."

## Competitor/benchmark observations
- Lovable foregrounds a low-friction idea-to-product flow with explicit starter language like "Start with an idea" and shows how users can move from a rough description toward something concrete: https://lovable.dev
- Maze emphasizes templates and structured starting points across research workflows, reducing the cost of getting started when users do not yet have a polished plan: https://maze.co
- Durable pushes fast time-to-value in its hero and reduces setup hesitation by making the first step feel immediate and guided rather than open-ended: https://durable.co
- Dovetail frames customer understanding through a staged system rather than a blank canvas, reinforcing the value of guided entry points in research-heavy products: https://dovetail.com

## Files changed
- `src/components/OnboardingModal.tsx`
- `src/components/__tests__/OnboardingModal.test.tsx`

## Validation
- `npm test -- src/components/__tests__/OnboardingModal.test.tsx` ✅ (17 tests passed)
- `npm run build` ✅
- final review pass from an isolated code-quality reviewer ✅

## Risks / follow-ups
- The current starter briefs are static examples; later we may want to tune the examples based on the most common founder use cases or observed onboarding analytics.
- `next build` still emits the existing multi-lockfile workspace-root warning; this change does not introduce that warning, but the repo could clean it up separately.
