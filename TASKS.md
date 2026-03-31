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
- [ ] Website builder component

## Phase 4: Persistence & Auth
- [ ] Supabase database schema (projects, messages, canvas_items, phases)
- [ ] Migrate from localStorage to Supabase
- [ ] Real-time sync
- [ ] User onboarding flow
- [ ] Vercel deployment config
