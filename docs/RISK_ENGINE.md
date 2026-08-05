# Risk engine

The risk engine is a pure function that reads a feature snapshot and returns
a decision. It lives in [`server/src/services/riskEngine.ts`](../server/src/services/riskEngine.ts)
and is unit-testable without a database.

## Why a pure function?

The engine is called synchronously from the rental booking route. We want:

- Full auditability — every decision is snapshotted into `risk_scores`.
- Deterministic replay — given the same features you get the same outcome.
- Easy to tune — thresholds live in one file.

## Features (inputs)

```ts
interface RiskFeatures {
  accountAgeDays: number;
  completedRentals: number;
  disputedRentals: number;
  cancelledRentals: number;
  lateReturns: number;
  nafathVerified: boolean;
  kycVerified: boolean;
  phoneVerified: boolean;
  emailVerified: boolean;
  priorBlock: boolean;
  requestedAssetValueHalalas: number;
  userRole: Role;
  countryIsSaudi: boolean;
}
```

`buildRiskFeatures()` in `routes/rentals.ts` aggregates them from the DB.

## Decision flow

### Hard rejects
The engine fails fast if any of these are true:

1. User is blocked (`priorBlock === true`).
2. Nafath identity is not verified.
3. KYC is not verified.
4. Final computed score < `HARD_REJECT_SCORE` (25).

### Base score
Starts at **50** and is adjusted by modifiers.

| Modifier                         | Delta   |
| -------------------------------- | ------- |
| Account age >= 365 days          | +15     |
| Account age >= 90 days           | +8      |
| Account age < 30 days            | -10     |
| >= 10 completed rentals          | +15     |
| >= 3 completed rentals           | +8      |
| Zero completed rentals           | -5      |
| Per disputed rental              | -10     |
| Per late return                  | -5      |
| >= 3 cancellations               | -8      |
| Phone verified                   | +2      |
| Email verified                   | +2      |
| Non-KSA identity                 | -10     |
| Asset value >= 100,000 SAR       | -10     |
| Asset value >= 30,000 SAR        | -5      |

The score is clamped to `[0, 100]`.

### Risk categories

| Score range  | Category     |
| ------------ | ------------ |
| >= 80        | low          |
| >= 60        | medium       |
| >= 25        | high         |
| < 25         | ultra_high   |

### Manual review band
Scores between `HARD_REJECT_SCORE` (25) and `MANUAL_REVIEW_SCORE` (40) are
**flagged for manual review** — the booking is created but the rental is
held at `pending_risk_review` until admin intervention via
`POST /rentals/:id/risk-review`.

### Commitment percentage

A user is considered **trusted** when all of the following hold:

- Account age >= 90 days
- Completed rentals >= 3
- Disputed rentals = 0
- Computed score >= 70

Trusted users sign a commitment of **100%** of the evaluated value.
Everyone else signs **150%** (a new-customer "deposit + penalty").

This percentage is both stored in `rentals.legal_commitment_pct` and burned
into the immutable legal commitment text.

## Outputs

```ts
interface RiskDecision {
  approved: boolean;
  rejectionReason?: string;
  baseScore: number;
  finalScore: number;
  modifiers: Array<{ key: string; delta: number; reason: string }>;
  riskCategory: RiskCategory;
  legalCommitmentPct: 100 | 150 | null;
  legalCommitmentHalalas: number;
  requiresReview: boolean;
  notes: string[];
}
```

The calling route writes the full decision to `risk_scores`, then:

- `approved && !requiresReview` — create rental at `pending_legal_signing`
- `approved && requiresReview` — create rental at `pending_risk_review`
- `!approved` — throw `RiskRejectionError` (HTTP 422)

## Trust score updates

After every rental closure (`clean`, `penalty`, or `enforcement`), the
renter's trust score is recalculated from their full history and persisted
to `users.trust_score` and `users.risk_category`.

## Auditability

Every decision is persisted to `risk_scores` with:

- The full feature snapshot
- The computed score and all modifiers applied
- The `rental_id` (nullable for rejected attempts)

This gives us a perfect historical trail: "why did we approve this booking?"
can always be answered from a single row.

## Tuning

To change thresholds, edit the constants at the top of `riskEngine.ts`:

```ts
const HARD_REJECT_SCORE = 25;
const MANUAL_REVIEW_SCORE = 40;
const TRUSTED_USER_AGE_DAYS = 90;
const TRUSTED_USER_MIN_RENTALS = 3;
```

All modifier weights are also in this file. There is no external config file
by design — changing risk behavior is a code review.
