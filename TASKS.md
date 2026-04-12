# AI Cofounder — Task Queue

Tasks for the hourly build cron. Pick the next unchecked item, build it with dual-review, commit with 90%+ test coverage.

## Phase 1: Polish & Tests (Priority)
- [x] Install testing deps (vitest, @testing-library/react, jsdom) and configure
- [x] Unit tests for src/lib/projects.ts (CRUD, edge cases) — 100% coverage
- [x] Unit tests for src/lib/types.ts validation
- [x] Component tests for StickyNote (render, drag events, edit)
- [x] Component tests for PhaseTracker (render, toggle, collapse)
- [x] Component tests for ChatPanel (render, send message, remind)
- [x] Component tests for Canvas (render, add note, zoom)
- [x] Component tests for AuthButton (signed in/out states, fallback)
- [x] Component tests for Dashboard page (project list, create)
- [x] Fix any build errors from `npm run build`

## Phase 2: Core Features
- [x] Real AI chat integration (OpenAI API route at /api/chat)
- [x] Streaming chat responses (SSE or ReadableStream)
- [x] System prompt for AI cofounder persona (critical, structured, guides through phases)
- [x] Auto-advance phases based on chat progress
- [x] Brainstorming agent — search Reddit/communities for pain points
- [x] Deep Research — parallel agents producing cited reports
- [x] Ultraplan — find biggest blocker, create actionable plan

## Phase 3: Canvas & UX
- [x] Multiple note colors (yellow, blue, green, pink, purple)
- [x] Document cards on canvas (rich markdown)
- [x] Sections for grouping canvas items
- [x] Delete notes
- [x] Canvas pan and scroll
- [x] Mobile responsive workspace (stack panels)
- [x] Website builder component

## Phase 4: Persistence & Auth
- [x] Supabase database schema (projects, messages, canvas_items, phases)
- [x] Migrate from localStorage to Supabase
- [x] Real-time sync
- [x] User onboarding flow
- [x] Vercel deployment config

## Phase 5: Agents, Research, Canvas Intelligence & Competitive Analysis

### 5A. AI Agents / Memory Architecture
- [x] Write technical spec for AI agents architecture inspired by `claude-code-sourcemap`: memory model, context compression, grep-based memory search, project/session scopes, and customer-facing Q&A flow
- [x] Implement agent memory data model + persistence layer for long-term memory, short-term working memory, and compressed conversation summaries
- [x] Implement context compression pipeline so long chats can be summarized and reloaded into future agent turns safely
- [x] Implement grep-style memory retrieval/search over stored memory/context with ranking heuristics and tests
- [x] Integrate memory + compression + retrieval into customer Q&A and business brainstorming flows
- [x] Add regression + integration tests for agent memory, compression, and retrieval behavior

### 5B. Auto Research
- [x] Research `karpathy/autoresearch` architecture and write adaptation spec for AI Cofounder use cases
- [x] Implement auto-research orchestration flow for customer idea research (query planning, multi-step browsing/search, synthesis)
- [x] Add UI entry point and report rendering for auto-research runs inside project workspace
- [x] Add citations/source collection and structured output for research sessions
- [x] Add tests for research planner, orchestration, and result formatting

### 5C. Canvas Mind Maps / Diagrams
- [x] Design mind map / diagram object model for canvas items, edges, layout metadata, and drag/drop behavior
- [x] Implement generated mind maps / diagrams on the right canvas based on brainstorming/research/project context
- [x] Add drag-and-drop interaction for generated diagram nodes while preserving layout state
- [x] Add edge rendering / relationship visualization between diagram nodes
- [x] Add tests for diagram generation, drag/drop behavior, and persistence

### 5D. Competitive Research
- [x] Research competitors in AI idea validation / cofounder / startup research products and document implementation patterns worth copying
- [x] Produce competitor comparison memo covering features, UX patterns, research workflows, agent memory behavior, and canvas/diagram interfaces
- [x] Convert competitor insights into prioritized product recommendations and new follow-up tasks in this file

### 5E. Product Follow-Up from Competitive Analysis
- [x] P0: Define the artifact foundation model and ship the first 2 artifact types only: validation scorecard and customer research memo
- [x] P0: Update the workspace/run UI to label the active artifact and treat chat/research as creating or updating that artifact instead of producing only transcript output
- [x] P0: Add visible staged research progress for research-heavy runs: objective, source scope, evidence gathering, synthesis, and recommended next actions, including loading and failure states
- [x] P0: Add trust scaffolding to research artifacts: source list, citation anchors on major claims, evidence-strength summary, contradictions, and unresolved questions
- [x] P0: Add instrumentation and acceptance metrics for the new artifact flow, including artifact creation rate and follow-up edit rate
- [x] P0: Redesign first-run intake to keep one primary idea prompt while supporting optional URL, target user, and main uncertainty fields
- [x] P0: Define attachment constraints and privacy/storage rules before introducing file uploads into first-run intake
- [x] P0: After first output, route users into structured artifact refinement fields while preserving a freeform chat fallback
- [x] P1: Give generated artifacts stable IDs, persisted status, and revision history so follow-up prompts edit the same object by default
- [x] P1: Add artifact-context follow-up mode so users can ask questions about a specific report/plan without losing grounding in that artifact
- [x] P1: Define the minimum shared project-state primitives needed to support 2 synchronized views for one artifact family
- [x] P1: Implement the first synchronized dual-view flow for one artifact family only, starting with competitor memo <-> scorecard or research memo <-> canvas map
- [x] P1: Promote reusable project facts from artifacts into explicit memory fields such as ICP, constraints, hypotheses, experiments, and validated findings
- [x] P1: Expose saved project memory in the UI with artifact references so users can inspect what the system is carrying forward between runs
- [x] P2: Add optional framework-based output templates for SWOT, Five Forces, problem-solution fit, and validation experiment planning where they improve readability
- [x] P2: Tie framework sections to citations/evidence so they remain inspectable instead of becoming unsupported strategy filler
- [x] P2: Extend the canvas model so generated mind maps and diagrams link back to source artifacts or project facts and remain editable as planning objects
