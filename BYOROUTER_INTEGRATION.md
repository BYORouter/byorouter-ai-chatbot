# BYORouter Integration Plan

Integrate BYORouter into the Vercel AI Chatbot as a reference implementation for "bring your own provider" functionality.

## Overview

**BYORouter** is an OpenAI-compatible proxy gateway that lets users bring their own AI provider credentials. Instead of the app storing API keys, users connect their keys through BYORouter's Connect UI, and the app routes requests through BYORouter.

**Flow:**
1. User clicks "Connect API Keys" in the app
2. Redirects to BYORouter Connect UI
3. User enters their OpenAI/Anthropic/etc API keys
4. Redirected back to app with a `connection_id`
5. App stores `connection_id` per user
6. All chat requests go through BYORouter with `X-Byorouter-Connection` header

## Key Decisions

- **Require connection**: Users must connect API keys via BYORouter before chatting
- **Dynamic models**: Fetch available models based on user's connected providers
- **Local dev**: API on `http://localhost:4000`, Connect UI on `http://localhost:8080`

---

## Architecture

### BYORouter API Headers
```
Authorization: Bearer {APP_API_KEY}
X-Byorouter-Connection: conn_xxx
```

### Model ID Format
Provider-prefixed: `openai/gpt-4o`, `anthropic/claude-3-5-sonnet-20241022`

---

## Phase 1: Core Infrastructure

### 1.1 Add dependency
```bash
pnpm add @ai-sdk/openai-compatible
```

### 1.2 Environment variables
Add to `.env.example` and `.env.local`:
```
BYOROUTER_API_URL=http://localhost:4000
BYOROUTER_APP_API_KEY=sk_live_xxx
BYOROUTER_CLIENT_ID=your_client_id
BYOROUTER_CONNECT_URL=http://localhost:8080
```

### 1.3 Database schema
**Modify**: `lib/db/schema.ts`
- Add `byorouterConnectionId: varchar("byorouterConnectionId", { length: 64 })` to User table

**Create migration**: `lib/db/migrations/XXXX_add_byorouter_connection.sql`

### 1.4 Database queries
**Modify**: `lib/db/queries.ts`
- Add `getUserConnectionId(userId: string): Promise<string | null>`
- Add `updateUserConnectionId(userId: string, connectionId: string | null): Promise<void>`

---

## Phase 2: BYORouter Provider

### 2.1 Create provider module
**New file**: `lib/ai/byorouter.ts`

```typescript
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export function createByorouterProvider(connectionId: string) {
  return createOpenAICompatible({
    name: 'byorouter',
    baseURL: `${process.env.BYOROUTER_API_URL}/v1`,
    headers: {
      Authorization: `Bearer ${process.env.BYOROUTER_APP_API_KEY}`,
      'X-Byorouter-Connection': connectionId,
    },
  });
}
```

### 2.2 Update providers.ts
**Modify**: `lib/ai/providers.ts`
- Update `getLanguageModel(modelId, connectionId?)` to route through BYORouter when connectionId provided
- Keep gateway fallback for title/artifact models (or also route through BYORouter)

---

## Phase 3: Connect Flow

### 3.1 Initiate connect
**New file**: `app/api/byorouter/connect/route.ts`
- `GET` - Validates session, generates state, redirects to BYORouter Connect UI
- Params: `client_id`, `redirect_uri`, `state`

### 3.2 Handle callback
**New file**: `app/api/byorouter/callback/route.ts`
- `GET` - Receives `code` + `state`, exchanges for `connection_id`, saves to user, redirects to `/`

### 3.3 Connection status
**New file**: `app/api/byorouter/status/route.ts`
- `GET` - Returns `{ connected: boolean, connectionId?: string }`

### 3.4 Disconnect
**New file**: `app/api/byorouter/disconnect/route.ts`
- `POST` - Clears `byorouterConnectionId` from user

---

## Phase 4: Dynamic Models

### 4.1 Fetch available models
**New file**: `app/api/byorouter/models/route.ts`
- `GET` - Calls `GET /v1/connections/{id}/providers` to get connected providers
- Returns available models based on connected providers

### 4.2 Update models.ts
**Modify**: `lib/ai/models.ts`
- Keep model definitions but mark them as "available when provider connected"
- Or fetch dynamically from BYORouter

### 4.3 Model selector hook
**New file**: `hooks/use-available-models.ts`
- SWR hook to fetch `/api/byorouter/models`
- Returns models filtered by what user has connected

---

## Phase 5: UI Changes

### 5.1 Connect gate
**New file**: `components/connect-prompt.tsx`
- Full-page prompt shown when user has no connection
- "Connect your API keys to start chatting" + Connect button

### 5.2 Update sidebar
**Modify**: `components/sidebar-user-nav.tsx`
- Add "Manage API Keys" menu item (links to Connect UI for updates)
- Show connection status indicator

### 5.3 Update model selector
**Modify**: `components/model-selector.tsx` (or wherever models are selected)
- Use `useAvailableModels()` hook
- Show "No models available" if no providers connected
- Group by provider

### 5.4 Chat page gate
**Modify**: `app/(chat)/page.tsx` or layout
- Check connection status
- Show `<ConnectPrompt />` if not connected

---

## Phase 6: Chat Route Integration

**Modify**: `app/(chat)/api/chat/route.ts`
- Fetch `connectionId` for user at start of request
- Return 403 if no connection
- Pass `connectionId` to `getLanguageModel()`

---

## Files Summary

### New Files (9)
| File | Purpose |
|------|---------|
| `lib/ai/byorouter.ts` | BYORouter provider wrapper |
| `app/api/byorouter/connect/route.ts` | Initiate connect flow |
| `app/api/byorouter/callback/route.ts` | Handle connect callback |
| `app/api/byorouter/status/route.ts` | Get connection status |
| `app/api/byorouter/disconnect/route.ts` | Remove connection |
| `app/api/byorouter/models/route.ts` | Get available models |
| `hooks/use-available-models.ts` | React hook for models |
| `components/connect-prompt.tsx` | Connect CTA component |
| `lib/db/migrations/XXXX_add_byorouter_connection.sql` | DB migration |

### Modified Files (6)
| File | Change |
|------|--------|
| `lib/db/schema.ts` | Add connectionId column |
| `lib/db/queries.ts` | Add connection queries |
| `lib/ai/providers.ts` | Route through BYORouter |
| `lib/ai/models.ts` | Provider-aware model definitions |
| `components/sidebar-user-nav.tsx` | Add manage keys menu item |
| `app/(chat)/api/chat/route.ts` | Require connection, pass to model |

---

## Implementation Order

1. Database changes (schema + migration)
2. BYORouter provider module
3. Connect flow API routes
4. Status + models API routes
5. Update chat route to use BYORouter
6. UI components (connect prompt, sidebar)
7. Model selector updates

---

## Local Development

Requires running:
- BYORouter API (`byorouter-api`) on port 4000
- BYORouter Connect UI (`byorouter-connect`) on port 8080
- This chatbot on port 3001 (auth is on 3000)
- PostgreSQL database
