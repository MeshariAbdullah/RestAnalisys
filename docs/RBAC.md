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
| `super_admin` | Admin + system.impersonate (union of all permissions)       |

## Permission matrix

This is the source of truth. A check means that role has the permission. Blank
means denied. Permissions use **dot notation** (e.g. `asset.submit`).

| Permission                     | renter | owner | inspector | operations | admin | super_admin |
| ------------------------------ | :----: | :---: | :-------: | :--------: | :---: | :---------: |
| `asset.submit`                 |        |   x   |           |            |       |      x      |
| `asset.read.own`               |        |   x   |           |            |       |      x      |
| `asset.read.any`               |        |       |     x     |     x      |   x   |      x      |
| `asset.approve`                |        |       |           |            |   x   |      x      |
| `asset.reject`                 |        |       |           |            |   x   |      x      |
| `asset.withdraw`               |        |   x   |           |            |       |      x      |
| `asset.list`                   |   x    |       |           |            |       |      x      |
| `inspection.create`            |        |       |     x     |            |       |      x      |
| `inspection.update`            |        |       |     x     |            |       |      x      |
| `inspection.read`              |        |       |     x     |     x      |   x   |      x      |
| `rental.create`                |   x    |       |           |            |       |      x      |
| `rental.read.own`              |   x    |   x   |           |            |       |      x      |
| `rental.read.any`              |        |       |           |     x      |   x   |      x      |
| `rental.cancel`                |   x    |       |           |            |   x   |      x      |
| `rental.fulfill`               |        |       |           |     x      |       |      x      |
| `rental.close`                 |        |       |           |     x      |       |      x      |
| `legal.sign`                   |   x    |       |           |            |       |      x      |
| `legal.enforce`                |        |       |           |            |   x   |      x      |
| `legal.read.any`               |        |       |           |            |   x   |      x      |
| `payment.charge`               |        |       |           |            |       |      x      |
| `payment.refund`               |        |       |           |            |   x   |      x      |
| `payment.read`                 |   x    |   x   |           |            |   x   |      x      |
| `payout.release`               |        |       |           |            |   x   |      x      |
| `user.read`                    |        |       |           |            |   x   |      x      |
| `user.block`                   |        |       |           |            |   x   |      x      |
| `user.create_staff`            |        |       |           |            |   x   |      x      |
| `finance.read`                 |        |       |           |            |   x   |      x      |
| `finance.export`               |        |       |           |            |   x   |      x      |
| `dispute.open`                 |   x    |   x   |           |     x      |       |      x      |
| `dispute.assign`               |        |       |           |            |   x   |      x      |
| `dispute.resolve`              |        |       |           |            |   x   |      x      |
| `operations.read`              |        |       |           |     x      |   x   |      x      |
| `operations.update`            |        |       |           |     x      |       |      x      |
| `system.audit`                 |        |       |           |            |   x   |      x      |
| `system.impersonate`           |        |       |           |            |       |      x      |

## The Nafath gate

Certain actions additionally require a verified Saudi digital identity.
Routes that perform money movement or enter into legal contracts also use
`requireNafath`:

- `POST /api/rentals`
- `POST /api/legal/sign`
- `POST /api/payments/charge`

Unverified users hitting these endpoints receive a 403 with a hint to complete
Nafath before retrying.

## Frontend enforcement

Routes in `client/src/App.tsx` are wrapped with `<ProtectedRoute roles={[...]}>`,
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
3. Wrap the Express route with `requirePermission("your.permission")`.
4. Update this doc.

Never hard-code role checks inside a route body — always go through the
middleware so the permission matrix stays the single source of truth.
