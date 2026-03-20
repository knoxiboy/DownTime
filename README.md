# DownTime — AI-Powered Parametric Income Protection

## The Problem
Urban delivery gig workers lose roughly 20–25% of their monthly income to unpredictable external disruptions like torrential monsoon rains, extreme heat waves, or unannounced area curfews. Traditional insurance completely fails them, offering zero protection for lost working hours and requiring complex, manual claims processes they don't have time for.

## Our Persona
**Ravi Kumar**
26 years old | Zepto Delivery Partner | Hyderabad (Kondapur zone)
* Average daily income: ₹700 (9 AM – 7 PM)
* Problem: Loses 3–5 active hours per day during the monsoon (June–September) due to waterlogging and safety hazards.
* Financial Impact: A single bad week with 3 rainy days drops his earnings by 30%, making him miss rent.

## Our Solution
DownTime is an AI-powered parametric income protection engine that detects disruptions automatically and pays out instantly. No claims adjusters, no paperwork, no waiting. If a verified event happens in Ravi's zone and halts his work, the engine calculates his lost hours and triggers a direct UPI payout the same day.

## How Weekly Premium Works
The weekly premium is dynamically calculated using this formula:
`weekly_premium = (daily_income × 7 × coverage_pct) × risk_score × base_rate`

**Worked Example (Standard Tier):**
* `daily_income` = ₹700 (Weekly = ₹4,900)
* `coverage_pct` = 0.70 (Standard tier) → `coverage_limit` = ₹3,430
* `risk_score` = 0.52 (AI evaluated for Hyderabad/Monsoon)
* `base_rate` = 0.025 (2.5%)
* `weekly_premium` = ₹3,430 × 0.52 × 0.025 = **₹44.59 ≈ ₹45/week**

For just ₹45 a week (less than a meal), Ravi protects ₹3,430 of his income.

## How Payouts Are Triggered
We continuously poll data sources against hard thresholds. If met, the trigger fires automatically.
* **Heavy Rain:** rainfall ≥ 20 mm/hr
* **Extreme AQI:** AQI ≥ 300
* **Extreme Heat:** temperature ≥ 42°C
* **Zone Closure:** status == "closed"

## How Payout Is Calculated
`hourly_income = daily_income / working_hours`
`payout = hourly_income × hours_lost`

**Worked Example:**
* `hourly_income` = ₹700 / 8 = ₹87.50
* Rain starts 2:00 PM, clears 5:30 PM → `hours_lost` = 3.5 hours
* `payout` = ₹87.50 × 3.5 = **₹306.25** (Instantly credited, deducted from weekly `coverage_limit`)

## AI / ML Integration
The Risk Score (0.10 to 0.90) is computed via our Python FastAPI MS using 4 weighted components:
1. **Weather Risk (40%)**: Real-time rainfall, heat, and AQI metrics via OpenWeatherMap/WAQI.
2. **Location Risk (30%)**: Zone-specific vulnerability (e.g., Kondapur is highly flood-prone).
3. **Seasonal Risk (20%)**: Historical monsoon timelines or summer heatwaves.
4. **Historical Risk (10%)**: Frequency of disruptions in the past 30 days.

## Fraud Detection
To ensure sustainability, the system runs 3 automated fraud checks before any payout:
1. **GPS Validation**: Worker's active location must be within 15km of the declared operating zone.
2. **Duplicate Prevention**: A worker cannot receive two payouts for the same trigger event on the exact same day.
3. **Anomaly Detection**: Claims are flagged for manual review if they exceed 6 hours lost, trigger >4 days a week, or exhaust >80% of the limit in a single event.

## Project Structure
* **`root/`**: Global `.env` and `.gitignore`.
* **`backend/`**: NestJS Core (Port 3001).
* **`frontend/`**: Next.js Dashboard (Port 3000).
* **`ai-service/`**: Python Risk Engine (Port 8000).
* **`docs/`**: Detailed design docs (persona, triggers, risk model, fraud rules).

## Architecture
```
┌─────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   Next.js   │ ───► │   NestJS API     │ ───► │  FastAPI AI      │
│  Dashboard  │      │   (Port 3001)    │      │  Risk Engine     │
│ (Port 3000) │      │                  │      │  (Port 8000)     │
└─────────────┘      │  ┌────────────┐  │      │                  │
                     │  │  Prisma    │  │      │  4-Factor Score  │
                     │  │  + Postgres│  │      │  Weather  (40%)  │
                     │  └────────────┘  │      │  Location (30%)  │
                     │                  │      │  Seasonal (20%)  │
                     │  Modules:        │      │  History  (10%)  │
                     │  Worker │ Policy │      └──────────────────┘
                     │  Claims │ Fraud  │              │
                     │  Trigger│ Premium│      ┌───────┴────────┐
                     │  Dashboard       │      │ OpenWeatherMap │
                     └──────────────────┘      │ WAQI API       │
                             │                 └────────────────┘
                     ┌───────┴────────┐
                     │   Cron Jobs    │
                     │ (Every 15 min) │
                     │ Poll weather → │
                     │ Check triggers │
                     │ Auto-payout    │
                     └────────────────┘
```

## Local Setup
1. **Root**: Copy `.env.example` to `.env` and fill in your API keys.
2. **Backend**: `cd backend && npm install && npx prisma generate && npm run dev`.
3. **Frontend**: `cd frontend && npm install && npm run dev`.
4. **AI Service**: `cd ai-service && pip install -r requirements.txt && python main.py`.

## Why Web Platform
Delivery workers already have multiple required apps (e.g., Zepto app, navigation). A responsive web application ensures zero friction for onboarding, bypasses Play Store approval delays for continuous deployment, and works seamlessly on low-end Android devices without taking up storage space.

## Phase 2 Plan
* Dynamic ML pricing adjusting `base_rate` based on real-time fleet density.
* Real GPS SDK integration for precise worker validation during a trigger.
* Production payment gateway integration for automated daily settlements.

## Phase 3 Plan
* Advanced fraud detection using behavioral anomaly models.
* Comprehensive Insurer Admin Portal with live loss-ratio charts and heatmaps.
* Multi-city, multi-platform rollout across all major Indian metros.