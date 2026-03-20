# Workflow — DownTime

## 1. Registration Flow

1. Worker opens app → enters name, phone, city, zone, platform
2. Backend calls AI service: `POST /risk/calculate` → gets `risk_score`
3. Backend calculates `weekly_premium` for all 3 tiers (Basic / Standard / Premium)
4. Frontend shows premium options to worker
5. Worker selects tier → `POST /api/policies` → policy created, payment mock processed
6. Worker sees active policy dashboard

---

## 2. Trigger → Payout Flow

```
Every 15 minutes (cron job in NestJS):
  For each city with active policies:
    → Fetch weather from OpenWeatherMap
    → Fetch AQI from WAQI
    → Fetch zone status from mock API
    → For each trigger threshold:
        IF threshold met:
          → Find all active policies in affected city/zone
          → For each worker:
              → Run fraud checks (location, duplicate, anomaly)
              → If all pass: calculate payout, create Claim record, process Payment
              → If any fail: flag claim, do NOT process payout
```

---

## 3. Policy Reset

- Every Monday at 00:00 IST: `remaining_limit` resets to `coverage_limit` for all active policies
- Active policy status continues for 7 days from purchase date

---

## 4. Claim Lifecycle

```
PROCESSING → APPROVED → PAID
                ↓
             FLAGGED → REJECTED (manual review)
```

1. **PROCESSING**: Claim created, fraud checks running
2. **APPROVED**: All fraud checks passed, payout calculated
3. **PAID**: Payment processed (mock UPI or Razorpay test)
4. **FLAGGED**: One or more fraud rules triggered, held for review
5. **REJECTED**: Manual review determined claim is fraudulent
