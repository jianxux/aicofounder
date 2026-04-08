# Auto-Research Adaptation Spec

## Goal
Adapt the architecture patterns from [`karpathy/autoresearch`](https://github.com/karpathy/autoresearch) into an AI Cofounder research system that can turn a founder's rough idea into a bounded, cited, reusable research report inside the project workspace.

This is not a literal port. `autoresearch` optimizes model-training experiments; AI Cofounder should reuse the same loop shape for customer and market research:

- plan a bounded experiment
- execute a small number of steps
- score the output
- keep strong findings
- discard weak or duplicate evidence
- persist the run for future turns

Primary source URLs:
- `autoresearch` README: https://github.com/karpathy/autoresearch
- `program.md`: https://raw.githubusercontent.com/karpathy/autoresearch/master/program.md

## Why `autoresearch` is worth copying
`autoresearch` works because it constrains an autonomous agent aggressively:

1. **Tiny editable surface** — one main file changes (`train.py`)
2. **Fixed evaluation harness** — the metric and benchmark are stable
3. **Fixed time budget** — experiments are comparable and cheap
4. **Explicit keep/discard loop** — weak iterations are reverted instead of accreting
5. **Human-authored operating manual** — `program.md` defines the org behavior
6. **Structured logging** — every run leaves behind comparable results

Those principles transfer cleanly to product research, even though the domain changes.

## Non-goals
- Build a fully autonomous internet agent that researches forever
- Replace existing brainstorming or deep research flows in one shot
- Introduce open-ended browsing without cost and stopping controls
- Add embeddings/vector search as a hard requirement for v1
- Auto-publish conclusions without source inspection and citation capture
- Auto-promote findings into long-term memory in v1
- Ship resumable multi-run orchestration in v1

## v1 invariants
The first implementation should guarantee only a few things:
- one bounded research run per user action
- explicit report artifacts with preserved citations
- deterministic schema validation on final output
- hard query/source/runtime budgets
- no hidden “memory truth”; saved reports are artifacts, not silently promoted facts

Anything beyond that is best-effort and should be described as such in the UI.

## Current AI Cofounder gap
Today the product can brainstorm and generate reports, but it does not yet have a dedicated **auto-research run model** with:
- a bounded research plan
- explicit step-by-step execution state
- source/citation capture as first-class data
- scoring and deduping of findings
- reusable research memory that later chat turns can reload

The result is that research feels like a one-off answer rather than a durable project artifact.

## Concept mapping: `autoresearch` -> AI Cofounder
| `autoresearch` concept | Purpose | AI Cofounder equivalent |
| --- | --- | --- |
| `program.md` | Human-authored research-org rules | Auto-research system prompt + run policy + planner rubric |
| `train.py` | Narrow editable surface | `ResearchRunSpec` / query plan artifact |
| `prepare.py` | Fixed harness and constraints | Fixed toolset, source policy, output schema, and budget controls |
| 5-minute training run | Comparable bounded experiment | Time/token/step-bounded research run |
| `val_bpb` | Stable success metric | Research quality gates: citation coverage, source diversity, contradiction handling, unanswered questions, schema completeness |
| `results.tsv` | Comparable experiment log | Durable research run table + findings + citations + final report |
| keep/discard/reset | Avoid clutter from weak experiments | Keep verified findings, drop duplicates/low-confidence claims, retry only within budget |

## Product use cases
The v1 system should support:
1. **Pain-point discovery** from a rough startup idea or ICP
2. **Market understanding** for a niche, workflow, or customer segment
3. **Problem validation** using community, review, and public web evidence
4. **Research handoff** into brainstorming, phase guidance, and ultraplan
5. **Reusable memory** so a later turn can ask “what did we learn about creators?” without re-running the crawl

## Proposed architecture
For v1, keep the runtime as a **single bounded pipeline** with three stages:
1. `plan`
2. `gather`
3. `report`

The subcomponents below are responsibilities inside that pipeline, not necessarily separate services or tables yet.

### 1) Research planner
Input:
- project context
- current chat request
- optional ICP / audience / problem statement
- relevant prior memory summaries

Output: `ResearchRunSpec`

```ts
export type ResearchRunSpec = {
  objective: string;
  subquestions: string[];
  searchQueries: string[];
  sourceTypes: Array<"community" | "competitor" | "search" | "docs" | "reviews">;
  limits: {
    maxSearchQueries: number;
    maxFetchedSources: number;
    maxDeepReads: number;
    maxRuntimeMs: number;
    maxTokens: number;
  };
  deliverable: {
    reportType: "pain-points" | "market-map" | "customer-voice" | "competitor-brief";
    requiredSections: string[];
  };
};
```

Planner rules:
- narrow the research objective to one concrete job
- decompose fuzzy prompts into 3-7 answerable subquestions
- generate a small search set instead of an unbounded crawl
- require a deliverable schema up front

### 2) Research orchestrator
The orchestrator executes the run spec in stages:
1. normalize objective
2. run search queries
3. select promising sources
4. fetch and extract evidence
5. synthesize findings
6. score quality
7. persist report + citations + reusable memory

This is the main analogue to `autoresearch`'s experiment loop.

### 3) Source collector
Responsibilities:
- capture URL, title, snippet, domain, fetch time
- classify source type
- dedupe repeated URLs or near-duplicates
- store extraction status and failures

### 4) Evidence extractor
Turns a fetched source into normalized evidence:

```ts
export type ResearchEvidence = {
  sourceId: string;
  claim: string;
  quote?: string;
  confidence: number;
  topicTags: string[];
  supportsObjective: boolean;
  contradictionKey?: string;
};
```

Rules:
- prefer concrete claims over generic summaries
- attach direct quotes when available
- drop evidence that does not support the run objective
- mark contradictory evidence explicitly instead of flattening it away

### 5) Report synthesizer
Produces a structured report that is renderable in chat and on the canvas.

```ts
export type ResearchReport = {
  summary: string;
  keyFindings: Array<{
    title: string;
    detail: string;
    confidence: number;
    citationIds: string[];
  }>;
  openQuestions: string[];
  contradictions: string[];
  recommendedNextSteps: string[];
};
```

### 6) Report persistence (not auto-memory)
For v1, the run should save an explicit research artifact that later turns can reference, but it should **not** auto-promote findings into long-term memory.

Save:
- final structured report
- cited findings
- unanswered questions
- provenance metadata (timestamp, domains, source count)

If memory promotion is added later, it must require provenance, freshness metadata, and an explicit supersession model.

## Run lifecycle
1. **User entry point**
   - “Research this idea” button or slash-style action from chat/workspace
2. **Plan creation**
   - AI generates `ResearchRunSpec`
3. **User-visible kickoff state**
   - show objective, subquestions, and budget before execution
4. **Execution loop**
   - search -> fetch -> extract -> score -> continue or stop
5. **Synthesis**
   - compile final report with citations and unanswered questions
6. **Persistence**
   - save run, sources, evidence, report, and promoted memory
7. **Workspace rendering**
   - render report card in chat/workspace and optionally pin to canvas

## Quality gates
The v1 evaluation harness should favor **externally checkable** rules over model-self-scored quality.

A research run is shippable only if it passes all required gates:
- **Schema completeness:** all required report sections are populated
- **Citation coverage:** every major finding has at least one stored citation
- **Unsupported-claim ceiling:** no major finding may appear without attached source evidence
- **Fetch success floor:** a minimum number of planned sources must resolve successfully
- **Budget compliance:** run finished within time/token/source limits
- **Unanswered-question honesty:** unresolved subquestions are listed explicitly

Helpful but non-blocking heuristics:
- source diversity
- contradiction surfacing
- evidence strength labeling

These heuristics should inform the report, not masquerade as a deterministic benchmark.

## Safety, budget, and stopping rules
Borrow the spirit of `program.md`: autonomy inside hard bounds.

### Hard limits
- max queries per run
- max fetched sources per run
- max deep reads per run
- max runtime per run
- max token budget per run
- max retries for failed sources

### Stop immediately when
- objective is too vague and cannot be grounded after clarification attempts
- fetched evidence is too weak or too repetitive
- the run exhausts budget before reaching minimum quality gates
- a user manually stops the run
- external tools are unavailable or rate-limited beyond retry budget

### Failure handling
- failed fetch -> retry within a small limit, then record failure
- duplicate citation -> dedupe and continue
- conflicting sources -> surface scoped disagreement, do not force consensus
- empty findings -> produce a “not enough evidence” report instead of hallucinating
- low-quality source mix -> downgrade confidence and say why
- paywall / soft 404 / inaccessible content -> keep the URL record but mark evidence unavailable

## Data model additions
These can be implemented incrementally and do not all need to land in one PR.

```ts
export type ResearchRunStatus = "planned" | "running" | "completed" | "failed" | "cancelled";

export type ResearchRunRecord = {
  id: string;
  projectId: string;
  sessionId?: string;
  objective: string;
  status: ResearchRunStatus;
  plan: ResearchRunSpec;
  startedAt?: string;
  finishedAt?: string;
  metrics: {
    queriesUsed: number;
    sourcesFetched: number;
    deepReadsUsed: number;
    runtimeMs: number;
  };
};
```

Supporting persistence for v1 should start small:
- `research_runs` as the primary durable record
- embedded or closely linked sources/findings/report payloads inside that run record where practical
- defer splitting into many tables until real query/debug pressure appears

Minimum debug fields to persist:
- executed queries
- selected vs rejected sources with reason codes
- extraction failures
- per-finding evidence links

## UX entry points
### Workspace actions
- **Research idea** — start a general customer/market research run
- **Validate pain points** — bias toward community/forum/review evidence
- **Research competitors** — later extension using the same engine

### In-run UX
Show a compact founder-friendly progress card:
- what we are researching
- what we will not cover in this run
- estimated duration
- current step

Operational details such as query counts, budgets, and rejected sources should live behind an expandable debug view.

### Final output
Render a report with:
- executive summary
- key findings
- citations
- contradictions / caveats
- next steps
- “save to canvas” action

## Edge cases
- **Empty idea:** planner should ask one narrow clarifying question or fall back to ICP/problem framing template
- **Too-broad idea:** split into one primary objective and defer secondary questions
- **Conflicting sources:** keep both and explain the segment or condition under which they diverge
- **Forum noise / low-quality content:** label anecdotal evidence clearly and keep it separate from stronger evidence types
- **SEO spam / syndication / duplicate articles:** canonicalize URLs and track duplicate-source relationships
- **Stale sources:** record publication date or recency signal and expose it in the report
- **Paywalls / soft 404s / inaccessible pages:** mark as unavailable rather than pretending they were read
- **Duplicate URLs:** dedupe before extraction
- **Budget exhaustion:** return partial report plus what remains unanswered
- **Interrupted run:** mark cancelled cleanly; resumability is not required for v1

## Implementation plan aligned to remaining 5B tasks

### Completed in this task
- Research `karpathy/autoresearch` architecture and write adaptation spec for AI Cofounder use cases

### Next: 5B.1 orchestrator flow
Implement:
- `ResearchRunSpec` planner
- a single bounded `plan -> gather -> report` pipeline
- budget enforcement and run status transitions
- explicit persistence of executed queries, chosen/rejected sources, and final report artifact

Acceptance criteria:
- one API entry can execute a bounded run end-to-end
- run state is inspectable and persistable
- empty/failure cases produce structured non-hallucinated outputs
- final output passes deterministic schema validation

### Next: 5B.2 UI entry point and rendering
Implement:
- workspace button/menu action
- in-progress progress card
- final report component
- optional canvas save/pin action

Acceptance criteria:
- user can trigger research from the workspace
- progress and final report are visible without opening logs

### Next: 5B.3 citations and structured output
Implement:
- first-class citation records
- source list and per-finding citation mapping
- contradiction, caveat, and evidence-strength sections
- provenance fields such as source type, recency, and accessibility status

Acceptance criteria:
- every key finding links back to stored citations
- duplicate citations are deduped cleanly
- reports make evidence limitations legible to founders

### Next: 5B.4 tests
Add Vitest coverage for:
- planner output shape and budget rules
- deterministic schema validation and unsupported-claim rejection
- source dedupe, canonicalization, and failure handling
- ugly fixtures: conflicting sources, syndicated duplicates, forum-heavy evidence, stale sources, and budget exhaustion
- result formatting, citation attachment, and caveat rendering

## Recommended v1 shape
Keep v1 deliberately narrow:
- one bounded research run at a time per user action
- web/search only; no arbitrary tool explosion
- fixed output schema
- no infinite autonomous loop

That keeps the system aligned with `autoresearch`'s real lesson: autonomy works when the operating surface is small, the evaluation harness is stable, and weak iterations are cheap to discard.