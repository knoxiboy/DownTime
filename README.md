# DownTime: AI-Powered Income Protection for Delivery Partners
### 🛡️ Guidewire DEVTrails 2026 Hackathon Submission (Phase 2)

---

## 🚀 Phase 2: Automation & Protection (Current)
**Theme**: "Protect Your Worker"
This phase is focused on the core automation of parametric insurance, from dynamic premium calculation to zero-touch claim processing for India's gig economy.

### 📍 The Problem We're Solving
India’s platform-based delivery partners (Zomato, Swiggy, Zepto, Amazon, Dunzo etc.) are the backbone of our fast-paced digital economy. However, external disruptions such as extreme weather, pollution, and natural disasters can cause them to lose **20–30% of their monthly earnings**. 

When these disruptions occur, gig workers bear the full financial loss. **DownTime provides a safety net.**

### 🎯 The Challenge
Build an AI-enabled **parametric insurance platform** that safeguards gig workers against income loss caused by environmental and social disruptions. 
*   **Target Persona**: Food & Q-Commerce Delivery Partners (e.g., Zepto/Blinkit/Zomato).
*   **Core Logic**: 100% automated coverage and payouts based on real-time triggers.
*   **Business Model**: Simple **Weekly Pricing** model aligned with the worker's earnings cycle.

### 5. SDLC, Security & Protection (Newly Integrated)
* **Input Parsing:** Native NestJS `ValidationPipe` enabled globally with strict whitelist checking to sanitize all payloads.
* **Basic Rate Limiting:** Integrated an in-memory IP tracker directly into the NestJS `main.ts` pipeline protecting against rapid-fire DDOS/brute-force attacks across all APIs.
* **Architecture Integrity:** Environment separation enforced through `.env` configurations across all monorepo scopes.

---

## 🏆 The Golden Rules
1.  **Persona Focus**: Specifically catering to Delivery Partners in the Food, E-commerce, or Grocery segments.
2.  **Coverage Scope**: **LOSS OF INCOME ONLY**. We strictly exclude vehicle repairs, health insurance, or accident medical bills.
3.  **Weekly Pricing**: All premiums and financial models are structured on a **Weekly basis** to match the gig economy cycle.

---

## 🛠 Project Architecture & Automation

### 1. AI-Powered Risk Assessment
*   **Dynamic Premium Calculation**: Our Python AI Service calculates the weekly premium based on hyper-local risk factors (Zone data, Seasonal adjustments).
*   **Predictive Risk Modeling**: Uses historical weather and pollution data to adjust pricing (e.g., ₹2 less per week in historically safe zones).

### 2. Parametric Automation (Phase 2 Implemented)
*   **Real-time Sensor Monitoring**: Every 5 minutes, our system polls mock/real weather sensors for:
    *   `HEAVY_RAIN` / `FLOOD_WARNING` (Waterlogging risk)
    *   `EXTREME_HEAT` (Heatstroke/safety shutdowns)
    *   `SEVERE_POLLUTION` (Air quality health hazards)
*   **Auto-Claim Process**: When a threshold is met in a worker's active zone, a claim is **automatically initiated**. No forms, no evidence required from the worker.

### 3. Intelligent Fraud Detection (Phase 3 Prep)
*   Anomaly detection in claims.
*   Location and activity validation (GPS spoofing checks).
*   Duplicate claim prevention.

---

## 💻 Tech Stack
*   **Frontend**: Next.js 14, React, Tailwind CSS (Modern Glassmorphic UI).
*   **Backend**: NestJS, TypeScript, Prisma ORM.
*   **Database**: PostgreSQL via **Neon Cloud** (WebSocket Adapter for network resilience).
*   **AI Service**: Python FastAPI, GradientBoostingRegressor for risk modeling.
*   **Deployment**: Vercel (Frontend/Backend) & Cloud-hosted AI Engine.

---

## 📂 Project Structure (Improved)
```text
DownTime/
├── ai-service/        # Python FastAPI AI Engine (Risk & Fraud)
├── backend/           # NestJS Backend API & Prisma Schema
├── frontend/          # Next.js 14 Responsive Web App
├── docs/              # Detailed Documentation & Strategy
│   ├── db/            # Database Schema & init.sql
│   ├── triggers.md    # Parametric Sensor Thresholds
│   └── persona.md     # Targeted Worker Scenarios (Phase 1)
└── README.md          # Current Project Status (Phase 2)
```

---

## 🚦 Phase 2 Deliverables Achievement
- [x] **Registration Process**: Optimized onboarding for delivery partners.
- [x] **Insurance Policy Management**: Weekly lifecycle management.
- [x] **Dynamic Premium Calculation**: AI-driven weekly pricing logic implemented.
- [x] **Claims Management**: Fully automated parametric triggers (Loss of Income).

---
*Created for the Guidewire DEVTrails 2026 Hackathon.*