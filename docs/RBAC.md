# RBAC — Role-Based Access Control

Authorization is enforced at the Express route level via two middleware
functions from `server/src/middleware/rbac.ts`:

- `requireRole(...roles)` — a user's role must be in the list.
- `requirePermission(permission)` — a user's role must include that
  permission in `ROLE_PERMISSIONS`.

## Roles

| Role          | Description                                                 |
| ------------- | ----------------------------------------------------------- |
| `renter`      | Can browse, book, sign, pay, view own rentals, open disputes|
| `owner`       | Can submit assets, approve valuations, view own payouts     |
| `inspector`   | Can view the inspection queue and submit intake/return reports |
| `operations`  | Can manage shipments, inventory, ops alerts, progress rentals |
| `admin`       | Full moderation (assets, disputes, Sanads, users)           |
| `super_admin` | Admin + ability to create staff users                       |

## Permission matrix

This is the source of truth. A ✓ means that role has the permission. Blank
means denied.

| Permission                     | renter | owner | inspector | operations | admin | super_admin |
| ------------------------------ | :----: | :---: | :-------: | :--------: | :---: | :---------: |
| `asset:submit`                 |        |   ✓   |           |            |       |             |
| `asset:withdraw_own`           |        |   ✓   |           |            |       |             |
| `asset:approve_valuation`      |        |   ✓   |           |            |       |             |
| `asset:review`                 |        |       |           |            |   ✓   |      ✓      |
| `asset:publish`                |        |       |           |            |   ✓   |      ✓      |
| `asset:receive`                |        |       |           |     ✓      |       |             |
| `asset:browse`                 |   ✓    |       |           |            |       |             |
| `inspection:queue`             |        |       |     ✓     |            |   ✓   |      ✓      |
| `inspection:create`            |        |       |     ✓     |            |       |             |
| `rental:quote`                 |   ✓    |       |           |            |       |             |
| `rental:create`                |   ✓    |       |           |            |       |             |
| `rental:view_own`              |   ✓    |       |           |            |       |             |
| `rental:view_all`              |        |       |           |     ✓      |   ✓   |      ✓      |
| `rental:progress`              |        |       |           |     ✓      |       |             |
| `rental:close`                 |        |       |           |            |   ✓   |      ✓      |
| `legal:sign`                   |   ✓    |       |           |            |       |             |
| `legal:enforce`                |        |       |           |            |   ✓   |      ✓      |
| `payment:charge`               |   ✓    |       |           |            |       |             |
| `payment:refund`               |        |       |           |            |   ✓   |      ✓      |
| `payout:release`               |        |       |           |            |   ✓   |      ✓      |
| `payout:view_own`              |        |   ✓   |           |            |       |             |
| `dispute:open`                 |   ✓    |   ✓   |           |            |       |             |
| `dispute:resolve`              |        |       |           |            |   ✓   |      ✓      |
| `ops:shipment`                 |        |       |           |     ✓      |       |             |
| `ops:inventory`                |        |       |           |     ✓      |       |             |
| `ops:alerts`                   |        |       |           |     ✓      |       |             |
| `admin:users`                  |        |       |           |            |   ✓   |      ✓      |
| `admin:block_user`             |        |       |           |            |   ✓   |      ✓      |
| `admin:create_staff`           |        |       |           |            |       |      ✓      |
| `admin:kpis`                   |        |       |           |            |   ✓   |      ✓      |

## The Nafath gate

Certain actions additionally require a verified Saudi digital identity.
Routes that perform money movement or enter into legal contracts also use
`requireNafath`:

- `POST /api/rentals`
- `POST /api/legal/sign`
- `POST /api/payments/charge`

Unverified users hit these endpoints receive a 403 with a hint to complete
Nafath before retrying.

## Frontend enforcement

Routes in `client/src/App.tsx` are wrapped with `<ProtectedRoute roles={[…]}>`,
which:

1. Redirects to `/login` if unauthenticated.
2. Redirects to `/login` if the user's role isn't in the allow-list.
3. Otherwise renders the nested page inside the shared `<Layout />`.

The layout itself filters the sidebar to only show items for the current
role, so a renter never sees "Admin dashboard" and an inspector never sees
"Browse catalog".

## Changing permissions

To add or remove a permission:

1. Add it to the `Permission` union type in `rbac.ts`.
2. Add it to the appropriate rows in `ROLE_PERMISSIONS`.
3. Wrap the Express route with `requirePermission("your:permission")`.
4. Update this doc.

Never hard-code role checks inside a route body — always go through the
middleware so the permission matrix stays the single source of truth.
