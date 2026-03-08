# Cloud Persistence API Reference

The Træk Cloud API stores and retrieves conversation snapshots. It runs on Cloudflare Workers + D1 and is available at **`https://api.gettraek.com`**.

All requests require an API key. Keys are scoped to a **workspace** — all conversations belong to the workspace that created them.

---

## Authentication

Include your API key in every request:

```
Authorization: Bearer trak_<your-key>
```

Keys are provisioned via the **Cloud Console** at `cloud.gettraek.com`. Keep your key secret — it grants full read/write access to your workspace's conversations.

---

## Base URL

```
https://api.gettraek.com
```

---

## Endpoints

### POST `/conversations`

Create a new conversation.

**Request body**

```json
{
  "title": "My brainstorm session",
  "snapshot": { /* TraekEngine.serialize() output */ },
  "tags": ["brainstorm", "work"],
  "meta": { "projectId": "proj_abc" }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `snapshot` | object | ✓ | Serialized `ConversationSnapshot` from `engine.serialize()` |
| `title` | string | | Human-readable title (default: empty string) |
| `tags` | string[] | | Searchable tags |
| `meta` | object | | Arbitrary key/value metadata |

**Response** `201 Created`

```json
{
  "id": "01930d7f-...",
  "workspaceId": "ws_...",
  "title": "My brainstorm session",
  "snapshot": { ... },
  "tags": ["brainstorm", "work"],
  "meta": { "projectId": "proj_abc" },
  "createdAt": "2026-03-08T12:00:00.000Z",
  "updatedAt": "2026-03-08T12:00:00.000Z"
}
```

---

### GET `/conversations/:id`

Fetch a single conversation (includes full snapshot).

**Response** `200 OK` — same shape as POST response.

**Errors**

| Status | Body |
|--------|------|
| `404` | `{ "error": "Not found" }` |

---

### PATCH `/conversations/:id`

Update an existing conversation. All fields are optional — only provided fields are updated.

**Request body**

```json
{
  "title": "Renamed session",
  "snapshot": { /* updated snapshot */ },
  "tags": ["brainstorm"],
  "meta": {}
}
```

**Response** `200 OK` — updated conversation object.

---

### DELETE `/conversations/:id`

Delete a conversation permanently.

**Response** `204 No Content`

---

### GET `/conversations`

List conversations for the workspace (snapshot omitted for performance).

**Query parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | integer | `50` | Max results (1–200) |
| `offset` | integer | `0` | Pagination offset |
| `sortBy` | string | `updatedAt` | `updatedAt` \| `createdAt` \| `title` |
| `order` | string | `desc` | `asc` \| `desc` |
| `tag` | string | | Filter by tag (exact match) |

**Response** `200 OK`

```json
[
  {
    "id": "01930d7f-...",
    "workspaceId": "ws_...",
    "title": "My brainstorm session",
    "tags": ["brainstorm"],
    "meta": {},
    "createdAt": "2026-03-08T12:00:00.000Z",
    "updatedAt": "2026-03-08T12:00:00.000Z"
  }
]
```

---

### GET `/conversations/count`

Count total conversations in the workspace.

**Response** `200 OK`

```json
{ "count": 42 }
```

---

### GET `/conversations/search`

Full-text search across titles and conversation content.

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | ✓ | Search query |
| `limit` | integer | | Max results (default: 20, max: 50) |
| `offset` | integer | | Pagination offset |

**Response** `200 OK` — array of list items (no snapshot), ranked by relevance.

---

## SDK — `@traek/cloud-client`

The `@traek/cloud-client` package wraps the REST API with a typed, ergonomic interface.

### Installation

```bash
npm install @traek/cloud-client
```

### Quick start

```ts
import { CloudClient, RestAdapter } from '@traek/cloud-client'
import { TraekEngine } from 'traek'

const client = new CloudClient({
  adapter: new RestAdapter({
    baseUrl: 'https://api.gettraek.com',
    apiKey: 'trak_...'
  })
})

// Save a conversation
const engine = new TraekEngine()
// ... add nodes ...
const saved = await client.save('My brainstorm', engine.serialize())
console.log(saved.id)

// List conversations
const list = await client.list({ limit: 20 })

// Load and restore
const conv = await client.get(saved.id)
if (conv) {
  const restored = TraekEngine.fromSnapshot(conv.snapshot)
}
```

### `CloudClient` methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `save` | `(title, snapshot, opts?) → CloudConversation` | Create or update a conversation |
| `create` | `(payload) → CloudConversation` | Always creates new |
| `get` | `(id) → CloudConversation \| null` | Fetch by ID |
| `update` | `(id, payload) → CloudConversation` | Update fields |
| `delete` | `(id) → void` | Delete permanently |
| `list` | `(options?) → CloudConversationListItem[]` | List (no snapshot) |
| `search` | `(options) → CloudConversationListItem[]` | Full-text search |
| `count` | `() → number` | Total conversation count |

### Supabase adapter

Use Supabase as your backend instead of the Træk-hosted API:

```ts
import { CloudClient, SupabaseAdapter } from '@traek/cloud-client'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const client = new CloudClient({
  adapter: new SupabaseAdapter({
    client: supabase,
    workspaceId: 'my-workspace'
  })
})
```

---

## Rate Limits

| Plan | Requests/min | Conversations stored |
|------|-------------|---------------------|
| Free | 60 | 100 |
| Pro | 600 | Unlimited |
| Enterprise | Unlimited | Unlimited |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1741435260
```

---

## Error Reference

| Status | Code | Description |
|--------|------|-------------|
| `400` | — | Invalid JSON or missing required field |
| `401` | — | Missing or invalid API key |
| `403` | — | API key does not have access to this resource |
| `404` | — | Conversation not found |
| `429` | — | Rate limit exceeded |
| `500` | — | Internal server error |
