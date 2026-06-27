# API Reference

All endpoints are rooted at `/api`. All responses are JSON. Authenticated
endpoints require `Authorization: Bearer <JWT>`.

Errors follow the shape `{ error: string, code?: string, details?: any }`.

## Conventions

- Money amounts are `halalas` (SAR × 100) as integers.
- Dates are ISO-8601 strings.
- All enums are the exact Postgres enum values (e.g. `"pending_approval"`).
- RBAC is enforced by middleware; 403 responses indicate missing role or
  permission.

---

## Auth — `/api/auth`

| Method | Path                 | Roles           | Purpose                                |
| ------ | -------------------- | --------------- | -------------------------------------- |
| POST   | `/register`          | public          | Create a renter or owner account       |
| POST   | `/login`             | public          | Email + password → JWT                 |
| POST   | `/nafath/initiate`   | authenticated   | Begin Nafath identity verification     |
| GET    | `/me`                | authenticated   | Current user profile                   |

## Assets — `/api/assets`

| Method | Path                         | Roles                   | Purpose                                  |
| ------ | ---------------------------- | ----------------------- | ---------------------------------------- |
| POST   | `/`                          | owner                   | Submit a new asset for inspection        |
| GET    | `/mine`                      | owner                   | My submitted assets                      |
| POST   | `/:id/withdraw`              | owner                   | Withdraw an asset from the platform      |
| POST   | `/:id/valuation-response`    | owner                   | Approve or reject proposed valuation     |
| GET    | `/pending`                   | admin / super_admin     | Queue of assets awaiting approval        |
| POST   | `/review`                    | admin / super_admin     | Approve or reject a submitted asset      |
| POST   | `/:id/received`              | operations              | Mark asset received in the warehouse     |
| POST   | `/:id/publish`               | admin / super_admin     | Publish an inspected asset as a listing  |
| GET    | `/listings`                  | renter                  | Browse live catalog                      |
| GET    | `/listings/:id`              | renter                  | Listing detail                           |
| GET    | `/:id`                       | owner / admin / ops     | Asset detail for back-office             |

## Inspections — `/api/inspections`

| Method | Path               | Roles                   | Purpose                             |
| ------ | ------------------ | ----------------------- | ----------------------------------- |
| GET    | `/queue`           | inspector / admin       | Queue of assets awaiting inspection |
| POST   | `/intake`          | inspector               | Submit an intake inspection report  |
| POST   | `/return`          | inspector               | Submit a return inspection report   |
| GET    | `/asset/:assetId`  | inspector / admin / ops | All inspections for an asset        |

## Rentals — `/api/rentals`

| Method | Path             | Roles                    | Purpose                                          |
| ------ | ---------------- | ------------------------ | ------------------------------------------------ |
| GET    | `/quote`         | renter                   | Price quote for a date range                     |
| POST   | `/`              | renter                   | Create rental + run risk engine + legal commit  |
| GET    | `/mine`          | renter                   | My rentals                                       |
| GET    | `/`              | admin / super_admin / ops| All rentals                                      |
| GET    | `/:id`           | authenticated            | Full rental + legal + Sanad + payments           |
| POST   | `/:id/fulfill`   | operations               | Move rental into fulfillment                     |
| POST   | `/:id/delivered` | operations               | Confirm delivery to renter                       |
| POST   | `/:id/returned`  | operations               | Confirm return received                          |
| POST   | `/:id/close`     | admin / super_admin      | Close with outcome (`clean`/`penalty`/`major_damage`/`loss`) |
| POST   | `/:id/cancel`    | renter / admin           | Cancel a rental with reason                      |

## Legal & Sanad — `/api/legal`

| Method | Path                     | Roles                 | Purpose                                           |
| ------ | ------------------------ | --------------------- | ------------------------------------------------- |
| GET    | `/commitment/:id`        | renter / admin        | Contract text + clauses + summary                 |
| POST   | `/sign`                  | renter                | Sign via Nafath + issue Nafith Sanad              |
| GET    | `/pending-enforcement`   | admin / super_admin   | Sanads in default                                 |
| POST   | `/sanad/:id/discharge`   | admin / super_admin   | Mark Sanad as discharged                          |
| POST   | `/sanad/execute`         | admin / super_admin   | File Sanad for execution via Najiz                |
| GET    | `/sanads`                | admin / super_admin   | All Sanads                                        |

## Payments — `/api/payments`

| Method | Path                   | Roles                 | Purpose                                  |
| ------ | ---------------------- | --------------------- | ---------------------------------------- |
| POST   | `/charge`              | renter                | Charge the renter for a rental + ZATCA invoice |
| POST   | `/refund`              | admin / super_admin   | Refund all or part of a payment          |
| GET    | `/mine`                | renter                | My payment history                       |
| POST   | `/payout/:rentalId`    | admin / super_admin   | Release owner payout                     |
| GET    | `/payouts/mine`        | owner                 | My payouts                               |

## Disputes — `/api/disputes`

| Method | Path            | Roles                 | Purpose                   |
| ------ | --------------- | --------------------- | ------------------------- |
| POST   | `/`             | renter / owner        | Open a dispute            |
| GET    | `/`             | admin / super_admin   | All disputes              |
| POST   | `/:id/assign`   | admin / super_admin   | Assign to a staff member  |
| POST   | `/resolve`      | admin / super_admin   | Resolve with notes + amount |

## Operations — `/api/operations`

| Method | Path                              | Roles       | Purpose                          |
| ------ | --------------------------------- | ----------- | -------------------------------- |
| GET    | `/summary`                        | operations  | Ops dashboard counters           |
| GET    | `/shipments`                      | operations  | All shipments                    |
| POST   | `/shipments`                      | operations  | Schedule a shipment              |
| PATCH  | `/shipments/:id`                  | operations  | Update a shipment status         |
| GET    | `/inventory`                      | operations  | Inventory list                   |
| GET    | `/inventory/:assetId/movements`   | operations  | Movement history for an asset    |
| GET    | `/alerts`                         | operations  | Operational alerts               |
| POST   | `/alerts/:id/resolve`             | operations  | Resolve an alert                 |

## Admin — `/api/admin`

| Method | Path                  | Roles                 | Purpose                                |
| ------ | --------------------- | --------------------- | -------------------------------------- |
| GET    | `/kpis`               | admin / super_admin   | Platform-wide KPIs                     |
| GET    | `/revenue-trend`      | admin / super_admin   | 30-day revenue trend                   |
| GET    | `/risk/low-trust`     | admin / super_admin   | Low-trust renters                      |
| GET    | `/risk/recent`        | admin / super_admin   | Recent risk decisions (paginated)      |
| GET    | `/users`              | admin / super_admin   | Users (paginated, filterable, search)  |
| POST   | `/users/:id/block`    | admin / super_admin   | Block or unblock a user                |
| POST   | `/users`              | super_admin           | Create staff users                     |
| GET    | `/overdue`            | admin / operations    | List overdue rentals                   |
| POST   | `/overdue/process`    | admin / operations    | Trigger overdue processing + alerts    |
| GET    | `/audit-logs`         | admin / super_admin   | Searchable audit log (paginated)       |
| GET    | `/stats`              | admin / super_admin   | Platform statistics breakdown          |

### Pagination

Paginated endpoints accept `page` (default 1) and `limit` (default 50, max 100) query params.
Response shape: `{ data: [...], pagination: { page, limit, total, totalPages } }`.

### Rate Limiting

All API requests are rate-limited per IP:
- Global: 100 requests/minute
- Auth endpoints: 15 requests/15 minutes
- Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` (on 429)

## Health

| Method | Path          | Roles  | Purpose                                     |
| ------ | ------------- | ------ | ------------------------------------------- |
| GET    | `/api/health` | public | Service + DB status + integration readiness |
