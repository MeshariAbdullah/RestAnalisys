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
  userId: number;
  accountAgeDays: number;
  nafathVerified: boolean;
  kycVerified: boolean;
  nationalId?: string;
  completedRentalsCount: number;
  disputedRentalsCount: number;
  totalRentalsCount: number;
  onTimeReturnRate: number;          // 0–1
  currentTrustScore: number;         // 0–100
  assetEvaluatedValueHalalas: number;
  assetRiskCategory: RiskCategory;
  durationDays: number;
  priorBlockFlags: boolean;
  hasActiveDispute: boolean;
}
```

`buildRiskFeatures()` in `routes/rentals.ts` aggregates them from the DB.

## Decision flow

### Hard rejects
The engine fails fast if any of these are true:

1. User is blocked (`priorBlockFlags === true`).
2. Nafath identity is not verified.
3. KYC is not verified.
4. User has an active dispute.
5. Final computed score < `HARD_REJECT_SCORE` (25).

### Base score
Starts at **50** and is adjusted by modifiers.

| Modifier                         | Delta   |
| -------------------------------- | ------- |
| Account age ≥ 365 days           | +15     |
| Account age ≥ 90 days            | +8      |
| Account age < 30 days            | -10     |
| ≥ 5 completed rentals            | +15     |
| ≥ 1 completed rental             | +5      |
| Zero rentals                     | -5      |
| Dispute rate ≤ 5%                | +10     |
| Dispute rate ≤ 15%               | 0       |
| Dispute rate > 15%               | -25     |
| On-time return rate ≥ 0.95       | +10     |
| On-time return rate ≥ 0.80       | 0       |
| On-time return rate < 0.80       | -15     |
| Asset value ≥ 500,000 SAR        | -5      |
| Asset `risk_category = ultra_high` | -10   |
| Asset `risk_category = high`     | -5      |
| Duration > 30 days               | -5      |

The score is clamped to `[0, 100]`.

### Manual review band
Scores between `HARD_REJECT_SCORE` (25) and `MANUAL_REVIEW_SCORE` (40) are
**flagged for manual review** — the booking is created but the rental is
held at `pending_risk_review` until admin intervention.

### Commitment percentage

A user is considered **trusted** when all of the following hold:

- Account age ≥ 90 days
- Completed rentals ≥ 3
- Disputed rentals = 0
- Computed score ≥ 70

Trusted users sign a commitment of **100%** of the evaluated value.
Everyone else signs **150%** (a new-customer "deposit + penalty").

This percentage is both stored in `rentals.legal_commitment_pct` and burned
into the immutable legal commitment text.

## Outputs

```ts
interface RiskDecision {
  score: number;                  // 0-100
  outcome:
    | "approved"
    | "manual_review"
    | "rejected_hard"
    | "rejected_score";
  commitmentPct: 100 | 150;
  reasons: string[];              // human-readable modifiers applied
  hardRejectReason?: string;
  trusted: boolean;
}
```

The calling route writes the full decision to `risk_scores`, then:

- `approved` → create rental + legal commitment
- `manual_review` → same, but rental status is `pending_risk_review`
- `rejected_*` → throw `RiskRejectionError` → HTTP 422 with reason

## Auditability

Every decision is persisted to `risk_scores` with:

- The full feature snapshot (`features_json`)
- The computed score and outcome
- The list of reasons
- The `rental_id` (nullable for quotes)

This gives us a perfect historical trail: "why did we approve this booking?"
can always be answered from a single row.

## Tuning

To change thresholds, edit the constants at the top of `riskEngine.ts`:

```ts
const HARD_REJECT_SCORE = 25;
const MANUAL_REVIEW_SCORE = 40;
const TRUSTED_MIN_SCORE = 70;
const TRUSTED_MIN_RENTALS = 3;
const TRUSTED_MIN_AGE_DAYS = 90;
```

All modifier weights are also in this file. There is no external config file
by design — changing risk behavior is a code review.
