# Parametric Triggers — DownTime

## 1. Trigger Rules (exact thresholds)

| Trigger | Condition | Data Source | Check Interval |
|---------|-----------|-------------|----------------|
| Heavy Rain | rainfall ≥ 20 mm/hr | OpenWeatherMap | Every 15 min |
| Extreme AQI | AQI ≥ 300 | WAQI API | Every 30 min |
| Extreme Heat | temperature ≥ 42°C | OpenWeatherMap | Every 30 min |
| Zone Closure | zone_status == "closed" | Internal mock API | Every 5 min |

**A trigger is TRUE if and only if its threshold is met or exceeded.**

---

## 2. Hours Lost Calculation

When a trigger fires:
1. Record `trigger_start_time`
2. Keep polling the API every 15 minutes
3. When condition returns to safe level: record `trigger_end_time`
4. `hours_lost = (trigger_end_time - trigger_start_time).total_hours()`
5. Cap hours_lost at the remaining working hours in the day

```python
WORKING_HOURS_START = 9   # 9 AM default (configurable per worker)
WORKING_HOURS_END   = 19  # 7 PM default

def calculate_hours_lost(trigger_start, trigger_end, daily_work_hours=8):
    day_start = trigger_start.replace(hour=WORKING_HOURS_START, minute=0)
    day_end   = trigger_start.replace(hour=WORKING_HOURS_END, minute=0)

    effective_start = max(trigger_start, day_start)
    effective_end   = min(trigger_end,   day_end)

    if effective_end <= effective_start:
        return 0.0  # Trigger outside working hours — no payout

    hours_lost = (effective_end - effective_start).total_seconds() / 3600
    return round(min(hours_lost, daily_work_hours), 2)
```

---

## 3. Payout Formula

```
hourly_income = daily_income / working_hours
payout        = hourly_income × hours_lost
```

### Hard cap rules (apply in this order):
1. `payout = min(payout, coverage_limit)` — single event cap
2. `payout = min(payout, remaining_weekly_limit)` — weekly aggregate cap
3. `remaining_weekly_limit -= payout` — deduct from weekly balance

### Worked Example

```
daily_income     = ₹700
working_hours    = 8
hourly_income    = ₹700 / 8 = ₹87.50

Trigger: Rain starts 2:00 PM, clears 5:30 PM
hours_lost       = 3.5 hours
payout           = ₹87.50 × 3.5 = ₹306.25

coverage_limit   = ₹3,430 (from policy)
remaining_limit  = ₹3,430 (fresh week, first event)

final_payout     = ₹306.25  ← within limits
remaining_limit  = ₹3,430 - ₹306.25 = ₹3,123.75
```

---

## 4. Multiple Simultaneous Triggers Rule

If more than one trigger fires at the same time:
- Use only the **single most severe trigger** for the payout calculation
- Do NOT stack payouts from multiple simultaneous triggers
- **Severity order:** Zone Closure > Heavy Rain > Extreme AQI > Extreme Heat
- Log all triggers but process payout for the highest-severity one only

---

## 5. Trigger Cooldown Rule

After a trigger resolves and a payout is issued:
- **Minimum 2-hour cooldown** before the same trigger type can fire again for the same worker on the same day
- Prevents micro-trigger spam and is a first layer of fraud defense
