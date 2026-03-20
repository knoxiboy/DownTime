# Policy Model — DownTime Parametric Income Protection

## What Is Covered (ONLY this)

- Lost working hours caused by verified external disruptions
- Calculated as: hours unable to work × hourly income rate

## What Is NEVER Covered (hard exclusion)

- Health insurance or medical bills
- Accident claims
- Vehicle repair costs
- Theft or damage

## Pricing Model: WEEKLY ONLY

- Premium is paid weekly (aligns with gig worker payout cycles)
- Coverage limit resets every 7 days
- No daily, monthly, or annual options in Phase 1

---

## 1. Core Variables

| Variable | Type | Range / Default | Source |
|----------|------|-----------------|--------|
| `daily_income` | float | ₹200–₹2000 | User input on onboarding |
| `working_hours` | int | Default = 8 | User input (min 4, max 12) |
| `coverage_pct` | float | 0.50–0.90 | User selects tier |
| `risk_score` | float | 0.10–0.90 | AI Risk Engine output |
| `base_rate` | float | 0.025 | System constant |
| `weekly_income` | float | daily_income × 7 | Calculated |
| `coverage_limit` | float | weekly_income × coverage_pct | Calculated |
| `weekly_premium` | float | See formula below | Calculated |

---

## 2. Coverage Tiers

| Tier | coverage_pct | Description |
|------|-------------|-------------|
| Basic | 0.50 | Covers 50% of weekly income loss |
| Standard | 0.70 | Covers 70% of weekly income loss |
| Premium | 0.90 | Covers 90% of weekly income loss |

---

## 3. Base Rate Justification

`base_rate = 0.025` (2.5%)

**Why 2.5%:** Historical disruption data for urban Indian delivery workers shows approximately 15–20% of weekly working hours are lost to external events in high-risk periods. With a conservative loss probability of 15%, average 3 hours lost per event, and a loading factor of 1.35:

```
Actuarial base rate = Loss_Probability × Avg_Loss_Ratio × Loading
                    = 0.15 × 0.12 × 1.35
                    ≈ 0.024 ≈ 0.025 (rounded up for safety margin)
```

For every ₹100 of coverage, the worker pays ₹2.50/week in premium.

---

## 4. Premium Formula

```
weekly_premium = (daily_income × 7 × coverage_pct) × risk_score × base_rate
```

Expanded:
```
weekly_income   = daily_income × 7
coverage_limit  = weekly_income × coverage_pct
weekly_premium  = coverage_limit × risk_score × base_rate
```

### Worked Example

```
daily_income    = ₹700
weekly_income   = ₹700 × 7 = ₹4,900
coverage_pct    = 0.70 (Standard tier)
coverage_limit  = ₹4,900 × 0.70 = ₹3,430

risk_score      = 0.52  (AI calculated — Hyderabad, monsoon season)
base_rate       = 0.025

weekly_premium  = ₹3,430 × 0.52 × 0.025
                = ₹44.59 ≈ ₹45/week
```

The worker pays **₹45/week** for **₹3,430** of income protection. That's about 6.4% of daily earnings — less than a meal.

---

## 5. Premium Bounds (enforced in code)

```
min_premium = ₹20/week   (floor — makes the product viable)
max_premium = ₹500/week  (ceiling — protects high-income workers from over-pricing)

weekly_premium = max(20, min(500, calculated_premium))
```

---

## 6. Coverage Limit Rule

The `coverage_limit` is the **maximum total payout for the entire week**, not per event.

```
If sum(all_payouts_this_week) >= coverage_limit:
    → No further payouts this week
    → Policy resets next Monday 00:00 IST
```
