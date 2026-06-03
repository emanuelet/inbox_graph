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

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth2 client secret |
| `GOOGLE_REDIRECT_URI` | Yes | OAuth callback (default: `http://localhost:3000/auth/google/callback`) |
| `ARANGO_URL` | Yes | ArangoDB URL (default: `http://localhost:8529`) |
| `ARANGO_DATABASE` | Yes | Database name (default: `inbox_graph`) |
| `ARANGO_USERNAME` | Yes | ArangoDB username (default: `root`) |
| `ARANGO_PASSWORD` | Yes | ArangoDB password |
| `PORT` | No | Server port (default: `3000`) |

## Run

```bash
pnpm run dev
```

Open http://localhost:3000, click the auth link to sign in with Google, then start syncing and searching.

## Scripts

| Command | Description |
|---|---|
| `pnpm run dev` | Start dev server with hot reload |
| `pnpm run build` | Compile TypeScript |
| `pnpm run start` | Run compiled server |
| `pnpm run lint` | Lint with Biome |
| `pnpm run format` | Format with Biome |

## API

### Search messages/people

```
GET /search?q=<query>&type=<messages|people|all>&limit=<1-200>
```

### Person graph lookup

```
GET /search/graph/person/<email>
```

Returns the person, their sent/received messages, stats, and threads.

### Thread graph lookup

```
GET /search/graph/thread/<threadId>
```

Returns all messages in a thread with sender/recipient info.

### Health

```
GET /health
```

## Tech stack

- **Runtime:** Node.js, TypeScript
- **Web framework:** Hono
- **Database:** ArangoDB (arangojs)
- **Gmail API:** googleapis + google-auth-library
- **Frontend:** React 19 (server-rendered via Hono)
- **Linter:** Biome
