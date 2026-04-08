# AI Agents Architecture Spec

## Goal
Add durable agent memory to AI Cofounder so customer conversations, research work, and project context can survive long chats and multiple sessions without forcing `/api/chat` to re-send the last N raw messages every turn.

The design is inspired by `claude-code-sourcemap`: store structured memory artifacts, compress context over time, and retrieve the most relevant slices with cheap text search before every agent turn.

## Non-goals
- Build a fully autonomous background agent platform in this phase
- Replace the existing `messages` table immediately
- Add embeddings/vector search as a hard dependency for v1
- Share memory across users or across unrelated projects
- Auto-write long-term memory without confidence thresholds and auditability

## Current-state gaps
Today the app has:
- `projects`, `messages`, `canvas_items`, and `phases` persisted in Supabase
- a stateless `/api/chat` route that mainly sees request-supplied messages
- research and brainstorming outputs stored as normal project artifacts rather than reusable memory records

Current limitations:
1. Long chats become expensive because context is replayed as raw messages.
2. The assistant cannot reliably remember prior decisions, customer pains, constraints, or generated research across sessions.
3. There is no isolation between short-lived working context and durable project knowledge.
4. There is no ranked retrieval layer, so future agent flows will either overstuff prompts or lose important history.
5. There is no audit trail for what memory was retrieved or why a response used it.

## Design principles
1. **Project-first isolation**: memory belongs to a user and a project by default.
2. **Cheap retrieval first**: use Postgres text search + heuristics before adding vectors.
3. **Compression over truncation**: summarize old context instead of dropping it blindly.
4. **Traceable prompts**: every response should be explainable in terms of retrieved memory IDs.
5. **Safe writes**: durable memory promotion must be explicit, deduplicated, and reviewable.

## Memory model
The system uses four layers.

### 1) Working memory
Short-lived turn context assembled immediately before a model call.

Contents:
- latest user message
- recent chat tail (for tone and local continuity)
- current phase + project metadata
- currently open or pinned canvas items
- top retrieved memory hits
- latest compressed summaries

Properties:
- not persisted as one blob
- assembled per request
- constrained by token budget

### 2) Episodic/session memory
Time-bounded records of what happened in a conversation or agent run.

Examples:
- user clarified ICP is "indie hackers selling courses"
- assistant produced a research brief
- brainstorming run found repeated pain points

Properties:
- append-oriented
- scoped to a project and optionally to a session/run
- can expire from hot retrieval once compressed

### 3) Long-term/project memory
Durable facts, decisions, constraints, and reusable findings promoted from episodic memory.

Examples:
- target customer profile
- chosen wedge and positioning
- validated pains with supporting citations
- product constraints, pricing assumptions, launch channels

Properties:
- curated, deduplicated, higher-confidence
- stable enough to reuse across sessions
- editable/auditable

### 4) Compressed summaries
Rolling summaries that condense older chat or agent activity into reusable memory slices.

Types:
- session summary: one conversation/run
- phase summary: a milestone in a project phase
- project summary: durable overall state snapshot

Properties:
- versioned
- linked to source record ranges
- regenerated when stale or contradicted by later facts

## Proposed Supabase schema
New tables extend the existing `projects` / `messages` model.

```sql
create type public.memory_scope as enum ('user', 'project', 'session', 'run');
create type public.memory_kind as enum (
  'fact',
  'decision',
  'constraint',
  'research_finding',
  'customer_quote',
  'task_state',
  'summary'
);
create type public.memory_status as enum ('active', 'superseded', 'archived');

create table public.agent_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  origin text not null default 'chat', -- chat, brainstorm, research, ultraplan
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb
);

create type public.memory_confirmation as enum ('user_confirmed', 'assistant_inferred', 'system_imported');
create type public.summary_level as enum ('session', 'phase', 'project');
create type public.request_kind as enum ('chat', 'brainstorm', 'research', 'ultraplan');

create table public.memory_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid null references public.projects(id) on delete cascade,
  session_id uuid null references public.agent_sessions(id) on delete set null,
  scope public.memory_scope not null default 'project',
  kind public.memory_kind not null,
  title text not null default '',
  content text not null,
  source text not null default 'chat',
  source_message_id uuid null references public.messages(id) on delete set null,
  source_refs jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  importance smallint not null default 3 check (importance between 1 and 5),
  confidence numeric(4,3) not null default 0.750 check (confidence >= 0 and confidence <= 1),
  confirmation_status public.memory_confirmation not null default 'assistant_inferred',
  status public.memory_status not null default 'active',
  supersedes_memory_id uuid null references public.memory_entries(id) on delete set null,
  dedupe_key text null,
  searchable tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memory_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  session_id uuid null references public.agent_sessions(id) on delete set null,
  summary_level public.summary_level not null,
  summary_version integer not null default 1,
  content text not null,
  source_message_start_id uuid null references public.messages(id) on delete set null,
  source_message_end_id uuid null references public.messages(id) on delete set null,
  token_estimate integer not null default 0,
  freshness_score numeric(4,3) not null default 1.000,
  created_at timestamptz not null default now()
);

create table public.memory_retrieval_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  session_id uuid null references public.agent_sessions(id) on delete set null,
  query text not null,
  request_kind public.request_kind not null,
  retrieved_memory_ids uuid[] not null default '{}',
  dropped_memory_ids uuid[] not null default '{}',
  ranking_breakdown jsonb not null default '[]'::jsonb,
  prompt_token_budget integer not null default 0,
  created_at timestamptz not null default now()
);

create index memory_entries_project_idx on public.memory_entries (project_id, created_at desc);
create index memory_entries_scope_idx on public.memory_entries (scope, kind, status);
create index memory_entries_search_idx on public.memory_entries using gin (searchable);
create index memory_entries_tags_idx on public.memory_entries using gin (tags);
create index memory_summaries_project_idx on public.memory_summaries (project_id, created_at desc);
```

### Schema notes
- `messages` remains the raw transcript.
- `memory_entries` stores reusable knowledge units.
- `memory_summaries` stores compressed rollups, not raw transcripts.
- `memory_retrieval_logs` provides observability and prompt auditability.
- `dedupe_key` prevents repeated writes of the same stable fact.
- `confirmation_status` lets retrieval prefer user-confirmed memory over assistant-inferred memory.
- `searchable` is maintained by trigger or application write path.

## RLS and scope isolation
Baseline rules:
- users may only read/write rows where `user_id = auth.uid()`
- project-scoped rows must belong to a project the user owns
- session-scoped rows must reference a project owned by the user
- no cross-project retrieval in customer-facing chat unless explicitly requested later

Expected v1 retrieval scope:
1. same project, active memory entries
2. same project, latest summaries
3. same session/run, recent episodic entries
4. never other users

Future option:
- user-level reusable founder profile memory, opt-in only, with separate retrieval path

## Write pipeline
### Raw event ingestion
When a user sends a message or an agent produces output:
1. persist the raw `messages` row as today
2. create/update an `agent_sessions` row for the active interaction
3. enqueue a lightweight extraction job through an outbox/event table (or existing background job mechanism) so writes are retryable and idempotent
4. allow an inline extraction fast-path only for very small turns where latency is acceptable
5. write candidate `memory_entries` when the content crosses confidence thresholds

### Memory extraction rules
Promote content into `memory_entries` only if it is one of:
- explicit user preference or constraint
- durable project fact
- decision with rationale
- validated research finding or customer quote
- task/progress state useful for future turns

Do not promote:
- filler chat
- repeated assistant phrasing
- speculative claims without support
- secrets unless explicitly required for project execution

### Deduping and supersession
- compute `dedupe_key` from normalized `(kind, scope, canonical_subject)`
- if new content conflicts with an existing active entry, mark old row `superseded` and link `supersedes_memory_id`
- preserve history; never hard-delete due to contradiction alone

## Context compression pipeline
Compression keeps prompts small without erasing useful history.

### Trigger conditions
Run compression when any of the below is true:
- chat transcript exceeds message-count threshold (for example 40 messages)
- estimated replay tokens exceed budget
- agent run completes with large output
- phase changes

### Compression stages
1. **Segment** raw messages into coherent windows (conversation chunks, research runs, brainstorm runs).
2. **Summarize** each window into facts, decisions, open questions, and unresolved risks.
3. **Validate** summary against source snippets to avoid hallucinated compression.
4. **Persist** a `memory_summaries` row and promote any durable facts as `memory_entries`.
5. **Age down** older episodic items in retrieval ranking once a verified summary exists.

### Summary shape
Each summary should include:
- objective/context
- what changed
- durable facts/decisions
- open questions
- relevant source message IDs
- freshness timestamp and confidence

### Staleness handling
A summary becomes stale when:
- a later memory entry supersedes a key decision/fact
- the project phase changes materially
- the user explicitly revises direction

Stale summaries are not deleted; they receive a lower retrieval score or are regenerated.

## Retrieval design
Use a hybrid of Postgres full-text search plus domain heuristics.

### Query sources
The retrieval query is composed from:
- latest user message
- current phase
- active tool/request kind (`chat`, `brainstorm`, `research`, `ultraplan`)
- pinned/open canvas content titles
- recent unresolved questions

### Retrieval steps
1. Generate a normalized search query string.
2. Fetch candidate `memory_entries` using `tsvector` match, tags overlap, and recent project/session filters.
3. Fetch latest relevant `memory_summaries`.
4. Score and rank all candidates.
5. Keep only the highest-value set that fits the token budget.
6. Log the retrieval decision in `memory_retrieval_logs`.

### Ranking heuristics
Score candidates with weighted signals:
- textual match score (`ts_rank`)
- scope bonus (same session for short continuity, same project for durable facts)
- kind bonus (decisions/constraints outrank generic facts)
- importance weight
- confidence weight
- freshness bonus
- citation/source bonus for research-backed claims
- contradiction penalty if superseded or stale

Example formula:

```text
score =
  (0.35 * text_rank) +
  (0.15 * scope_score) +
  (0.15 * importance_score) +
  (0.10 * confidence_score) +
  (0.10 * freshness_score) +
  (0.10 * kind_priority_score) +
  (0.05 * evidence_score)
  - contradiction_penalty
```

### Retrieval fallback behavior
If search returns little or nothing:
1. use latest project summary
2. use recent session summary
3. use recent raw message tail
4. answer with explicit uncertainty rather than fabricating memory

### Why grep-style search first
- predictable and cheap in Supabase/Postgres
- easy to debug and explain
- sufficient for v1 because most recalled facts are named entities, phrases, decisions, and quotes
- embeddings can be added later as a reranking layer instead of the primary dependency

## Customer-facing Q&A flow
### Request path
1. User sends a chat message in project workspace.
2. Frontend posts to `/api/chat` with current project/session IDs.
3. Server loads project metadata and recent raw messages.
4. Server runs retrieval against `memory_entries` + `memory_summaries`.
5. Server assembles working memory packet.
6. Model answers using:
   - system prompt
   - current user message
   - recent raw turn tail
   - retrieved memory bundle
   - active phase and project metadata
7. Server streams response back to client.
8. After completion, extraction/compression jobs persist new candidate memory.

### Prompt assembly order
Prompt sections should be ordered as:
1. system instructions
2. active phase + project snapshot
3. durable decisions/constraints
4. high-signal retrieved memories
5. latest summary
6. recent chat tail
7. current user request

This keeps durable truth above ephemeral chatter.

### Other flows
- **Brainstorming**: retrieval prioritizes customer pain points, prior rejected ideas, and target audience constraints.
- **Deep research**: retrieval prioritizes existing research summaries, citations, and open questions to avoid repeated searches.
- **Ultraplan**: retrieval prioritizes blockers, dependencies, and unfinished tasks.

## Failure modes and fallbacks
### Bad extraction
Risk: assistant writes incorrect durable memory.
Mitigation:
- confidence thresholding
- quote/source references
- `confirmation_status` on each entry so ranking can prefer user-confirmed memory
- allow supersession instead of overwrite

### Over-retrieval / noisy prompts
Risk: prompt is stuffed with irrelevant memory.
Mitigation:
- hard token budget per memory section
- aggressive ranking and dedupe
- prefer summaries over many low-signal raw items

### Under-retrieval
Risk: assistant misses important context.
Mitigation:
- guaranteed inclusion of latest project summary
- guaranteed inclusion of active decisions/constraints above importance threshold
- retrieval logs for offline tuning

### Contradictory state
Risk: old and new decisions both appear.
Mitigation:
- supersession links
- contradiction penalty in ranking
- prompt builder excludes superseded rows by default

### Multi-tab / concurrent writes
Risk: duplicate entries and racing summaries.
Mitigation:
- idempotent dedupe keys
- append-first design
- async summary jobs keyed by message range

### Searchable field drift
Risk: `searchable` vector falls out of sync.
Mitigation:
- database trigger or shared write helper
- periodic repair job

## Privacy and security
- Apply RLS on all new memory tables from day one.
- Do not retrieve across users.
- Default to project-scoped memory only in customer chat.
- Avoid storing secrets/API keys as memory entries.
- Keep source references so sensitive memories can be traced and removed.
- Sanitize logs so retrieval telemetry stores IDs and scores, not full prompt payloads where unnecessary.
- Add retention limits for retrieval logs and summary/debug artifacts.
- Add admin/debug tooling only behind authenticated owner access.

## Observability and metrics
Track:
- retrieval hit rate
- empty retrieval rate
- average retrieved memory count per turn
- summary generation success/failure
- prompt token usage before/after compression
- percentage of responses using summaries vs raw transcript only
- contradiction/supersession rate
- user-visible correction rate (user says the assistant forgot or got context wrong)

Store:
- retrieval logs in `memory_retrieval_logs`
- summary job outcomes in app logs / events
- per-request debug metadata for internal review

Success metrics for rollout:
- lower average prompt tokens per long conversation
- higher continuity quality in repeated project chats
- less repeated questioning by the assistant
- reduced duplicate research runs

## Implementation plan
### Phase 1 — schema + read path foundation
- add new Supabase tables and RLS
- add TypeScript DB types
- create memory repository layer in `src/lib`
- read latest project summary + active decisions in `/api/chat`

### Phase 2 — extraction + retrieval
- implement candidate memory extraction from chat/research outputs
- implement full-text retrieval and ranking heuristics
- add retrieval logging
- integrate retrieval bundle into `/api/chat`

### Phase 3 — compression
- add session/phase summary generation
- age down old episodic items once summarized
- introduce stale summary regeneration rules

### Phase 4 — broader agent integration
- reuse the same memory layer in brainstorm, research, and ultraplan flows
- add UI/debug affordances for memory traces if needed
- consider vector reranking only after text-search limits are proven

## Testing strategy
### Unit tests
- ranking heuristic scoring and tie-breaking
- dedupe key generation
- supersession behavior
- prompt assembly budget trimming
- summary staleness rules

### Integration tests
- retrieving relevant memory for a chat turn
- excluding superseded or cross-project memory
- compression creating summaries from a message range
- Q&A flow using summary fallback when retrieval is empty

### Regression tests
- previously answered project facts remain recallable across sessions
- assistant does not leak memory between two projects owned by same user
- long chat token budget stays within configured threshold

### Coverage target
All changed production code for the future implementation tasks should ship with >=90% unit test coverage. This spec task changes docs only, but the implementation phases defined above must enforce that bar.

## Acceptance criteria
This task is complete when:
1. The repo contains a technical spec document for the AI agents architecture.
2. The spec defines working, episodic, long-term, and summary memory layers.
3. The spec proposes a concrete Supabase/Postgres schema and scope/RLS model.
4. The spec documents write, compression, retrieval, and Q&A read paths.
5. The spec covers ranking heuristics, failure modes, privacy/security, and observability.
6. The spec includes a phased rollout and explicit testing strategy.
7. `TASKS.md` marks the architecture-spec task complete.

## Recommended follow-up tasks
These map directly to the remaining queue:
1. Implement the schema and persistence layer.
2. Implement compression jobs and summary validation.
3. Implement retrieval/ranking with tests.
4. Integrate the memory bundle into `/api/chat` and research flows.
5. Add regression coverage around continuity and isolation.
