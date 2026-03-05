# ezqrin-web

Admin dashboard for [ezqrin-server](https://github.com/fumkob/ezqrin-server) — an event management and QR code check-in system. Built with Next.js 16 and React 19.

The backend (Go/Gin) is included as a **git submodule** in `server/`. This frontend is purpose-built as the management interface for that server.

## Features

- **Event Management** — Create, edit, delete events with date/time, location, timezone, and status control
- **Participant Management** — Add participants individually or import via CSV; export participant lists
- **QR Code Check-in** — Three check-in methods: employee ID, QR code scan, and participant ID
- **Real-time Stats** — Live check-in counts and rates with auto-refresh
- **QR Distribution** — Generates unique QR distribution URLs per participant
- **Authentication** — JWT-based auth with automatic token refresh
- **Dark Mode** — Full light/dark theme support
- **Localization** — Japanese UI with browser-locale-aware date/time formatting

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16, React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4, shadcn/ui (New York) |
| State | TanStack React Query v5 |
| Forms | react-hook-form + Zod v4 |
| Icons | lucide-react |
| Toasts | sonner |
| API Client | Auto-generated via Orval from OpenAPI spec |
| Backend | Go (Gin) — via git submodule |

## Project Structure

```
├── server/                  # Backend submodule (ezqrin-server)
│   └── api/openapi.yaml     # OpenAPI spec (source of truth)
├── src/
│   ├── app/
│   │   ├── (auth)/           # Public routes (login)
│   │   └── (admin)/          # Protected routes
│   │       ├── dashboard/        # Event listing with search/filter
│   │       └── events/
│   │           ├── new/          # Create event
│   │           └── [id]/
│   │               ├── page.tsx          # Event detail & stats
│   │               ├── edit/             # Edit event
│   │               ├── participants/     # Participant management
│   │               └── checkin/          # Check-in interface
│   ├── components/
│   │   ├── ui/               # shadcn/ui primitives
│   │   ├── events/           # Event cards, forms, stats
│   │   ├── participants/     # Participant table, dialogs
│   │   └── layout/           # Sidebar navigation
│   ├── contexts/
│   │   └── auth-context.tsx  # Auth provider & useAuth hook
│   ├── hooks/                # Custom hooks wrapping generated API
│   │   ├── use-events.ts
│   │   ├── use-participants.ts
│   │   ├── use-checkins.ts
│   │   └── use-locale.ts
│   └── lib/
│       ├── api/
│       │   ├── client.ts     # HTTP client, token management, Orval mutator
│       │   └── auth.ts       # Login/logout API
│       └── generated/        # Auto-generated (do not edit)
│           ├── auth/
│           ├── events/
│           ├── participants/
│           ├── checkin/
│           └── model/        # TypeScript types
├── scripts/
│   └── bundle-openapi.mjs    # Bundles OpenAPI spec for Orval
├── orval.config.ts
├── next.config.ts            # API proxy configuration
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 24+ (managed via [mise](https://mise.jdx.dev/))
- The backend server running (see [ezqrin-server](https://github.com/fumkob/ezqrin-server))

### Setup

```bash
# Clone with submodule
git clone --recursive <repository-url>
cd ezqrin-web

# Install dependencies
npm install

# Generate API client from OpenAPI spec
npm run generate

# Start dev server (port 9000)
npm run dev
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `/api/v1` | Client-side API base URL |
| `BACKEND_URL` | `http://localhost:8080` | Backend server URL (proxied by Next.js) |

## Commands

```bash
npm run dev        # Start dev server on port 9000
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
npm run generate   # Regenerate API client from OpenAPI spec
```

## API Client Generation

This project uses an **API-first** approach:

1. The backend defines the OpenAPI spec at `server/api/openapi.yaml`
2. `npm run generate` bundles the spec and runs [Orval](https://orval.dev/) to generate:
   - **React Query hooks** — one file per OpenAPI tag (`src/lib/generated/<tag>/`)
   - **TypeScript types** — all request/response models (`src/lib/generated/model/`)
3. Custom hooks in `src/hooks/` wrap the generated hooks to add business logic (cache invalidation, transformations, polling intervals)
4. Pages consume custom hooks, never the generated ones directly

## Authentication Flow

1. User logs in with email/password
2. Server returns access token + refresh token
3. Access token is held in memory; refresh token is persisted to localStorage
4. All API requests include the access token via `Authorization` header
5. On 401, the client automatically refreshes the token and retries
6. On refresh failure, the user is redirected to login

## Backend Submodule

The `server/` directory is a git submodule pointing to [ezqrin-server](https://github.com/fumkob/ezqrin-server). The frontend depends on it for:

- **OpenAPI spec** — used to generate the TypeScript API client
- **API server** — must be running for the dashboard to function

To update the submodule:

```bash
git submodule update --remote server
npm run generate   # Regenerate client if spec changed
```
