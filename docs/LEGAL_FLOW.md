# Legal flow

MLR is fully managed: every rental is contracted directly between the
**platform** and the **renter**. The owner has a separate one-time agreement
with the platform and never interacts with renters.

## Actors

- **Platform (MLR)** — the legal counterparty for every rental. Holds a
  commercial registration (PLATFORM_COMMERCIAL_ID).
- **Renter** — identified via Nafath, signs the commitment, issues the Sanad.
- **Owner** — identified via a signed `owner_agreements` row, receives
  payouts after rentals close cleanly.
- **Nafath (Saudi Digital Identity)** — provides identity proof and
  signature events.
- **Nafith (Ministry of Justice e-Sanad)** — issues, holds, discharges and
  executes promissory notes.
- **Najiz (Execution courts)** — receives mature Sanads for enforcement.

## State machines

### `legal_commitments.status`
```
draft
  └─▶ pending_signature
         ├─▶ signed
         │     ├─▶ active
         │     └─▶ cancelled
         └─▶ expired
```

### `sanad_records.status`
```
pending_issuance
  └─▶ issued
         ├─▶ signed ─▶ active ─▶ discharged
         │                  └──▶ matured ─▶ under_execution ─▶ executed
         └─▶ cancelled
not_required   (used when the platform waives the Sanad, e.g. trusted user
                with low-value item under an internal flag)
```

## Clauses generated at booking time

`server/src/services/legalService.ts` generates **8 clauses** in parallel
English and Arabic copy. The key ones:

1. **Parties & contract scope** — platform and renter identifiers.
2. **Asset and period** — brand, model, evaluated value, rental window.
3. **Price, fees, VAT** — exact halalas for each line item.
4. **Renter's commitment** — the 100% or 150% principal, secured by Sanad.
5. **Loss and damage** — ownership of risk, penalty ladder.
6. **Return conditions** — how, where and when.
7. **Dispute resolution** — internal mediation then Saudi law.
8. **Digital signature** — Nafath and Nafith binding clause.

All 8 clauses are concatenated into a **canonical text** and hashed with
SHA-256. The hash and text are stored in `legal_commitments.text_hash` and
`legal_commitments.canonical_text` at booking time and are **never rewritten**.
This gives both parties a tamper-evident record of what was signed.

## Happy-path flow

```
[Renter]        [API]                [Nafath]     [Nafith]     [Gateway/ZATCA]
   │   POST /rentals                    │            │              │
   │───────────────▶                    │            │              │
   │              creates commitment    │            │              │
   │                                    │            │              │
   │   POST /legal/sign                 │            │              │
   │───────────────▶  signAuthn ─────▶  │            │              │
   │                  (returns txId)    │            │              │
   │                  issueSanad ─────────────────▶ │               │
   │                                    │   (Sanad issued)          │
   │   status: pending_payment          │            │              │
   │                                    │            │              │
   │   POST /payments/charge            │            │              │
   │───────────────▶  chargeCard ────────────────────────────────▶  │
   │                  + ZATCA invoice                               │
   │   status: confirmed                │            │              │
```

## Bad-path flow (loss or major damage)

1. Ops closes the rental with outcome `major_damage` or `loss`.
2. The platform tries to collect voluntarily (settle or refund tree).
3. If the renter refuses, admin calls `POST /api/legal/sanad/execute` which
   calls `nafithService.executeSanad()` and records an `execution_case_number`
   returned by Najiz.
4. The Sanad is marked `under_execution`. Najiz enforces against the renter.
5. Once funds clear, the owner is paid the evaluated value directly — the
   loss is absorbed by the renter via the Sanad, **not** by the owner.

## Nafith Sanad mechanics

- The Sanad is always denominated at the **legal commitment** amount, not the
  rental price. For new renters that means **150%** of the asset's evaluated
  value.
- The **maturityDate** equals the rental `endDate`. If the item is returned on
  time and clean, the Sanad is discharged the same day. Otherwise it matures
  and becomes immediately enforceable via Najiz.
- The `nafith_reference` is the authoritative key for any follow-up.

## Audit trail

Every legal action is recorded twice:

1. In `audit_logs` with the acting user + before/after JSON.
2. In `integration_events` with the raw request/response to Nafath or Nafith
   (for legal defensibility).

## Dev-mode behavior

Without `NAFATH_API_KEY` / `NAFITH_API_KEY` set, both services auto-respond
with success and synthetic reference numbers. This lets the full flow run
locally without any external dependencies while preserving the exact same
code path as production.
