# Product Recommendations for AI Cofounder

Derived from:
- `docs/competitor-comparison-memo.md`
- `docs/competitive-research-patterns.md`

## Recommendation 1: Make every major run produce a first-class artifact
- Priority: P0
- Suggested build order: 1
- Rationale: Direct competitors win the first session by returning a bounded output such as a scorecard, report, or plan. Adjacent tools retain users by saving that output as a reusable project object instead of a disposable chat answer.
- Expected user impact: Founders get a clearer first win, can reopen prior work quickly, and understand what the product is for after one run.
- What to build:
  - Start with one artifact foundation model and launch only the first 2 highest-value artifact types initially: validation scorecard and customer research memo.
  - Default research/chat flows to creating or updating one of those artifacts.
  - Show artifact type and status prominently in the workspace.
  - Add success criteria for the first rollout, such as artifact creation rate and follow-up edit rate.

## Recommendation 2: Add visible research steps and trust signals to research-heavy outputs
- Priority: P0
- Suggested build order: 2
- Rationale: The clearest market gap is trust. Most direct competitors package outputs well but do not visibly show source scope, citations, contradictions, or thin-evidence areas. Notion and Perplexity-style transparency makes research feel credible.
- Expected user impact: Users can judge whether to trust a recommendation, spot weak evidence faster, and use the product for higher-stakes validation work.
- What to build:
  - Display a staged run state: objective, source selection, evidence gathering, synthesis, next actions.
  - Add citation anchors, source lists, and a short "evidence quality" section to each research artifact.
  - Explicitly call out unknowns, contradictions, and follow-up questions.

## Recommendation 3: Keep entry friction low, then progressively structure the project
- Priority: P0
- Suggested build order: 3
- Rationale: ValidatorAI, DimeADozen, and VenturusAI reduce activation cost with a simple idea prompt, URL input, or file upload. Upmetrics then shows the value of moving users into structured refinement once enough context exists.
- Expected user impact: Faster activation for new users and less blank-page paralysis after the first result.
- What to build:
  - Start with one primary idea input plus optional enrichers: URL, target user, and main uncertainty.
  - Delay attachments until file constraints, storage rules, and privacy handling are explicitly defined.
  - After first output, route the user into structured fields tied to the chosen artifact while preserving a freeform chat fallback.
  - Use guided prompts instead of leaving users in a generic chat.

## Recommendation 4: Make follow-up interactions edit the same artifact by default
- Priority: P1
- Suggested build order: 4
- Rationale: Better adjacent tools preserve continuity by iterating on the same object. Re-generating new standalone outputs each turn creates clutter and weakens project memory.
- Expected user impact: Less duplication, easier refinement, and clearer project state across sessions.
- What to build:
  - Give artifacts stable identities and revision history.
  - Route follow-up prompts to "update current artifact" unless the user asks for a variant.
  - Preserve artifact-level context for report Q&A and refinements.

## Recommendation 5: Use multi-surface rendering over one shared project state
- Priority: P1
- Suggested build order: 5
- Rationale: Different startup tasks want different surfaces. A narrative memo, scorecard, table, and mind map should be alternate views over the same project facts rather than disconnected outputs.
- Expected user impact: Users can move from analysis to planning more fluidly and choose the right view for the job without losing context.
- What to build:
  - Prove this on one artifact family first instead of across the whole workspace.
  - Define the minimum shared project data needed to render that artifact as two views, such as memo and scorecard.
  - Add view-switching for that narrow slice before expanding to tables and canvas diagrams.
  - Keep edits synchronized across views only after the single-artifact flow is stable.

## Recommendation 6: Treat project memory as explicit facts tied to artifacts
- Priority: P1
- Suggested build order: 6
- Rationale: Durable memory is strongest when it is visible and structured. The product should remember ICP, constraints, hypotheses, experiments, and validated findings as project facts, not only as chat transcript residue.
- Expected user impact: Better continuity across sessions, less repeated prompting, and more grounded recommendations.
- What to build:
  - Promote key project facts from completed artifacts into shared memory.
  - Show what facts were saved and where they came from.
  - Let future runs reuse those facts with artifact references.

## Recommendation 7: Use named frameworks selectively to make outputs easier to inspect
- Priority: P2
- Suggested build order: 7
- Rationale: Frameworks such as SWOT, Five Forces, and experiment plans make generated analysis easier to skim and challenge, but they should support evidence rather than replace it.
- Expected user impact: Faster comprehension of outputs and easier comparison between ideas or iterations.
- What to build:
  - Add framework templates to relevant artifact types.
  - Pair each framework section with evidence and citations.
  - Keep framework usage optional where it would add noise.

## Recommendation 8: Keep visual thinking inside the same workspace
- Priority: P2
- Suggested build order: 8
- Rationale: Miro’s strongest pattern is not just diagram generation, but editable diagrams living beside notes and docs on the same canvas. That matches AI Cofounder’s canvas direction.
- Expected user impact: Better transition from research to synthesis to planning without context switching.
- What to build:
  - Keep generated mind maps and diagrams editable on the existing canvas.
  - Link diagram nodes back to source artifacts or project facts.
  - Support using diagrams as planning tools, not just brainstorm snapshots.

## Recommended build sequence
1. Artifact-first runs
2. Research transparency and trust signals
3. Low-friction intake with structured follow-through
4. In-place artifact editing and revision history
5. Shared project state with multiple views
6. Explicit project memory tied to artifacts
7. Framework-based output templates
8. Deeper canvas integration for diagrams and planning

## Near-term product direction
AI Cofounder should position around a single workflow: capture an idea quickly, produce a startup-specific artifact, show how the research was done, save the result into durable project memory, and let the founder keep refining the same work across memo, scorecard, and canvas views.
