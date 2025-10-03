# CLAUDE.md

> Last updated: 2025-10-02

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**All. Done** is a project management application combining Linear, Notion, and Drive features. Built as a cross-platform desktop app using:
- **Tauri 2.x** - Rust backend for native OS integration
- **Next.js 15** - React framework (static export mode)
- **Supabase** - PostgreSQL database with real-time subscriptions and RLS
- **Shadcn/ui** - Tailwind-based component library
- **Bun** - Fast JavaScript runtime and package manager

### Current Status (40% Complete)
The application implements:
- ✅ **Authentication** - Full auth flow (signup, login, password reset)
- ✅ **Workspaces** - Multi-workspace support with role-based access
- ✅ **Projects** - Hierarchical structure (projects → sub-projects)
- ✅ **Tasks** - Hierarchical structure (tasks → sub-tasks) with relations
- ✅ **Task Relations** - Blocks, depends, duplicates, relates (Epic 2 ✅)
- ✅ **Multiple Views** - List (drag-drop), Table (sortable), Tree (hierarchical)
- ✅ **Real-time Updates** - Supabase subscriptions for live data

See [ROADMAP.md](ROADMAP.md) for detailed progress and next features.

## Development Commands

### Setup
```bash
bun install                    # Install JavaScript dependencies
cargo install --path src-tauri # Install Rust dependencies (first time)
```

### Database Setup
```bash
# Apply all migrations (including task relations)
bunx supabase db push

# Or apply specific migration
bunx supabase migration up
```

### Development
```bash
bun run tauri dev              # Run full desktop app (Next.js + Tauri)
bun run dev                    # Run Next.js dev server only (port 3000/3001)
```

### Building
```bash
bun run tauri build            # Build production desktop app
bun run build                  # Build Next.js static export
```

### Code Quality
```bash
bun run lint                   # Run ESLint
bun run lint --fix             # Run ESLint with auto-fix
bunx prettier --write "**/*.{ts,tsx}"  # Format all code
```

**IMPORTANT**: After writing or modifying code:
1. Run `bunx prettier --write "app/**/*.{ts,tsx}" "components/**/*.{ts,tsx}" "lib/**/*.{ts,tsx}"` to format
2. Run `bun run lint` to check for errors (should have 0 errors, <5 warnings)
3. Fix any linting errors before marking tasks complete
4. Run `bun run dev` to verify compilation and functionality

## Architecture

### Hybrid Desktop App Structure

This is a **Tauri desktop application** where Next.js runs in static export mode:
- **Frontend**: Next.js is built as a static site (`output: "export"` in [next.config.ts](next.config.ts)) and bundled into the Tauri app
- **Backend**: Tauri (Rust) provides native OS APIs, window management, and system integration
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS) for multi-tenancy
- **Communication**: Frontend uses `@tauri-apps/api` to invoke Rust commands and receive events

### Key Configuration Points

1. **Tauri Config** ([src-tauri/tauri.conf.json](src-tauri/tauri.conf.json)):
   - `frontendDist: "../out"` - Next.js exports to `out/`
   - `devUrl: "http://localhost:3000"` - Dev server URL
   - `beforeDevCommand: "bun run dev"` - Starts Next.js dev server
   - `beforeBuildCommand: "bun run build"` - Builds Next.js static export

2. **Next.js Config** ([next.config.ts](next.config.ts)):
   - Static export mode required for Tauri
   - Images set to `unoptimized: true` (required for static export)
   - Uses Turbopack for faster development builds

3. **Supabase Setup**:
   - Database migrations in `supabase/migrations/`
   - Row Level Security (RLS) enabled on all tables
   - Workspace-based isolation for multi-tenancy
   - Real-time subscriptions for live updates

### Directory Structure

```
app/                           # Next.js App Router pages
  ├── auth/                    # Authentication pages (login, signup, etc.)
  ├── workspaces/              # Workspace selection and management
  ├── projects/                # Project CRUD with tree view
  ├── tasks/                   # Task CRUD with multiple views
  ├── settings/                # User settings (password change, etc.)
  ├── layout.tsx               # Root layout with theme provider
  ├── page.tsx                 # Home page (redirects to workspace)
  └── globals.css              # Global styles + Tailwind

components/                    # React components
  ├── ui/                      # Shadcn UI components
  │   ├── shadcn-io/          # Shadcn blocks (list, table, etc.)
  │   └── [component].tsx     # Individual UI components
  ├── app-sidebar.tsx          # Main application sidebar navigation
  ├── auth-guard.tsx           # Authentication wrapper component
  ├── layout-wrapper.tsx       # Layout with sidebar
  ├── project-tree-item.tsx    # Recursive project tree component
  ├── task-tree-item.tsx       # Recursive task tree component
  └── task-relations.tsx       # Task relations UI (Epic 2)

lib/                          # Shared utilities and logic
  ├── context/
  │   └── workspace-context.tsx # Global workspace state
  ├── hooks/                   # Custom React hooks
  │   ├── use-auth.ts          # Authentication hook
  │   ├── use-workspace.ts     # Workspace selection hook
  │   ├── use-projects.ts      # Project CRUD operations
  │   ├── use-tasks.ts         # Task CRUD operations
  │   ├── use-task-relations.ts # Task relations CRUD (Epic 2)
  │   ├── use-workspace-members.ts # Workspace members
  │   ├── use-labels.ts        # Labels (not implemented yet)
  │   └── use-mobile.ts        # Mobile detection for responsive UI
  ├── supabase/                # Supabase client configuration
  │   ├── client.ts            # Browser client factory
  │   ├── server.ts            # Server-side client (SSR)
  │   └── middleware.ts        # Auth middleware
  ├── types/
  │   └── database.types.ts    # Generated TypeScript types from Supabase
  └── utils.ts                 # Utility functions (cn, etc.)

supabase/                      # Database schema and migrations
  └── migrations/
      ├── 20250101000000_initial_schema.sql
      ├── 20250101000001_fix_rls_policies.sql
      ├── 20250101000006_add_hierarchy.sql
      └── 20250102000000_add_task_relations.sql # Epic 2: Task Relations

src-tauri/                     # Rust backend
  ├── src/
  │   ├── main.rs              # Tauri entry point
  │   └── lib.rs               # Library code
  ├── Cargo.toml               # Rust dependencies
  └── tauri.conf.json          # Tauri configuration

public/                        # Static assets bundled with app
```

## Development Guidelines

### UI Component Strategy

**CRITICAL**: Maximize use of shadcn/ui components and blocks from [ui.shadcn.com](https://ui.shadcn.com):
- **ALWAYS** use the `-y` flag when adding components: `bunx shadcn@latest add [component] -y`
- This prevents blocking on prompts to overwrite existing files
- Prefer importing and customizing existing blocks (roadmap, tables, kanban, forms, etc.) over building from scratch
- All shadcn components go in `components/ui/`
- Component configuration is in [components.json](components.json)
- **ALWAYS** run `bun run dev` after making changes to verify the app works before marking tasks complete

### Code Quality Standards

From [project.md](project.md):
- **Never write non-functional, useless, or fictional code**
- Every piece of code must be operational or at minimum executable with realistic mock data
- Use clear TODOs for unimplemented features rather than fake implementations
- Focus on robust, reusable, tested, and maintainable code

### Code Organization Patterns

#### Component Props
- **NEVER** use `children` as a prop name (conflicts with React's reserved prop)
- Use descriptive names like `childProjects`, `childTasks`, `items`, etc.
- Example:
  ```tsx
  // ❌ BAD
  interface Props { children: Project[]; }

  // ✅ GOOD
  interface Props { childProjects: Project[]; }
  ```

#### Type Safety
- Always import and use proper database types from `@/lib/types/database.types`
- Avoid `any` types - use specific types or `unknown` with type guards
- Example:
  ```tsx
  import { Database } from "@/lib/types/database.types";
  type Task = Database["public"]["Tables"]["tasks"]["Row"];
  ```

#### Supabase Client Pattern
- Use `createClient()` function, not singleton instances
- Create local client instance in each function:
  ```tsx
  import { createClient } from "@/lib/supabase/client";

  async function fetchData() {
    const supabase = createClient(); // Create fresh instance
    const { data } = await supabase.from('tasks').select('*');
  }
  ```

### Theming

- Uses `next-themes` for light/dark mode
- Tailwind CSS with design tokens (e.g., `bg-background`, `text-foreground`)
- Radix UI primitives for accessible components
- Theme toggle available via `components/mode-toggle.tsx`

### Path Aliases

TypeScript path alias `@/*` maps to root directory (see [tsconfig.json](tsconfig.json))

Example: `import { cn } from "@/lib/utils"`

## Database Schema

### Core Tables

- **users** - User profiles (auto-created on signup via trigger)
- **workspaces** - Root organization unit
- **workspace_members** - User membership in workspaces with roles
- **projects** - Hierarchical projects with `parent_project_id`
- **tasks** - Hierarchical tasks with `parent_task_id`
- **task_relations** - Task dependencies (blocks, depends, duplicates, relates) ✨ NEW
- **labels** - Task/project labels (schema ready, UI pending)

### Task Relations (Epic 2)

The `task_relations` table supports four relation types:
1. **blocks** - Source task blocks target task (target cannot start until source completes)
2. **depends** - Source task depends on target task (source requires target to be done)
3. **duplicates** - Source task duplicates target task (same work)
4. **relates** - Source task relates to target task (general connection)

**Important**: Circular dependency prevention is enforced via PostgreSQL trigger using recursive CTEs.

See migration: `supabase/migrations/20250102000000_add_task_relations.sql`

### Row Level Security (RLS)

All tables have RLS enabled with workspace-based isolation:
- Users can only access data in workspaces they're members of
- Policies check workspace membership via `workspace_members` table
- Public access is disabled - authentication required for all operations

## Domain Model

Core entities from project specification (see [project.md](project.md)):
- **Workspace** - Root organization
- **Team** - Logical user groups with workflows (not implemented yet)
- **Project** - Hierarchical (supports sub-projects) ✅
- **Task** - Hierarchical (supports sub-tasks) with relations ✅
- **WorkflowState** - Customizable states per team (not implemented yet)
- **View** - Saved lists with filters/sorting/grouping (partially implemented)
- **Document** - Rich text pages linked to projects/tasks (not implemented yet)
- **Folder/File** - Drive structure with versioning (not implemented yet)
- **Comment** - Threaded discussions with mentions (not implemented yet)
- **AIJob** - AI operations (reformulation, task splitting, etc.) (not implemented yet)

## Recent Updates (2025-10-02)

### Epic 2: Task Relations ✅ COMPLETED
- Added `task_relations` table with 4 relation types
- Implemented circular dependency validation (PostgreSQL recursive CTE)
- Created `useTaskRelations` hook with real-time subscriptions
- Built `TaskRelations` UI component with color-coded badges
- Integrated into task edit dialog

### Code Cleanup ✅ COMPLETED
- Fixed all ESLint errors (0 errors, 4 minor warnings)
- Removed unused imports and variables across all files
- Fixed React `children` prop conflicts (renamed to `childProjects`/`childTasks`)
- Added proper TypeScript types (removed all `any` types)
- Fixed unescaped quotes in JSX
- Consolidated hooks directory (`hooks/` → `lib/hooks/`)
- Deleted completion marker files (AUTH_SETUP_COMPLETE.md, etc.)
- Updated .gitignore for proper .env handling

### Current Code Quality
- ✅ ESLint passing (0 errors, 4 warnings)
- ✅ All code formatted with Prettier
- ✅ Proper TypeScript typing throughout
- ✅ No React anti-patterns
- ✅ Dev server running stable on port 3001

## MCP Usage Examples

IMPORTANT
please use MCP shadcnio for UI components as much as possible IMPORTANT

### Explore available components
```
use shadcn to give me a list of all components available
```

### Get component details
```
use shadcn and give me information about color picker component
```

### Implement in your project
```
use shadcn and implement the color picker component in my app
```

## Known Issues & Warnings

1. **Port Conflict**: Dev server uses port 3001 if 3000 is occupied
2. **ESLint Warnings** (non-critical):
   - Unused `router` variable in `app/auth/forgot-password/page.tsx`
   - Unused variables in `lib/supabase/middleware.ts`
   - Missing dependency in `lib/context/workspace-context.tsx` useEffect

3. **Pending Migrations**:
   - After pulling changes, run `bunx supabase db push` to apply task_relations migration

## Next Development Priorities

See [ROADMAP.md](ROADMAP.md) for detailed sprint planning. High priority items:
1. **Kanban View** (Epic 4) - Drag-drop task board
2. **Labels** (Epic 3) - Already has database schema, needs UI
3. **Global Search** (Epic 7) - Search across projects/tasks
4. **Comments** (Epic 8) - Task discussions with mentions

## CI/CD

GitHub Actions workflows in `.github/workflows/`:
- Build and test on macOS, Windows, Linux
- Release automation with draft releases

## Platform Support

Cross-platform desktop app targeting:
- macOS (Apple Silicon + Intel)
- Windows (x64)
- Linux (x64)
