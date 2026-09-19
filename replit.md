# AeroNex GP

A simulation-first high-altitude anti-drone operations dashboard for environmental awareness, synthetic target tracking, predictive health, adaptive control, and history.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/aeronex-gp run dev` — run the React dashboard
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/aeronex-gp/src/pages/dashboard.tsx` — live command dashboard
- `artifacts/aeronex-gp/src/pages/about.tsx` — system brief and hardware boundary
- `artifacts/api-server/src/services/simulationEngine.ts` — smooth simulation state and persistence
- `artifacts/api-server/src/routes/` — REST endpoint implementations
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/aeronex.ts` — PostgreSQL/Drizzle telemetry schema

## Architecture decisions

- The physical system boundary is explicit: all current telemetry and control values are simulated.
- REST polling is used for live updates so the dashboard remains stable through WebSocket/proxy changes.
- OpenAPI is the contract source of truth; generated React Query and Zod files are consumed by the app and server.
- PostgreSQL stores periodic simulation snapshots while the engine keeps a bounded in-memory window for graceful fallback.

## Product

Operators can watch environmental conditions, synthetic tracking, predictive health, control recommendations, alerts, and simulated history from one responsive console. Demo controls start, pause, and reset the simulation.

## User preferences

No additional preferences recorded.

## Gotchas

- Run API codegen after changing `lib/api-spec/openapi.yaml`.
- Run `pnpm run typecheck:libs` after changing a `lib/*` package before checking artifacts.
- Do not present simulation values as real detection, hardware control, or field validation.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
