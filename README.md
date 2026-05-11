<div align="center">
  <img src="https://via.placeholder.com/1200x300/18181b/ffffff?text=DownTime+Platform" alt="DownTime Banner">
</div>

# DownTime

> **AI-Powered Parametric Income Protection for Delivery Partners in the Gig Economy.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Online-00C7B7?style=for-the-badge&logo=vercel)](https://downtime.demo.com)
[![Documentation](https://img.shields.io/badge/Docs-Read-blue?style=for-the-badge&logo=read-the-docs)](https://docs.downtime.com)
[![License](https://img.shields.io/badge/license-MIT-purple.svg?style=for-the-badge)](LICENSE)
[![Hackathon](https://img.shields.io/badge/Guidewire-DEVTrails_2026-ff69b4?style=for-the-badge)](#)

---

## Preview

<div align="center">
  <img src="https://via.placeholder.com/800x400/27272a/ffffff?text=Parametric+Insurance+Dashboard" alt="DownTime Dashboard Preview">
  <p><i>Zero-touch claim processing and instant payouts for gig workers.</i></p>
</div>

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Solution Overview](#solution-overview)
- [Core Features](#core-features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation Guide](#installation-guide)
- [Environment Variables](#environment-variables)
- [AI/ML Pipeline](#aiml-pipeline)
- [Security Measures](#security-measures)
- [Roadmap](#roadmap)

---

## Problem Statement

India’s platform-based delivery partners (Zomato, Swiggy, Zepto, Amazon) are the backbone of the digital economy. However, external disruptions—such as extreme weather, severe pollution, or natural disasters—cause them to lose **20–30% of their monthly earnings**. 

When the city floods or heatwaves hit, platforms pause operations, and workers bear 100% of the financial loss. Traditional insurance is too slow, too rigid, and ill-equipped to handle high-frequency, micro-disruptions.

---

## Solution Overview

**DownTime** is an AI-enabled **parametric insurance platform** that safeguards gig workers against instantaneous income loss. It replaces manual claims with 100% automated coverage triggered by real-time environmental data APIs.

- **Zero-Touch Claims**: If it rains heavily, payouts are triggered instantly.
- **Weekly Micro-Premiums**: Priced dynamically based on hyper-local ML risk models.
- **Instant Payouts**: Direct to UPI via Razorpay integrations.

---

## Core Features

### ⛈️ Parametric Triggers
- **What it does**: Links external data (weather APIs, AQI monitors) directly to smart contracts.
- **Why it matters**: Eliminates the claims investigation process.
- **Implementation**: Webhooks ingest environmental data; rule engines execute state changes autonomously.

### 🛡️ Fraud Detection Engine
- **What it does**: Cross-references payout eligibility with geospatial verification.
- **Why it matters**: Prevents systemic abuse of the parametric system.
- **Implementation**: ML models scoring geolocation consistency and API tampering.

### 💸 Instant UPI Payouts
- **What it does**: Settles claims within seconds.
- **Why it matters**: Gig workers live paycheck to paycheck; instant liquidity is essential.
- **Implementation**: Razorpay Route and Webhook automation.

---

## System Architecture

<div align="center">
  <img src="https://via.placeholder.com/800x400/18181b/ffffff?text=Event-Driven+Architecture" alt="Architecture Diagram">
</div>

### Data Flow
1. **IoT / API Ingestion**: Weather/AQI services push real-time telemetry.
2. **Rules Engine**: Telemetry is evaluated against policy thresholds.
3. **Smart Execution**: If threshold breached, a payout event is generated.
4. **Fintech API**: Payout event hits Razorpay endpoint.
5. **Notification**: Worker receives SMS/WhatsApp confirmation.

---

## Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Frontend** | React, TailwindCSS | Worker Mobile Web App & Admin Dashboard |
| **Backend** | Python, FastAPI | High-concurrency event processing |
| **Database** | PostgreSQL, Redis | Transactional ledgers & pub/sub caching |
| **AI/ML** | Scikit-Learn, Pandas | Dynamic pricing & fraud detection |
| **Payments** | Razorpay API | Instant UPI settlements |
| **Infra** | AWS Lambda, Docker | Serverless scale for weather spikes |

---

## Project Structure

```bash
src/
 ┣ app/            # Frontend Web Client
 ┣ core/           # Pricing Engine & ML Models
 ┣ ingest/         # Weather & API data pipelines
 ┣ api/            # FastAPI Endpoints
 ┣ workers/        # Celery Background Tasks (Payouts)
 ┣ db/             # SQLAlchemy Models
 ┗ types/          # Shared schemas
```

---

## Installation Guide

### 1. Prerequisites
- Python 3.10+
- Node.js (v18+)
- Redis & PostgreSQL

### 2. Clone & Install
```bash
git clone https://github.com/your-org/DownTime.git
cd DownTime/backend
pip install -r requirements.txt
```

### 3. Setup Database
```bash
alembic upgrade head
```

### 4. Run Services
```bash
# Terminal 1: Backend
uvicorn main:app --reload

# Terminal 2: Frontend
cd ../frontend && npm install && npm run dev
```

---

## Environment Variables

Create `.env` files in respective directories:

| Variable | Description | Required |
| -------- | ----------- | -------- |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis broker URI | Yes |
| `RAZORPAY_KEY` | Payment gateway key | Yes |
| `WEATHER_API_KEY` | Real-time weather data access | Yes |

---

## AI/ML Pipeline

DownTime utilizes a dual-model ML pipeline:
1. **Dynamic Pricing Model**: Predicts the likelihood of disruptions based on historical meteorological data, adjusting weekly micro-premiums automatically.
2. **Fraud Detection**: Uses isolation forests to detect anomalies in payout clusters, preventing sybil attacks or location spoofing.

---

## Security Measures

- **Webhook Signatures**: Strict HMAC verification for all incoming environmental and payment data.
- **Idempotency**: All payout endpoints implement strict idempotency keys to prevent double-spending.
- **Geospatial Spoof Prevention**: App-level telemetry to verify actual GPS coordinates against IP data.

---

## Roadmap

- [x] Weather API Integration
- [x] Basic Parametric Payouts
- [x] Fraud Detection Engine MVP
- [ ] Blockchain Smart Contract Migration
- [ ] Integration directly into Swiggy/Zomato Partner Apps

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
<div align="center">
<i>Protecting the workers who deliver our modern convenience.</i>
</div>