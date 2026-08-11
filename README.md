# MLR — Managed Luxury Rental Platform (Saudi Arabia)

A production-grade, fully managed luxury rental platform. Owners submit
handbags, watches and couture. MLR authenticates, evaluates, stores, insures,
ships and legally protects every rental — the contract is between **the
platform and the renter**, not owner-to-renter.

This is not peer-to-peer. MLR guarantees owners either the return of the asset
or full compensation equal to its evaluated value, backed by a Nafith Sanad
(MOJ electronic promissory note) signed by every renter.

---

## Highlights

- **5 user roles**: renter, asset owner, inspector, operations, admin / super_admin
- **Full asset lifecycle**: submission → inspection → valuation → listing →
  rental → return → closure (clean / penalty / major damage / loss)
- **Dynamic risk engine** with trust scores (150% commitment for new renters,
  100% for trusted) — see [`docs/RISK_ENGINE.md`](docs/RISK_ENGINE.md)
- **Saudi legal backstop**: Nafath identity + Nafith Sanad + ZATCA e-invoicing
  placeholders, ready to swap for real MOJ/ZATCA credentials
- **Money as `bigint` halalas** (SAR × 100) across DB, API and UI — no FP drift
- **VAT 15%** computed and stored on every rental
- **RBAC** with a declarative permission matrix
- **Immutable audit logging** of every material action
- **State machines** via Postgres enums for assets, rentals, Sanads, shipments,
  payments and disputes

---

## Repository layout

```
.
├── client/                   React + Vite + Tailwind + shadcn
│   └── src/
│       ├── pages/            Role-specific dashboards
│       ├── components/       Layout, ProtectedRoute, shadcn UI
│       └── lib/              api.ts (typed client), auth.ts
├── server/                   Express + TypeScript
│   └── src/
│       ├── db/               Drizzle schema, migrate, seed
│       ├── middleware/       auth, rbac, errorHandler
│       ├── services/         riskEngine, legalService, nafath/nafith/payment/audit
│       ├── routes/           auth, assets, inspections, rentals, legal,
│       │                     payments, disputes, operations, admin
│       └── utils/            money, errors, schemas (Zod), asyncHandler
├── server/migrations/        drizzle-kit SQL
├── docs/                     ARCHITECTURE, API, RISK_ENGINE, LEGAL_FLOW,
│                             RBAC, USER_JOURNEYS
└── render.yaml               Render.com blueprint
```

---

## Quick start

Prereqs: Node 20+, Postgres 14+.

```bash
# 1. Install everything
npm run install:all

# 2. Configure the environment
cp server/.env.example server/.env
# Set DATABASE_URL and JWT_SECRET at minimum.

# 3. Create the schema and seed demo data
cd server
npm run db:push       # or: npm run db:migrate
npm run db:seed

# 4. Start backend + frontend in parallel (from repo root)
cd ..
npm run dev
```

- Backend: <http://localhost:3001>
- Frontend: <http://localhost:5173>

### Demo accounts

Password for all: `Mlr@2024!`

| Role         | Email              |
| ------------ | ------------------ |
| super_admin  | admin@mlr.sa       |
| admin        | admin2@mlr.sa      |
| inspector    | inspector@mlr.sa   |
| operations   | ops@mlr.sa         |
| owner        | owner@mlr.sa       |
| renter       | renter@mlr.sa      |
| new renter   | new.renter@mlr.sa  |

---

## Integration placeholders

Every third-party integration has a dev-mode stub that returns plausible
data with zero external calls. Drop real credentials into `.env` to switch to
production mode.

| Service         | Stub file                              | Env keys                          |
| --------------- | -------------------------------------- | --------------------------------- |
| Nafath ID       | `server/src/services/nafathService.ts` | `NAFATH_API_BASE`, `NAFATH_API_KEY` |
| Nafith Sanad    | `server/src/services/nafithService.ts` | `NAFITH_API_BASE`, `NAFITH_API_KEY` |
| Payment gateway | `server/src/services/paymentService.ts`| `PAYMENT_GATEWAY_*`               |
| ZATCA invoicing | `server/src/services/paymentService.ts`| `ZATCA_API_*`                     |
| National Address| (planned)                              | `SPL_API_KEY`                     |

---

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Risk engine](docs/RISK_ENGINE.md)
- [Legal & Sanad flow](docs/LEGAL_FLOW.md)
- [RBAC permission matrix](docs/RBAC.md)
- [User journeys](docs/USER_JOURNEYS.md)

---

## Scripts (root)

| Script                | What it does                                   |
| --------------------- | ---------------------------------------------- |
| `npm run install:all` | Install root, server and client dependencies   |
| `npm run dev`         | Start backend + frontend in parallel           |
| `npm run build`       | Build client then server for production        |
| `npm run db:generate` | Drizzle-kit generate a new migration           |
| `npm run db:migrate`  | Apply migrations to `DATABASE_URL`             |
| `npm run db:seed`     | Seed the database with demo data               |

---

## License

Proprietary · © MLR
