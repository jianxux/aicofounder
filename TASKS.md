# AI Cofounder — Task Queue

Tasks for the hourly build cron. Pick the next unchecked item, build it with dual-review, commit with 90%+ test coverage.

## Phase 1: Polish & Tests (Priority)
- [x] Install testing deps (vitest, @testing-library/react, jsdom) and configure
- [x] Unit tests for src/lib/projects.ts (CRUD, edge cases) — 100% coverage
- [x] Unit tests for src/lib/types.ts validation
- [x] Component tests for StickyNote (render, drag events, edit)
- [ ] Component tests for PhaseTracker (render, toggle, collapse)
- [ ] Component tests for ChatPanel (render, send message, remind)
- [ ] Component tests for Canvas (render, add note, zoom)
- [ ] Component tests for AuthButton (signed in/out states, fallback)
- [ ] Component tests for Dashboard page (project list, create)
- [ ] Fix any build errors from `npm run build`

## Phase 2: Core Features
- [ ] Real AI chat integration (OpenAI API route at /api/chat)
- [ ] Streaming chat responses (SSE or ReadableStream)
- [ ] System prompt for AI cofounder persona (critical, structured, guides through phases)
- [ ] Auto-advance phases based on chat progress
- [ ] Brainstorming agent — search Reddit/communities for pain points
- [ ] Deep Research — parallel agents producing cited reports
- [ ] Ultraplan — find biggest blocker, create actionable plan

## Phase 3: Canvas & UX
- [ ] Multiple note colors (yellow, blue, green, pink, purple)
- [ ] Document cards on canvas (rich markdown)
- [ ] Sections for grouping canvas items
- [ ] Delete notes
- [ ] Canvas pan and scroll
- [ ] Mobile responsive workspace (stack panels)
- [ ] Website builder component

## Phase 4: Persistence & Auth
- [ ] Supabase database schema (projects, messages, canvas_items, phases)
- [ ] Migrate from localStorage to Supabase
- [ ] Real-time sync
- [ ] User onboarding flow
- [ ] Vercel deployment config
