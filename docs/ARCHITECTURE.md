# Architecture

## Overview

MLR is a classical 3-tier application:

```
 ┌──────────────┐      HTTPS / JSON       ┌───────────────┐
 │  React SPA   │  ────────────────────▶  │  Express API  │
 │  (client/)   │                         │   (server/)   │
 └──────────────┘                         └──────┬────────┘
                                                 │
                                                 ▼
                                          ┌───────────────┐
                                          │  PostgreSQL   │
                                          │  (Drizzle)    │
                                          └───────────────┘
                                                 │
                    ┌────────────┬───────────────┼──────────────────┐
                    ▼            ▼               ▼                  ▼
               Nafath API   Nafith API      Payment gateway    SMS / Email
               (identity)   (Sanad)         + ZATCA            (Twilio/SendGrid)
                    │
              ┌─────┴─────┐
              ▼           ▼
         SPL Address   S3 Storage
         (National)    (Images)
```

## Tech stack

**Backend**
- Node 20+, Express 4, TypeScript (strict)
- Drizzle ORM + PostgreSQL (`pg` driver)
- Zod for input validation
- JWT (`jsonwebtoken`) + bcryptjs
- Centralized error handler, async route wrapping
- Declarative RBAC permission matrix
- Immutable `audit_logs` table for material actions
- Integration services are thin adapters with dev-mode stubs

**Frontend**
- React 18 + Vite + TypeScript
- Wouter (lightweight router)
- TanStack Query v5 for server state
- Tailwind CSS + shadcn/ui primitives
- Typed API client (`src/lib/api.ts`) mirrors backend response shapes

**Infrastructure (target)**
- Render.com (see `render.yaml`) — swap to your PaaS of choice
- Postgres managed
- S3-compatible storage for images (implementation pending; API accepts
  pre-uploaded URLs today)

## Directory layout

See the repo root `README.md`. The two important conventions:

1. **Money is always stored and transmitted as `halalas` (bigint)** — never as
   a float. The helper `halalasToSar` / `formatSar` are the only places that
   convert back to SAR for display.
2. **Every state transition goes through a route handler**, not via ad-hoc DB
   updates. This guarantees an audit log entry and the correct enum values.

## Core domain objects

| Table                  | Purpose                                                   |
| ---------------------- | --------------------------------------------------------- |
| `users`                | All accounts, including staff. Includes trust score, risk category, Nafath / KYC flags. |
| `roles`                | Seed-time static list used for display.                   |
| `owner_agreements`     | The contract between the platform and each asset owner.  |
| `assets`               | Every luxury item under management (14-state machine).   |
| `inspections`          | Intake and return inspections by inspectors.              |
| `inventory_movements`  | Every warehouse in/out event for an asset.                |
| `rentals`              | A single booking (13-state machine) — quote → fulfillment → closure. |
| `risk_scores`          | Snapshot of the risk engine's decision at booking time.   |
| `legal_commitments`    | Contract text + clauses + SHA-256 hash + signing metadata.|
| `sanad_records`        | Nafith promissory notes tied to rentals.                  |
| `payments`             | Customer charges and refunds with ZATCA invoice metadata. |
| `payouts`              | Owner payouts after rentals close clean.                  |
| `disputes`             | Disputes between renters / owners / platform.             |
| `shipments`            | Outbound to renter + return to warehouse.                 |
| `operational_alerts`   | Anomalies flagged by the system for ops attention.        |
| `audit_logs`           | Immutable record of material actions.                     |
| `integration_events`   | Raw request/response of external API calls.               |
| `notifications`        | All sent notifications (SMS, email, push) per user.       |
| `notification_preferences` | Per-user channel and category preferences.            |

## Data flow for a rental

1. **Quote** — `GET /api/rentals/quote` computes daily price × days + fees + VAT.
2. **Create** — `POST /api/rentals` runs `computeRiskDecision()` and, on
   approval, writes the rental and the legal commitment atomically.
3. **Sign** — `POST /api/legal/sign` hits Nafath for signature, issues a
   Nafith Sanad, and advances the rental to `pending_payment`.
4. **Pay** — `POST /api/payments/charge` captures payment via the gateway and
   writes a ZATCA invoice; rental advances to `confirmed`.
5. **Fulfill → delivered → returned** — Operations progresses the rental.
6. **Close** — outcome is `clean | penalty | major_damage | loss`. On clean,
   Sanad is discharged, payout released. On loss / major damage, Sanad is
   moved to execution via `POST /api/legal/sanad/execute`.

## Money arithmetic

All amounts are `bigint` halalas (1 SAR = 100 halalas) both in the DB
(`bigint` columns) and in JSON responses. `server/src/utils/money.ts` owns
every computation (quote, VAT, platform fee, owner payout). No other module
multiplies or divides currency values.

VAT is fixed at 15% (`VAT_RATE = 0.15`).

## Security model

- **Authentication**: JWT with a platform secret, issued at login and carrying
  `{ userId, email, role, nafathVerified }`.
- **Authorization**: `middleware/rbac.ts` declares a permission map keyed by
  role. Routes use `requireRole(...)` and/or `requirePermission(...)`.
- **Nafath gate**: `requireNafath` blocks high-trust actions until identity is
  verified.
- **Input validation**: every mutating route parses its body through a Zod
  schema defined in `utils/schemas.ts`.
- **Audit logs**: every state transition calls `recordAudit()` so we always
  have a before/after snapshot.
- **No PII in URLs**: national IDs, phone numbers etc. are always in the body.

## Testing the happy path

```bash
cd server && npm run db:push && npm run db:seed
cd .. && npm run dev
# Open http://localhost:5173
# Sign in as renter@demo.sa / Mlr@2024!
# Browse → pick an asset → book → sign → pay → view in My rentals
```
