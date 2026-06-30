# inbox_graph

Index your Gmail inbox into ArangoDB as a graph — people, messages, threads, and the relationships between them. Search and explore your email network through a web UI or JSON API.

## How it works

1. **OAuth2** — authenticate with Gmail (read-only scope)
2. **Initial sync** — walks all threads, fetches message metadata, stores in ArangoDB
3. **Graph model** — `messages` and `people` as document collections, `sent_by` / `received_by` / `in_thread` as edge collections
4. **Search** — ArangoSearch full-text view over message subjects, snippets, and person names/emails
5. **Incremental sync** — uses Gmail History API to pick up new messages since last sync
6. **Push notifications** — optional Gmail Pub/Sub webhook + Google Cloud Tasks for continuous sync

## Requirements

- Node.js 20+
- pnpm 11+
- ArangoDB 3.12+ (or `docker compose up`)

## Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd inbox_graph
pnpm install

# 2. Start ArangoDB
docker compose up -d

# 3. Set up environment
cp .env.example .env
# Edit .env with your actual values

# 4. Set up Google OAuth2 credentials
# - Go to https://console.cloud.google.com/apis/credentials
# - Create an OAuth 2.0 Client ID (Web application)
# - Add http://localhost:3000/auth/google/callback as redirect URI
# - Download the JSON and save as credentials.json in the project root
```

### Environment variables

| Variable               | Required | Description                                                            |
| ---------------------- | -------- | ---------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`     | Yes      | Google OAuth2 client ID                                                |
| `GOOGLE_CLIENT_SECRET` | Yes      | Google OAuth2 client secret                                            |
| `GOOGLE_REDIRECT_URI`  | Yes      | OAuth callback (default: `http://localhost:3000/auth/google/callback`) |
| `ARANGO_URL`           | Yes      | ArangoDB URL (default: `http://localhost:8529`)                        |
| `ARANGO_DATABASE`      | Yes      | Database name (default: `inbox_graph`)                                 |
| `ARANGO_USERNAME`      | Yes      | ArangoDB username (default: `root`)                                    |
| `ARANGO_PASSWORD`      | Yes      | ArangoDB password                                                      |
| `PORT`                 | No       | Server port (default: `3000`)                                          |

## Run

```bash
pnpm run dev
```

Open http://localhost:3000, click the auth link to sign in with Google.

## Indexing

### Initial sync

After authenticating, trigger a full walk of all Gmail threads:

```bash
curl -X POST http://localhost:4000/api/tasks/sync -d "{}"
```

This lists all thread IDs, fetches message metadata for each, and stores messages, people, threads, and their relationships in ArangoDB. Depending on inbox size, this may take a few minutes.

### Incremental sync

Once a `historyId` has been saved (from an initial sync), subsequent calls to `/tasks/sync` use the Gmail History API to pick up only new/changed messages since the last sync:

```bash
curl -X POST http://localhost:4000/api/tasks/sync -d "{}"
```

If no `historyId` is found, it falls back to a full initial sync.

### Push notifications (optional)

1. Set up a Google Cloud Pub/Sub topic and subscription
2. Add your Gmail Pub/Sub topic name to `.env` as `GMAIL_PUBSUB_TOPIC`
3. The server calls `setupGmailWatch()` on startup to register the INBOX push notification
4. Notifications arrive at `POST /webhook/gmail` and enqueue a Cloud Tasks sync task

See [Gmail Pub/Sub documentation](https://developers.google.com/gmail/api/guides/push) for setup details.

## Search

Open http://localhost:3000, type a query in the search bar, and hit Enter. You can also enter an email address to lookup a person's graph.

## Scripts

| Command           | Description                      |
| ----------------- | -------------------------------- |
| `pnpm run dev`    | Start dev server with hot reload |
| `pnpm run build`  | Build SSR bundle + client bundle |
| `pnpm run start`  | Run compiled server              |
| `pnpm run lint`   | Lint with Biome                  |
| `pnpm run format` | Format with Biome                |

## API

### Search messages/people

```
GET /api/search?q=<query>&type=<messages|people|all>&limit=<1-200>
```

### Person graph lookup

```
GET /api/search/graph/person/<email>
```

Returns the person, their sent/received messages, stats, and threads.

### Thread graph lookup

```
GET /api/search/graph/thread/<threadId>
```

Returns all messages in a thread with sender/recipient info.

### Health

```
GET /api/health
```

## Tech stack

- **Runtime:** Node.js, TypeScript
- **Web framework:** Hono
- **Database:** ArangoDB (arangojs)
- **Gmail API:** googleapis + google-auth-library
- **Frontend:** Vue 3 (server-rendered via Vite + Hono)
- **Linter:** Biome
