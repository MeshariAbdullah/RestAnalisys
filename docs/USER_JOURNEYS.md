# User journeys

This file walks through the main end-to-end flows the platform supports.
Every step maps to a real API call and a real page in the SPA.

---

## 1. Asset owner — submit and list

**Goal**: turn a piece in their closet into monthly income.

1. **Register** as an owner at `/register`.
2. **Verify Nafath** (prompt appears before first submission in production;
   auto-passes in dev).
3. **Submit asset** (`/owner/submit`):
   - Pick category, brand, model, title.
   - Declare a value.
   - Upload photos.
   - API: `POST /api/assets` → asset goes to `pending_approval`.
4. **Admin reviews** and sends the asset for intake inspection.
5. **Inspector** writes the intake report (`/inspector/report/:id`):
   - Authenticity verified?
   - Condition score and grade.
   - Proposed market value.
   - Proposed daily rental price.
   - API: `POST /api/inspections/intake`.
6. **Owner receives a valuation proposal** on `/owner/assets/:id`.
   - Approves → status becomes `in_vault`.
   - Rejects → asset is withdrawn.
   - API: `POST /api/assets/:id/valuation-response`.
7. **Operations** marks the asset physically received
   (`POST /api/assets/:id/received`), assigning a warehouse location.
8. **Admin** publishes the listing (`POST /api/assets/:id/publish`).
9. Asset is now **listed** — visible to renters on `/browse`.

---

## 2. Renter — book a luxury item

**Goal**: rent a designer handbag for 7 days for a wedding.

1. **Register** as a renter at `/register`.
2. **Verify Nafath** before booking.
3. **Browse** the catalog at `/browse`:
   - Filter by category.
   - API: `GET /api/assets/listings`.
4. **Open a listing** at `/browse/:id`:
   - Pick start and end date.
   - Instant quote shows daily × days, platform fee, VAT, total.
   - API: `GET /api/rentals/quote`.
5. **Reserve** (`POST /api/rentals`):
   - Backend runs the risk engine.
   - On approval, a `legal_commitments` row is created and the user is
     redirected to `/legal/:commitmentId`.
6. **Review the contract** in English or Arabic:
   - 8 clauses, canonical hash, commitment amount (100% or 150% of value).
7. **Sign** via Nafath (`POST /api/legal/sign`):
   - Returns a Nafith Sanad.
   - Rental advances to `pending_payment`.
8. **Pay** (`POST /api/payments/charge`):
   - Payment gateway captures the total.
   - ZATCA invoice is created with a QR payload.
   - Rental advances to `confirmed`.
9. Renter lands on `/my-rentals` and watches the status move through
   `in_fulfillment` → `out_for_delivery` → `delivered` → `in_use` →
   `awaiting_return` → `returned` → `closed_clean`.

---

## 3. Inspector — intake and return reports

**Goal**: keep the vault honest.

1. **Queue** at `/inspector`:
   - Assets with status `in_inspection` and rentals awaiting return.
2. **Intake inspection** (`/inspector/report/:assetId`):
   - Authenticate, grade, value, price, risk category.
   - On submit the asset advances to `awaiting_owner_approval`.
3. **Return inspection**:
   - Same form but tied to a rental.
   - API: `POST /api/inspections/return`.
   - Backend writes the inspection and returns a hint for ops (`clean`,
     `penalty`, `major_damage`, `loss`) based on condition delta.

---

## 4. Operations — logistics

**Goal**: get items to renters on time and back to the vault undamaged.

1. **Dashboard** at `/ops` shows active rentals, late rentals, open alerts,
   inventory by status.
2. **Shipments** at `/ops/shipments`:
   - See all outbound and return shipments.
   - Update status (picked_up → in_transit → delivered).
3. **Inventory** at `/ops/inventory`:
   - Full warehouse roster with live status.
4. **Alerts** at `/ops/alerts`:
   - Operational alerts raised by the system (overdue returns, late payments,
     suspicious patterns).
5. **Progress rentals**:
   - `POST /api/rentals/:id/fulfill` — ready to ship.
   - `POST /api/rentals/:id/delivered` — renter received.
   - `POST /api/rentals/:id/returned` — item back at the vault.

---

## 5. Admin — moderation, disputes, finance

**Goal**: run the platform day-to-day.

1. **Admin dashboard** at `/admin`:
   - Users, listed assets, rented assets, rentals this month, revenue
     breakdown, open disputes, active Sanads, Sanads under execution.
2. **Asset approvals** at `/admin/approvals`:
   - Approve or reject new submissions.
   - Publish inspected assets as listings.
3. **Users** at `/admin/users`:
   - Filter by role, block / unblock.
4. **Disputes** at `/admin/disputes`:
   - Resolve with notes and an optional resolution amount.
   - Options: in favour of renter / platform / owner, or escalate to legal.
5. **Financial overview** at `/admin/finance`:
   - Last-30-days revenue trend with gross, fees and VAT.
6. **Sanad tracking** at `/admin/sanad`:
   - All Sanads + pending enforcement tab.
   - Discharge happy-path Sanads.
   - File execution for defaulted ones.

---

## 6. Bad-path — loss and enforcement

**Goal**: make the owner whole when a rental goes wrong.

1. Renter returns the item damaged beyond repair, or fails to return at all.
2. Ops runs the return inspection and grades it `D` with a huge value drop.
3. Admin closes the rental with outcome `major_damage` or `loss`
   (`POST /api/rentals/:id/close`).
4. Backend:
   - Calculates the deficit vs. the legal commitment.
   - If the renter voluntarily pays → `payments/charge` against the penalty.
   - If not → `sanad_records.status = defaulted`.
5. Admin lands on `/admin/sanad` → "Pending enforcement" tab → clicks
   "File execution". This triggers `nafithService.executeSanad()` which
   returns a Najiz case number.
6. Owner is paid evaluated value from the platform treasury; the platform
   collects from the renter via Najiz.

---

## 7. Happy owner payout

**Goal**: pay the owner their share after a clean return.

1. Rental closes with outcome `clean`.
2. Admin clicks "Release payout" on `/admin/finance`
   (`POST /api/payments/payout/:rentalId`).
3. Backend calls `computeOwnerPayout()`:
   - `ownerShare = rentalSubtotal − platformFee − insuranceFee`.
4. A `payouts` row is written with status `pending_bank_transfer`.
5. Bank integration (stubbed) releases the SAR to the owner's IBAN.
6. Owner sees the entry on `/owner/payouts`.
