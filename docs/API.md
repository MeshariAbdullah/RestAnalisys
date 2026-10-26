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
| GET    | `/risk/recent`        | admin / super_admin   | Recent risk engine decisions           |
| GET    | `/users`              | admin / super_admin   | All users (filter by role)             |
| POST   | `/users/:id/block`    | admin / super_admin   | Block or unblock a user                |
| POST   | `/users`              | super_admin           | Create staff users                     |

## Owner Agreements — `/api/owner-agreements`

| Method | Path         | Roles                 | Purpose                                      |
| ------ | ------------ | --------------------- | -------------------------------------------- |
| GET    | `/mine`      | owner                 | My consignment agreements                    |
| GET    | `/`          | admin / super_admin   | All agreements (paginated)                   |
| GET    | `/:id`       | owner / admin         | Agreement detail                             |
| POST   | `/`          | owner                 | Create a new consignment agreement           |
| POST   | `/:id/sign`  | owner                 | Sign the agreement (activates for 1 year)    |

## Health

| Method | Path          | Roles  | Purpose                                |
| ------ | ------------- | ------ | -------------------------------------- |
| GET    | `/api/health` | public | Service status + integration readiness |

---

## Pagination

List endpoints (`GET /rentals`, `GET /admin/users`, `GET /disputes`, `GET /operations/shipments`,
`GET /operations/alerts`, `GET /owner-agreements`) accept optional query parameters:

| Param  | Default | Range   | Purpose                    |
| ------ | ------- | ------- | -------------------------- |
| `page` | 1       | 1+      | Page number                |
| `limit`| 20      | 1–100   | Items per page             |

Paginated responses follow the shape:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Rate Limiting

Auth endpoints (`POST /auth/login`, `POST /auth/register`) are rate-limited to
15 requests per 15-minute window per IP. Responses include headers:

| Header                  | Purpose                                |
| ----------------------- | -------------------------------------- |
| `X-RateLimit-Limit`    | Maximum allowed requests in window     |
| `X-RateLimit-Remaining`| Remaining requests in current window   |
| `X-RateLimit-Reset`    | Unix timestamp when window resets      |

When exceeded, the server returns `429 Too Many Requests`.
