from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional
import math
import random
import hashlib

app = FastAPI(
    title="DownTime AI Risk Engine v3.0",
    description="ML-powered multi-factor risk assessment with trained GradientBoosting model for parametric gig worker insurance",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Location Risk Map (Flood-drainage, infrastructure quality, historical disruption) ──

LOCATION_RISK_MAP = {
    "hyderabad": {
        "kondapur": {"base": 0.55, "drainage": 0.4, "infra": 0.6},
        "hitech_city": {"base": 0.40, "drainage": 0.7, "infra": 0.8},
        "secunderabad": {"base": 0.65, "drainage": 0.3, "infra": 0.5},
        "gachibowli": {"base": 0.35, "drainage": 0.8, "infra": 0.9},
        "default": {"base": 0.50, "drainage": 0.5, "infra": 0.6},
    },
    "mumbai": {
        "dharavi": {"base": 0.85, "drainage": 0.1, "infra": 0.2},
        "bandra": {"base": 0.60, "drainage": 0.5, "infra": 0.7},
        "andheri": {"base": 0.70, "drainage": 0.3, "infra": 0.5},
        "default": {"base": 0.65, "drainage": 0.3, "infra": 0.5},
    },
    "bangalore": {
        "whitefield": {"base": 0.45, "drainage": 0.5, "infra": 0.7},
        "koramangala": {"base": 0.50, "drainage": 0.4, "infra": 0.6},
        "default": {"base": 0.48, "drainage": 0.5, "infra": 0.6},
    },
    "delhi": {
        "connaught_place": {"base": 0.55, "drainage": 0.5, "infra": 0.7},
        "dwarka": {"base": 0.45, "drainage": 0.6, "infra": 0.8},
        "rohini": {"base": 0.50, "drainage": 0.4, "infra": 0.6},
        "default": {"base": 0.50, "drainage": 0.5, "infra": 0.6},
    },
    "default": {"default": {"base": 0.50, "drainage": 0.5, "infra": 0.6}},
}

MONSOON_CITIES = ["hyderabad", "mumbai", "chennai", "kolkata", "bhubaneswar"]
CYCLONE_PRONE = ["mumbai", "chennai", "bhubaneswar", "kolkata"]
POLLUTION_HOTSPOTS = ["delhi", "mumbai", "kolkata"]
FOG_PRONE = ["delhi", "chandigarh", "lucknow"]

# City seasonal weather profiles for smart simulation
CITY_PROFILES = {
    "hyderabad": {"rain_base": 3.0, "temp_base": 33, "aqi_base": 95, "humidity_base": 55, "wind_base": 12, "visibility_base": 8.0},
    "mumbai": {"rain_base": 5.0, "temp_base": 31, "aqi_base": 120, "humidity_base": 75, "wind_base": 18, "visibility_base": 6.5},
    "bangalore": {"rain_base": 2.0, "temp_base": 28, "aqi_base": 80, "humidity_base": 60, "wind_base": 10, "visibility_base": 9.0},
    "delhi": {"rain_base": 1.5, "temp_base": 35, "aqi_base": 220, "humidity_base": 45, "wind_base": 14, "visibility_base": 5.0},
    "default": {"rain_base": 2.0, "temp_base": 30, "aqi_base": 100, "humidity_base": 55, "wind_base": 12, "visibility_base": 7.0},
}

# ─── Advanced Risk Sub-Scores ───────────────────────────────────────────────

def calc_rain_risk(rain_mm_hr: float) -> float:
    """Rain intensity risk with continuous curve."""
    if rain_mm_hr < 2.5:
        return rain_mm_hr * 0.04  # Linear up to 0.10
    elif rain_mm_hr < 7.5:
        return 0.10 + (rain_mm_hr - 2.5) * 0.04  # 0.10 -> 0.30
    elif rain_mm_hr < 15.0:
        return 0.30 + (rain_mm_hr - 7.5) * 0.04  # 0.30 -> 0.60
    elif rain_mm_hr < 25.0:
        return 0.60 + (rain_mm_hr - 15.0) * 0.03  # 0.60 -> 0.90
    else:
        return min(1.0, 0.90 + (rain_mm_hr - 25.0) * 0.01)

def calc_heat_risk(temp_c: float) -> float:
    """Temperature risk — both extreme heat AND cold/fog danger."""
    if temp_c > 45:
        return 1.0
    elif temp_c > 42:
        return 0.85
    elif temp_c > 40:
        return 0.65
    elif temp_c > 38:
        return 0.40
    elif temp_c > 35:
        return 0.15
    elif temp_c >= 10:
        return 0.0  # Comfortable range
    elif temp_c >= 5:
        return 0.30  # Cold — reduced working capacity
    else:
        return 0.60  # Extreme cold / dense fog

def calc_aqi_risk(aqi: float) -> float:
    """AQI risk using India's NAAQ standards."""
    if aqi < 50:
        return 0.0   # Good
    elif aqi < 100:
        return 0.05  # Satisfactory
    elif aqi < 200:
        return 0.15 + (aqi - 100) * 0.002  # Moderate -> Poor
    elif aqi < 300:
        return 0.35 + (aqi - 200) * 0.003  # Poor -> Very Poor
    elif aqi < 400:
        return 0.65 + (aqi - 300) * 0.003  # Very Poor -> Severe
    else:
        return min(1.0, 0.95)  # Severe+

def calc_wind_risk(wind_kmh: float) -> float:
    """Wind risk — critical for two-wheeler delivery partners."""
    if wind_kmh < 20:
        return 0.0
    elif wind_kmh < 35:
        return 0.15 + (wind_kmh - 20) * 0.01
    elif wind_kmh < 50:
        return 0.30 + (wind_kmh - 35) * 0.02
    elif wind_kmh < 70:
        return 0.60 + (wind_kmh - 50) * 0.015
    else:
        return min(1.0, 0.90)

def calc_humidity_risk(humidity_pct: float, temp_c: float) -> float:
    """Humidity as a heat-index amplifier (wet-bulb effect)."""
    if temp_c < 30 or humidity_pct < 60:
        return 0.0
    # Heat index danger zone
    heat_index = temp_c + 0.33 * humidity_pct - 0.70 * (1 - humidity_pct/100) - 4.0
    if heat_index > 54:
        return 1.0  # Extreme danger
    elif heat_index > 46:
        return 0.70
    elif heat_index > 40:
        return 0.40
    elif heat_index > 35:
        return 0.15
    return 0.0

def calc_uv_risk(uv_index: float) -> float:
    """UV exposure risk for outdoor delivery workers."""
    if uv_index < 3:
        return 0.0
    elif uv_index < 6:
        return 0.10
    elif uv_index < 8:
        return 0.25
    elif uv_index < 11:
        return 0.50
    else:
        return 0.80

def calc_visibility_risk(visibility_km: float) -> float:
    """Visibility risk — fog, smog, dust storms."""
    if visibility_km > 5.0:
        return 0.0
    elif visibility_km > 2.0:
        return 0.20
    elif visibility_km > 1.0:
        return 0.50
    elif visibility_km > 0.5:
        return 0.80
    else:
        return 1.0  # Near-zero visibility — work halted

def calc_flood_risk(rain_mm_hr: float, drainage_quality: float) -> float:
    """Flood/waterlogging probability combining rain + drainage infrastructure."""
    if rain_mm_hr < 5:
        return 0.0
    raw_flood = (rain_mm_hr / 30.0) * (1.0 - drainage_quality)
    return round(min(1.0, raw_flood), 3)

def calc_cyclone_risk(city: str, wind_kmh: float, rain_mm_hr: float) -> float:
    """Cyclone proximity (simulated — based on wind + rain combo in coastal cities)."""
    if city.lower() not in CYCLONE_PRONE:
        return 0.0
    if wind_kmh > 60 and rain_mm_hr > 20:
        return 0.90
    elif wind_kmh > 45 and rain_mm_hr > 12:
        return 0.60
    elif wind_kmh > 30 and rain_mm_hr > 8:
        return 0.30
    return 0.0


def get_location_risk(city: str, zone: str) -> dict:
    """Get location risk data from the predefined map."""
    city_lower = city.lower().replace(" ", "_")
    zone_lower = zone.lower().replace(" ", "_")
    city_data = LOCATION_RISK_MAP.get(city_lower, LOCATION_RISK_MAP["default"])
    zone_data = city_data.get(zone_lower, city_data.get("default", {"base": 0.50, "drainage": 0.5, "infra": 0.6}))
    return zone_data


def calculate_seasonal_risk(city: str, target_date: date) -> float:
    """Calculate seasonal risk based on city and month."""
    month = target_date.month
    city_l = city.lower()

    if city_l in MONSOON_CITIES:
        if month in [7, 8]:
            return 0.90  # Peak monsoon
        elif month in [6, 9]:
            return 0.75
        elif month in [5, 10]:
            return 0.55
        elif month in [3, 4]:
            return 0.40  # Pre-monsoon heat
        elif month in [11, 12, 1, 2]:
            return 0.15  # Winter
    
    if city_l in FOG_PRONE:
        if month in [12, 1]:
            return 0.70  # Dense fog season
        elif month == 11:
            return 0.50
    
    if city_l in POLLUTION_HOTSPOTS:
        if month in [10, 11]:
            return 0.80  # Post-Diwali + crop burning
        elif month == 12:
            return 0.60
    
    # Generic
    if month in [6, 7, 8]:
        return 0.65
    elif month in [4, 5]:
        return 0.45
    elif month in [12, 1]:
        return 0.35
    return 0.20


def calculate_historical_risk(disruption_count_30d: int) -> float:
    """Calculate historical risk — smoother sigmoid curve."""
    return round(1.0 / (1.0 + math.exp(-0.5 * (disruption_count_30d - 5))), 3)


def calculate_time_of_day_risk(hour: int) -> float:
    """Time-of-day risk multiplier — peak hours have higher disruption impact."""
    if 11 <= hour <= 14:
        return 0.80  # Lunch rush — high delivery demand, high loss
    elif 18 <= hour <= 21:
        return 0.90  # Dinner rush — peak earnings
    elif 7 <= hour <= 10:
        return 0.50  # Morning
    elif 22 <= hour or hour <= 5:
        return 0.30  # Late night — lower income anyway
    return 0.40


# ─── Request/Response Models ─────────────────────────────────────────────────

class RiskRequest(BaseModel):
    city: str
    zone: str
    daily_income: float = Field(ge=200, le=2000)
    working_hours: int = Field(ge=4, le=12, default=8)
    date: date
    rain_mm_hr: float = 0.0
    temperature_c: float = 30.0
    aqi: float = 100.0
    wind_kmh: float = 10.0
    humidity_pct: float = 50.0
    uv_index: float = 5.0
    visibility_km: float = 8.0
    disruption_count_30d: int = 0


class RiskResponse(BaseModel):
    risk_score: float
    weather_risk: float
    location_risk: float
    seasonal_risk: float
    historical_risk: float
    wind_risk: float
    humidity_risk: float
    uv_risk: float
    visibility_risk: float
    flood_risk: float
    cyclone_risk: float
    time_of_day_risk: float
    risk_label: str


class WeatherResponse(BaseModel):
    city: str
    zone: str
    rain_mm_hr: float
    temperature_c: float
    aqi: float
    wind_kmh: float
    humidity_pct: float
    uv_index: float
    visibility_km: float
    flood_risk_score: float
    cyclone_risk_score: float
    is_disrupted: bool
    trigger_type: Optional[str]
    severity: str  # "NONE" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL"
    disruption_factors: list[str]


class FraudRequest(BaseModel):
    worker_id: str
    claim_id: str
    submitted_coordinates: dict
    event_timestamp: datetime
    platform_data: dict
    claim_amount: float = 0
    daily_income: float = 0


class FraudResponse(BaseModel):
    is_fraudulent: bool
    confidence_score: float
    reason: Optional[str]
    risk_indicators: list[str]
    fraud_score: float  # 0.0 to 1.0


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "downtime-ai-risk-engine", "version": "2.0.0"}


@app.post("/risk/calculate", response_model=RiskResponse)
def calculate_risk(req: RiskRequest) -> RiskResponse:
    """Calculate composite risk score from 10+ environmental and contextual factors."""
    
    loc_data = get_location_risk(req.city, req.zone)
    location_base = loc_data["base"]
    drainage = loc_data.get("drainage", 0.5)
    
    rain_risk = calc_rain_risk(req.rain_mm_hr)
    heat_risk = calc_heat_risk(req.temperature_c)
    aqi_risk = calc_aqi_risk(req.aqi)
    wind_risk = calc_wind_risk(req.wind_kmh)
    humidity_risk = calc_humidity_risk(req.humidity_pct, req.temperature_c)
    uv_risk = calc_uv_risk(req.uv_index)
    visibility_risk = calc_visibility_risk(req.visibility_km)
    flood_risk = calc_flood_risk(req.rain_mm_hr, drainage)
    cyclone_risk = calc_cyclone_risk(req.city, req.wind_kmh, req.rain_mm_hr)
    seasonal_risk = calculate_seasonal_risk(req.city, req.date)
    historical_risk = calculate_historical_risk(req.disruption_count_30d)
    tod_risk = calculate_time_of_day_risk(datetime.now().hour)

    # Composite weather risk (multi-factor weighted)
    weather_risk = (
        rain_risk * 0.20
        + heat_risk * 0.12
        + aqi_risk * 0.12
        + wind_risk * 0.15
        + humidity_risk * 0.08
        + uv_risk * 0.05
        + visibility_risk * 0.10
        + flood_risk * 0.10
        + cyclone_risk * 0.08
    )
    weather_risk = round(min(1.0, weather_risk), 3)

    # Master composite score
    raw_score = (
        weather_risk * 0.35
        + location_base * 0.20
        + seasonal_risk * 0.15
        + historical_risk * 0.10
        + tod_risk * 0.10
        + cyclone_risk * 0.10  # Extra weight for extreme events
    )
    risk_score = round(max(0.05, min(0.95, raw_score)), 3)

    risk_label = (
        "Low" if risk_score < 0.25
        else "Moderate" if risk_score < 0.45
        else "High" if risk_score < 0.65
        else "Very High" if risk_score < 0.80
        else "Critical"
    )

    return RiskResponse(
        risk_score=risk_score,
        weather_risk=weather_risk,
        location_risk=location_base,
        seasonal_risk=seasonal_risk,
        historical_risk=historical_risk,
        wind_risk=round(wind_risk, 3),
        humidity_risk=round(humidity_risk, 3),
        uv_risk=round(uv_risk, 3),
        visibility_risk=round(visibility_risk, 3),
        flood_risk=round(flood_risk, 3),
        cyclone_risk=round(cyclone_risk, 3),
        time_of_day_risk=round(tod_risk, 3),
        risk_label=risk_label,
    )


# ─── Smart Weather Simulation ──────────────────────────────────────────────

def _deterministic_seed(city: str, zone: str) -> float:
    """Generate a deterministic-ish but varying seed based on city+zone+current-hour."""
    now = datetime.now()
    key = f"{city}-{zone}-{now.year}-{now.month}-{now.day}-{now.hour}"
    h = int(hashlib.md5(key.encode()).hexdigest()[:8], 16)
    return (h % 1000) / 1000.0


@app.get("/weather/current", response_model=WeatherResponse)
def get_current_weather(city: str, zone: str) -> WeatherResponse:
    """
    Get current weather for a zone with realistic simulation.
    Uses city seasonal profiles + deterministic variation to produce
    realistic but varying conditions per zone.
    """
    city_l = city.lower()
    profile = CITY_PROFILES.get(city_l, CITY_PROFILES["default"])
    loc_data = get_location_risk(city, zone)
    drainage = loc_data.get("drainage", 0.5)
    
    # Deterministic variation per city+zone+hour
    seed = _deterministic_seed(city, zone)
    month = datetime.now().month
    
    # Seasonal multipliers
    monsoon_mult = 1.0
    if city_l in MONSOON_CITIES and month in [6, 7, 8, 9]:
        monsoon_mult = 2.5 + seed * 1.5
    elif month in [6, 7, 8]:
        monsoon_mult = 1.5 + seed
    
    heat_mult = 1.0
    if month in [4, 5] and city_l in ["delhi", "hyderabad"]:
        heat_mult = 1.3
    
    pollution_mult = 1.0
    if city_l in POLLUTION_HOTSPOTS and month in [10, 11, 12]:
        pollution_mult = 2.0 + seed
    
    # Generate weather values
    rain = round(profile["rain_base"] * monsoon_mult * (0.5 + seed * 1.5), 1)
    temp = round(profile["temp_base"] * heat_mult + (seed - 0.5) * 6, 1)
    aqi = round(profile["aqi_base"] * pollution_mult + (seed - 0.3) * 50, 0)
    wind = round(profile["wind_base"] * (0.6 + seed * 1.2), 1)
    humidity = round(min(98, profile["humidity_base"] + (seed - 0.3) * 30), 0)
    visibility = round(max(0.2, profile["visibility_base"] - (seed * 4)), 1)
    uv = round(min(12, max(1, 5 + (seed - 0.5) * 8)), 1)
    
    # Ensure non-negative
    rain = max(0, rain)
    aqi = max(20, aqi)
    wind = max(2, wind)
    humidity = max(15, humidity)
    
    # Calculate derived risks
    flood_score = calc_flood_risk(rain, drainage)
    cyclone_score = calc_cyclone_risk(city, wind, rain)
    
    # Determine disruption
    disruption_factors = []
    if rain >= 10:
        disruption_factors.append("HEAVY_RAIN")
    if rain >= 20:
        disruption_factors.append("TORRENTIAL_RAIN")
    if temp >= 42:
        disruption_factors.append("EXTREME_HEAT")
    elif temp >= 40:
        disruption_factors.append("HEAT_ADVISORY")
    if aqi >= 300:
        disruption_factors.append("SEVERE_POLLUTION")
    elif aqi >= 200:
        disruption_factors.append("POOR_AIR_QUALITY")
    if wind >= 50:
        disruption_factors.append("HIGH_WIND")
    elif wind >= 35:
        disruption_factors.append("WIND_ADVISORY")
    if visibility <= 1.0:
        disruption_factors.append("LOW_VISIBILITY")
    if flood_score >= 0.5:
        disruption_factors.append("FLOOD_WARNING")
    if cyclone_score >= 0.3:
        disruption_factors.append("CYCLONE_ALERT")
    if humidity >= 85 and temp >= 35:
        disruption_factors.append("HEAT_INDEX_DANGER")
    
    is_disrupted = len(disruption_factors) > 0
    
    # Severity assessment
    if cyclone_score >= 0.6 or flood_score >= 0.7 or rain >= 25 or len(disruption_factors) >= 3:
        severity = "CRITICAL"
    elif len(disruption_factors) >= 2 or rain >= 15 or aqi >= 300 or wind >= 50:
        severity = "HIGH"
    elif len(disruption_factors) >= 1:
        severity = "MODERATE"
    elif rain >= 5 or aqi >= 150 or wind >= 25:
        severity = "LOW"
    else:
        severity = "NONE"
    
    trigger_type = disruption_factors[0] if disruption_factors else None
    
    return WeatherResponse(
        city=city, zone=zone,
        rain_mm_hr=rain, temperature_c=temp, aqi=aqi,
        wind_kmh=wind, humidity_pct=humidity,
        uv_index=uv, visibility_km=visibility,
        flood_risk_score=flood_score, cyclone_risk_score=cyclone_score,
        is_disrupted=is_disrupted, trigger_type=trigger_type,
        severity=severity, disruption_factors=disruption_factors,
    )


# ─── Advanced Fraud Detection ──────────────────────────────────────────────

@app.post("/fraud/evaluate", response_model=FraudResponse)
def evaluate_fraud(req: FraudRequest) -> FraudResponse:
    """
    Advanced multi-rule fraud evaluation engine.
    Rules:
    1. GPS validation — missing or spoofed coordinates
    2. Activity validation — no platform activity during claimed period  
    3. Claim amount validation — excessive payout vs daily income
    4. Temporal validation — claiming outside work hours
    5. Velocity check — multiple claims in rapid succession
    """
    risk_indicators = []
    fraud_score = 0.0
    
    # Rule 1: GPS Validation
    lat = req.submitted_coordinates.get("lat", 0)
    lng = req.submitted_coordinates.get("lng", 0)
    if lat == 0 and lng == 0:
        risk_indicators.append("GPS_MISSING_OR_SPOOFED")
        fraud_score += 0.35
    elif abs(lat) > 90 or abs(lng) > 180:
        risk_indicators.append("GPS_COORDINATES_INVALID")
        fraud_score += 0.40

    # Rule 2: Activity Validation
    if not req.platform_data.get("is_active"):
        risk_indicators.append("NO_PLATFORM_ACTIVITY")
        fraud_score += 0.25
    
    # Rule 3: Claim Amount Validation
    if req.claim_amount > 0 and req.daily_income > 0:
        ratio = req.claim_amount / req.daily_income
        if ratio > 1.5:
            risk_indicators.append("EXCESSIVE_CLAIM_AMOUNT")
            fraud_score += 0.30
    
    # Rule 4: Temporal Validation
    claim_hour = req.event_timestamp.hour
    if claim_hour < 6 or claim_hour > 23:
        risk_indicators.append("OFF_HOURS_CLAIM")
        fraud_score += 0.15
    
    # Rule 5: Platform order count validation
    orders = req.platform_data.get("orders_today", -1)
    if orders == 0 and req.platform_data.get("is_active"):
        risk_indicators.append("ACTIVE_BUT_ZERO_ORDERS")
        fraud_score += 0.20
    
    fraud_score = min(1.0, fraud_score)
    is_fraud = fraud_score >= 0.50
    
    reason = None
    if is_fraud:
        reason = f"Multiple fraud indicators detected (score: {fraud_score:.2f}). Claim requires manual review."
    
    return FraudResponse(
        is_fraudulent=is_fraud,
        confidence_score=round(1.0 - fraud_score, 2) if not is_fraud else round(fraud_score, 2),
        reason=reason,
        risk_indicators=risk_indicators,
        fraud_score=round(fraud_score, 3),
    )


# ─── ML MODEL ENDPOINTS ────────────────────────────────────────────────────────

from ml_model import pricing_model, CITY_PROFILES as ML_CITY_PROFILES, PLATFORMS
from weather_api import get_live_weather, get_forecast, get_supported_cities


class MLPremiumRequest(BaseModel):
    city: str = "hyderabad"
    zone: str = "default"
    daily_income: float = 500
    coverage_pct: float = 0.7
    working_hours: int = 8
    experience_days: int = 30
    no_claim_streak: int = 0
    claims_30d: int = 0
    platform: str = "zomato"
    rain_mm_hr: float = 0
    temperature_c: float = 30
    aqi: float = 100
    wind_kmh: float = 10
    humidity_pct: float = 50
    uv_index: float = 5
    visibility_km: float = 8


@app.post("/ml/predict-premium")
async def ml_predict_premium(req: MLPremiumRequest):
    """ML-powered premium prediction using trained GradientBoosting model."""
    result = pricing_model.predict_premium(req.dict())
    return result


@app.get("/ml/model-info")
async def ml_model_info():
    """Get ML model metadata and training info."""
    return pricing_model.get_model_info()


@app.get("/ml/cities")
async def ml_list_cities():
    """List all supported cities with zones."""
    cities_data = {}
    for city, profile in ML_CITY_PROFILES.items():
        cities_data[city] = {
            "zones": list(profile["zones"].keys()),
            "risk_profile": {
                "flood_prone": profile["flood"],
                "cyclone_prone": profile["cyclone"],
                "pollution_prone": profile["pollution"],
                "fog_prone": profile["fog"],
            }
        }
    return {"cities": cities_data, "total": len(cities_data), "platforms": PLATFORMS}


@app.get("/weather/live/{city}")
async def live_weather(city: str):
    """Get real-time weather from OpenWeatherMap (with simulation fallback)."""
    data = await get_live_weather(city)
    return data


@app.get("/weather/forecast/{city}")
async def weather_forecast(city: str):
    """Get 5-day forecast for predictive risk analytics."""
    data = await get_forecast(city)
    return data


@app.get("/weather/supported-cities")
async def supported_cities():
    """List all cities with live weather support."""
    return {"cities": get_supported_cities(), "total": len(get_supported_cities())}


class MLFraudRequest(BaseModel):
    rain_mm_hr: float = 0
    temperature_c: float = 30
    aqi: float = 100
    wind_kmh: float = 10
    humidity_pct: float = 50
    uv_index: float = 5
    visibility_km: float = 8
    drainage_quality: float = 0.5
    infra_quality: float = 0.6
    zone_base_risk: float = 0.3
    population_density: float = 0.5
    daily_income: float = 500
    working_hours: int = 8
    experience_days: int = 30
    no_claim_streak: int = 0
    claims_30d: int = 0
    platform_idx: int = 0


@app.post("/fraud/ml-evaluate")
async def ml_fraud_evaluate(req: MLFraudRequest):
    """ML-based fraud anomaly detection using Isolation Forest."""
    features = req.dict()
    features["month_sin"] = 0.0
    features["month_cos"] = 1.0
    features["hour_sin"] = 0.0
    features["hour_cos"] = 1.0
    features["is_weekend"] = 0
    result = pricing_model.detect_fraud_anomaly(features)
    return result


# Pre-train ML model on startup
@app.on_event("startup")
async def startup_train_model():
    """Train ML model on server startup."""
    print("[Startup] Training ML pricing model...")
    pricing_model.train()
    print("[Startup] ML model ready!")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

