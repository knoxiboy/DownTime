# Fraud Detection Rules — DownTime

## Rule 1: GPS / Location Validation

At onboarding, the worker declares their operating zone (e.g., "Kondapur, Hyderabad").

When a trigger fires, validate that the worker's last known location is within **15 km** of their declared zone.

```python
def validate_location(worker_lat, worker_lng, zone_center_lat, zone_center_lng):
    distance_km = haversine(worker_lat, worker_lng, zone_center_lat, zone_center_lng)
    if distance_km > 15:
        flag_claim(reason="LOCATION_MISMATCH", distance_km=distance_km)
        return False
    return True
```

> **Phase 1:** Mock the worker GPS with their declared city coordinates. The validation logic must still exist in code.

---

## Rule 2: Duplicate Claim Prevention

A worker cannot receive two payouts for the same trigger event on the same day.

```python
def check_duplicate_claim(worker_id, trigger_type, event_date):
    existing = db.claims.find_one({
        worker_id:    worker_id,
        trigger_type: trigger_type,
        event_date:   event_date,
        status:       "APPROVED"
    })
    if existing:
        flag_claim(reason="DUPLICATE_CLAIM")
        return False
    return True
```

---

## Rule 3: Anomaly Detection

Flag for manual review if any of the following conditions are met:

| Condition | Flag Reason |
|-----------|-------------|
| Claimed hours_lost > 6 hours in a single event | `EXCESSIVE_HOURS` |
| Worker claims payout on more than 4 days in a single week | `HIGH_FREQUENCY` |
| Payout amount exceeds 80% of coverage_limit in a single event | `LARGE_SINGLE_PAYOUT` |

```python
ANOMALY_RULES = [
    {"condition": "hours_lost > 6",                "reason": "EXCESSIVE_HOURS"},
    {"condition": "weekly_claim_days > 4",         "reason": "HIGH_FREQUENCY"},
    {"condition": "payout > coverage_limit * 0.8", "reason": "LARGE_SINGLE_PAYOUT"},
]
```

> **Phase 1:** Flag anomalies and log them, but do not block claim processing automatically. Claims are logged with fraud flags for review.
