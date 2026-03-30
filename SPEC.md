# AI Cofounder — Product Spec

## What We're Building
An AI-powered product cofounder that guides founders from idea → validated product through structured phases. Think ChatGPT meets Miro, specialized for building products.

## Reference: aicofounder.com
Cloning their core UX and feature set, then optimizing.

## Core Architecture

### Tech Stack
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes + Server Actions
- **Database:** Supabase (Postgres + Auth + Realtime)
- **AI:** OpenAI API (GPT-4o for chat, parallel agents for research)
- **Canvas:** React Flow or custom canvas with drag-and-drop
- **Deployment:** Vercel

### Design System
- Warm cream background (#faf7f2 or similar)
- Clean, minimal UI — lots of white space
- Yellow sticky notes on canvas
- Left panel = chat, Right panel = canvas
- Soft shadows, rounded corners

## Phase 1: Core Loop (MVP)
1. **Landing Page** — "Make something people actually want" hero
2. **Auth** — Google OAuth via Supabase
3. **Dashboard** — List of projects, create new
4. **Project Workspace** — Split pane:
   - Left: AI chat (structured conversation)
   - Right: Canvas (documents + notes)
5. **Phase System** — Progress tracker at bottom of chat
   - Phase 1: Getting started (describe your idea)
   - Phase 2: Understand the project (market research)
   - Phase 3: Plan (Ultraplan)
   - Phase 4: Build (website + content)
   - Phase 5: Launch

## Phase 2: Intelligence
- Brainstorming agent (search Reddit/communities)
- Deep Research (parallel agents, cited reports)
- Ultraplan (find biggest blocker)

## Phase 3: Canvas Features
- Documents (rich markdown)
- Notes (colored sticky notes)
- Sections (grouping)
- Website builder
- Content calendar

## Database Schema (Supabase)
```sql
-- Users (handled by Supabase Auth)

-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null default 'My first project',
  description text,
  current_phase int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Chat Messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Canvas Items (notes, documents, sections)
create table canvas_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  type text not null check (type in ('note', 'document', 'section', 'website')),
  title text,
  content text,
  color text default 'yellow',
  position_x float default 0,
  position_y float default 0,
  width float default 300,
  height float default 200,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Phases
create table phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  phase_number int not null,
  name text not null,
  status text default 'pending' check (status in ('pending', 'active', 'completed')),
  tasks jsonb default '[]',
  created_at timestamptz default now()
);
```
