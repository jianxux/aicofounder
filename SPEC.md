# Spec — 5B Add citations/source collection and structured output for research sessions

## Task
Implement the next unchecked task from `TASKS.md`: **Add citations/source collection and structured output for research sessions**.

## Why
Deep research already returns sections and citations, but the run artifact is still too thin for founder trust. We need first-class source collection and richer structured output so each report clearly shows provenance, evidence limitations, and source quality.

## Scope
- Extend the research domain model to persist a richer source inventory for each run.
- Preserve structured provenance metadata per source/citation, including source type, recency/publication signal when available, and accessibility status.
- Expand report output so a research session can surface:
  - key findings with explicit citation IDs
  - caveats / evidence limitations
  - contradictions
  - unanswered questions or next-step gaps when evidence is weak
- Keep backward compatibility with the current UI and stored artifacts where practical.
- Update the workspace report rendering to display the new structured sections in a readable way.

## Likely files
- `src/lib/research.ts`
- `src/lib/types.ts`
- `src/components/ResearchReport.tsx`
- Any API / orchestration glue already used by deep research
- New or updated Vitest test files for research logic and rendering

## Design requirements
1. Add a first-class `ResearchSource`/equivalent type and persist selected/rejected source collection metadata on the run artifact.
2. Ensure every major/key finding references one or more citation IDs; if not enough evidence exists, record that as caveat/unanswered-question instead of fabricating support.
3. Deduplicate cleanly by canonical source identity, not just superficial repetition.
4. Preserve existing section-level citations so old report consumers do not break.
5. Keep the system honest: partial/weak evidence should remain visible in the artifact and UI.

## Edge cases
- Duplicate citations from the same source across sections
- Sources with URL but no publication date
- Non-URL sources (community threads, analyst notes, docs without direct links)
- Partial runs with sections but weak evidence for some findings
- Old artifacts missing new fields
- Invalid or empty structured sections returned by the model

## Acceptance criteria
- Research artifacts include structured source collection metadata and richer structured report fields.
- Key findings in the final report link back to stored citation IDs.
- Reports expose caveats/limitations/contradictions in a founder-readable way.
- Existing research sections still validate and render.
- Vitest tests cover the changed logic/components and changed code reaches at least 90% coverage.
- `npm run test:coverage` and `npm run build` pass.
