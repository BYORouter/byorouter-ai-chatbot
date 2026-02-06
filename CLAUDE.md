# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev                    # Start dev server with Turbopack
pnpm build                  # Run migrations + build
pnpm lint                   # ESLint + Biome
pnpm lint:fix               # Auto-fix lint issues
pnpm format                 # Format with Biome

# Database (Drizzle ORM + Postgres)
pnpm db:generate            # Generate migrations from schema changes
pnpm db:migrate             # Run migrations
pnpm db:studio              # Open Drizzle Studio GUI
pnpm db:push                # Push schema directly (dev only)

# Testing (Playwright)
pnpm test                   # Run all integration tests
pnpm exec playwright test tests/e2e/chat.test.ts  # Run single test file
```

## Architecture

This is a Next.js 15 AI chatbot with BYORouter integration for multi-provider AI support.

### Core Flow

```
User → Chat UI → /api/chat route → getModel(session, modelId) → BYORouter → AI Provider
```

1. **Chat Route** (`app/(chat)/api/chat/route.ts`): Entry point for messages. Validates connection, streams responses via AI SDK, handles tool calls.

2. **Model Resolution** (`lib/byorouter/model.ts`): Central `getModel(session, modelId)` function that:
   - Validates fully-qualified model IDs (must contain `/`)
   - In test mode: uses `myProvider` from `lib/ai/providers.ts`
   - In production: fetches user's `connectionId` from DB, routes through BYORouter

3. **BYORouter Connection**: Users connect AI providers via OAuth-like flow:
   - `/api/byorouter/connect` → redirects to BYORouter Connect UI
   - `/api/byorouter/callback` → stores `connectionId` in user record
   - `connectionId` used for all subsequent AI requests

### Key Directories

- `app/(chat)/` - Chat interface, API routes, server actions
- `app/(auth)/` - NextAuth config, login/register pages
- `lib/ai/` - AI SDK integration, prompts, tools
- `lib/byorouter/` - BYORouter model resolution
- `lib/db/` - Drizzle schema, queries, migrations
- `lib/artifacts/` - Document handler framework
- `artifacts/` - Document type implementations (text, code, sheet, image)
- `components/` - React UI components (shadcn/ui + Radix)

### Document/Artifact System

Tools can create documents via `createDocument` and `updateDocument`. Each artifact type has a handler in `artifacts/{type}/server.ts` that:
- Receives `session`, `modelId`, `dataStream`
- Calls `getModel(session, modelId)` to get the AI model
- Streams content back via `dataStream.writeData()`

### Database Schema

Key tables in `lib/db/schema.ts`:
- `user` - includes `connectionId` for BYORouter
- `chat` - chat sessions with visibility
- `message` - messages with parts/attachments
- `document` - generated artifacts
- `suggestion` - document edit suggestions

### Authentication

NextAuth 5 with credentials provider. User types: `'guest' | 'regular'`. Rate limits in `lib/ai/entitlements.ts`.

## Environment Variables

```
AUTH_SECRET=<random>
BYOROUTER_API_KEY=sk_live_****
BYOROUTER_CLIENT_ID=byor_****
BYOROUTER_API_URL=http://localhost:4000  # or https://api.byorouter.com
POSTGRES_URL=<connection string>
```

## Design Principles

1. **Fully-qualified model IDs everywhere** - Use `openai/gpt-4o`, not aliases like `chat-model`
2. **Apps trust the router** - No provider-specific logic in the app; BYORouter handles differences
3. **Session passed explicitly** - `getModel(session, modelId)` takes session, never calls `auth()` internally
4. **ChatSDKError for HTTP errors** - Use `lib/errors.ts` for proper error responses
