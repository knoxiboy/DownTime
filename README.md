# DownTime: AI-Powered Income Protection for Delivery Partners
### Guidewire DEVTrails 2026 Hackathon Submission

---

## 🚀 The Idea Document (Phase 1 Deliverable)

### 1. The Requirement & Persona Scenarios
India’s food and grocery (Q-Commerce) delivery partners are highly vulnerable to localized, uncontrollable environmental disruptions. Zomato, Swiggy, and Zepto delivery partners often lose 30-40% of their daily earnings when forced to stop work due to extreme weather, severe pollution, or natural disasters. 

**Our Persona focus:** **Food & Q-Commerce Delivery Partners**.
*   **The Persona**: **Ravi Kumar**, 26 yrs, Zepto Delivery Partner in Kondapur (Hyderabad).
*   **The Scenario**: Ravi aims to work 10 hours daily to earn ₹700. Suddenly, a severe localized rainstorm combined with unexpected waterlogging floods the Kondapur delivery zone. The delivery platform suspends operations for his safety, preventing him from completing orders for 4 hours.
*   **The Impact**: Ravi loses ~₹300 of his daily target, making it hard to pay for fuel and daily expenses. He has zero income safety net.
*   **The DownTime Workflow**: Ravi subscribes to a DownTime Weekly Policy. When the rainstorm hits, DownTime's AI parametric sensors automatically detect the heavy rain and flood warnings in Kondapur. It calculates Ravi's lost hours and instantly triggers a Razorpay (UPI) payout directly to his bank account to cover the ₹300 loss. Total zero-touch claims processing. No forms, no wait times.

### 2. Weekly Premium Model & Parametric Triggers
**The Weekly Premium Model:**
Gig workers operate on a weekly payout cycle. Their cash flow doesn't permit hefty annual or monthly premiums. 
*   Our pricing model strictly utilizes a **Weekly Basis** (`weeklyPremium`). 
*   **Formula Calculation:** `Weekly Base Premium = (Daily Income × 7 × Coverage Choice) × AI_Risk_Multiplier × Seasonal_Adjustment`.
*   A typical premium is highly affordable—roughly ₹40-₹60 per week to secure up to ₹3500+ of income. 
*   If no claims are made this week, the AI predicts lower risk and offers a **No-Claim Discount** on the following week's premium.

**Our Parametric Triggers (10+ Environmental Sensors):**
Instead of just "rain", our platform monitors advanced factors using OpenWeatherMap/WAQI mock data:
1.  **WIND_ADVISORY & HIGH_WIND** (Risk of accidents, flying debris)
2.  **HEAVY_RAIN & TORRENTIAL_RAIN** (Waterlogging, impaired visibility)
3.  **POOR_AIR_QUALITY & SEVERE_POLLUTION** (Health hazard, prevents outdoor work)
4.  **EXTREME_HEAT & HEAT_INDEX_DANGER** (Heatstroke risk)
5.  **LOW_VISIBILITY** (Fog, Smog)
6.  **FLOOD_WARNING** (Impassable roads out of worker's control)
7.  **CYCLONE_ALERT** (Complete platform shutdowns)

**Platform Choice:** **Web Application (Responsive)**
We chose a highly responsive Web App (PWA capabilities) instead of a Native Mobile App. 
*   **Justification:** Delivery partners already have limited phone storage (running heavy delivery apps, WhatsApp, maps). A web platform ensures zero-friction onboarding, instant access via a browser link, no app updates required, and completely sidesteps the App Store/Play Store approval process—reducing our time-to-market.

### 3. AI & ML Integration Plans (Premium & Fraud)
**Dynamic AI Premium Calculation:**
We built a robust Python FastAPI microservice that models 10 specific risk factors. Premium isn't static; it adapts to:
*   **Weather Risk:** Hyper-local forecast data (Rain, Wind, AQI, Heat).
*   **Location Risk:** The historical risk profile of the specific zone (e.g., Dharavi vs. Kondapur).
*   **Seasonal Risk:** AI applies seasonal multipliers (monsoon vs. winter).
*   **Time-of-Day Risk:** Higher premiums if the worker primarily operates during late-night hours.

**Intelligent Fraud Detection (Phase 3 Implemented):**
We've integrated a sophisticated multi-rule fraud pipeline out-of-the-box:
*   *GPS Spoofing Check:* Detects impossible travel speeds between zones (Velocity validation).
*   *External Ground Truth:* Compares the user-reported location against the actual API weather event bounds.
*   *Temporal Rule Checks:* Prevents duplicate claims filed for the exact same disruption in a 24-hour window.

### 4. Tech Stack & Development Plan

**The Stack:**
*   **Frontend**: Next.js 14, React, Tailwind CSS, Lucide Icons (Premium UI Focus).
*   **Backend Core**: NestJS, TypeScript, Prisma ORM.
*   **Database**: PostgreSQL.
*   **AI Engine**: Python, FastAPI, Pydantic, advanced heuristic ML models.
*   **Integrations**: OpenWeatherMap (Mocked data streams), Razorpay UPI (Simulated callbacks).

**Development Plan Overview (Phase 1-3 Achieved):**
*   [x] **Phase 1**: Conceptualization, architecture mapping, robust AI engine (V2) deployment, Web App UI.
*   [x] **Phase 2**: Full backend workflow integration, automated Cron triggers polling weather every 5 mins, zero-touch dynamic premium quotation system.
*   [x] **Phase 3**: Integration of Razorpay Sandbox UPI payout simulation, advanced Insurer/Admin Dashboard (Loss Ratios, Predictive Claims next week), and cross-verification fraud flagging.

---

## 🛠 Project Architecture

```text
┌─────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   Next.js   │ ───► │   NestJS API     │ ───► │  FastAPI AI      │
│  Dashboard  │      │   (Port 3001)    │      │  Risk Engine     │
│ (Port 3000) │      │                  │      │  (Port 8000)     │
└─────────────┘      │  ┌────────────┐  │      │                  │
                     │  │  Prisma    │  │      │  10-Factor AI    │
                     │  │  + Postgres│  │      │  Risk Evaluation │
                     │  └────────────┘  │      └──────────────────┘
                     │                  │              │
                     │  Worker Mgmt     │      ┌───────┴────────┐
                     │  Fraud Check     │      │ Public Weather/│
                     │  Dashboard Stats │      │ Pollution APIs │
                     └──────────────────┘      └────────────────┘
                             │
                     ┌───────┴────────┐
                     │   Cron Jobs    │
                     │  Poll Sensors  │
                     │ Trigger Claims │
                     │  UPI Payouts   │
                     └────────────────┘
```

---

## 🌐 Live Deployment & Vercel Setup

Because DownTime uses a modern monorepo structure (Next.js frontend + NestJS/Prisma API + FastAPI), proper deployment to Vercel requires two separate projects to ensure independent scaling and proper API routing.

### 1. Backend API Deployment
1. Go to Vercel Dashboard -> Add New Project -> Import the DownTime GitHub repo.
2. Name it `down-time-backend`.
3. Set the **Root Directory** to `backend`.
4. In Environment Variables, strictly add your Neon Postgres connection string:
   - `DATABASE_URL`: `postgresql://[user]:[pass]@ep-...neon.tech/neondb?sslmode=require`
5. Click **Deploy**. Copy the resulting Vercel URL (e.g., `https://down-time-backend.vercel.app`).

### 2. Frontend App Deployment
1. Go to Vercel Dashboard -> Add New Project -> Import the DownTime GitHub repo again.
2. Name it `down-time-app`.
3. Set the **Root Directory** to `frontend`.
4. In Environment Variables, tell the frontend where to find the API:
   - `NEXT_PUBLIC_API_URL`: Paste the backend URL from step 1 (e.g., `https://down-time-backend.vercel.app`).
5. Click **Deploy**.

> **Note**: Setting the Root Directory explicitly for each project forces Vercel to optimize the build process specifically for Next.js or NestJS without colliding configs. Defaulting `axios` configurations safely resolves proxy issues when pointing directly to your live backend domain.