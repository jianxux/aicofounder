# Framework Templates Spec

## Task
Implement optional framework-based output templates for AI Cofounder so artifact outputs can be rendered as structured frameworks when that improves readability, without forcing a framework into every response.

## Goal
Support four optional framework templates:
- SWOT
- Five Forces
- Problem-solution fit
- Validation experiment planning

The feature should work inside the existing artifact-centric workspace, remain backward compatible with existing stored artifacts/reports, and keep framework content tied to the current artifact rather than introducing a new artifact family.

## Proposed approach
1. **Add typed framework models**
   - Extend the relevant shared types so an artifact/report can optionally include a structured framework block.
   - Keep framework data optional and nullable.
   - Include enough structure to render each of the four frameworks predictably.
   - Prefer one discriminated union over loose stringly-typed blobs.

2. **Prompting / selection guidance**
   - Update the AI system prompt or related prompt helpers so the model knows:
     - frameworks are optional,
     - it should only choose one when readability materially improves,
     - it should avoid framework theater / unsupported filler,
     - framework content must stay grounded in the active artifact and any available evidence.
   - Make sure validation-oriented frameworks are preferred for validation scorecards and market-structure frameworks are preferred for research memos where appropriate.

3. **Normalization + compatibility**
   - Ensure any normalization / hydration logic accepts framework-free historical data.
   - Unknown or malformed framework payloads should be ignored safely rather than breaking project loading.

4. **UI rendering**
   - Render framework sections in the workspace for artifacts that carry them.
   - Preserve current rendering when no framework exists.
   - Keep the layout readable on narrow screens.
   - Empty framework sections should not render blank chrome.

5. **Tests**
   - Add or update unit/component tests for:
     - type guards / normalization / backward compatibility,
     - prompt guidance inclusion,
     - rendering of each supported framework or at minimum representative framework rendering plus per-type coverage in normalization,
     - ignoring malformed/unknown framework payloads,
     - no-framework behavior.

## Suggested file touch points
- `src/lib/types.ts`
- `src/lib/prompts.ts`
- `src/components/ResearchReport.tsx`
- any validation scorecard display component(s) / project page components where artifact content is rendered
- related tests under `src/lib/__tests__`, `src/components/__tests__`, and `src/app/project/[id]/__tests__` as needed

## Edge cases
- No framework selected
- Existing artifacts/revisions with no framework data
- Unknown framework type in persisted data
- Known framework with empty sections
- Framework attached to the wrong artifact context
- Partial framework payloads from model output

## Acceptance criteria
- All four framework types are supported in typed data structures and safe normalization.
- Framework usage is optional, not mandatory.
- Existing artifact flows continue to work unchanged when no framework is present.
- Workspace UI renders framework blocks when present and skips them when absent.
- Tests pass with >=90% coverage for changed code via `vitest run --coverage`.
- Build passes.
