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
- [ ] Integrate memory + compression + retrieval into customer Q&A and business brainstorming flows
- [ ] Add regression + integration tests for agent memory, compression, and retrieval behavior

### 5B. Auto Research
- [ ] Research `karpathy/autoresearch` architecture and write adaptation spec for AI Cofounder use cases
- [ ] Implement auto-research orchestration flow for customer idea research (query planning, multi-step browsing/search, synthesis)
- [ ] Add UI entry point and report rendering for auto-research runs inside project workspace
- [ ] Add citations/source collection and structured output for research sessions
- [ ] Add tests for research planner, orchestration, and result formatting

### 5C. Canvas Mind Maps / Diagrams
- [ ] Design mind map / diagram object model for canvas items, edges, layout metadata, and drag/drop behavior
- [ ] Implement generated mind maps / diagrams on the right canvas based on brainstorming/research/project context
- [ ] Add drag-and-drop interaction for generated diagram nodes while preserving layout state
- [ ] Add edge rendering / relationship visualization between diagram nodes
- [ ] Add tests for diagram generation, drag/drop behavior, and persistence

### 5D. Competitive Research
- [ ] Research competitors in AI idea validation / cofounder / startup research products and document implementation patterns worth copying
- [ ] Produce competitor comparison memo covering features, UX patterns, research workflows, agent memory behavior, and canvas/diagram interfaces
- [ ] Convert competitor insights into prioritized product recommendations and new follow-up tasks in this file
