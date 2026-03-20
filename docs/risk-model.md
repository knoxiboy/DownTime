# Risk Score Model — DownTime

## Master Formula

```
risk_score = (weather_risk × 0.40)
           + (location_risk × 0.30)
           + (seasonal_risk × 0.20)
           + (historical_risk × 0.10)
```

Weights sum to 1.0. Output is clamped to **[0.10, 0.90]**.

---

## 1. Weather Risk (weight: 0.40)

Calculated from real-time OpenWeatherMap + WAQI data at the worker's city.

```python
def calculate_weather_risk(rain_mm_per_hr, temperature_c, aqi):
    # Rain risk (biggest driver)
    rain_risk = 0.0
    if rain_mm_per_hr < 2.5:     rain_risk = 0.1   # Light drizzle
    elif rain_mm_per_hr < 7.5:   rain_risk = 0.3   # Moderate rain
    elif rain_mm_per_hr < 15.0:  rain_risk = 0.6   # Heavy rain
    elif rain_mm_per_hr < 20.0:  rain_risk = 0.8   # Very heavy
    else:                        rain_risk = 1.0   # Trigger threshold

    # Heat risk
    heat_risk = 0.0
    if temperature_c < 35:       heat_risk = 0.0
    elif temperature_c < 38:     heat_risk = 0.2
    elif temperature_c < 40:     heat_risk = 0.5
    elif temperature_c < 42:     heat_risk = 0.7
    else:                        heat_risk = 1.0   # Trigger threshold

    # AQI risk
    aqi_risk = 0.0
    if aqi < 100:                aqi_risk = 0.0    # Good/Moderate
    elif aqi < 200:              aqi_risk = 0.2    # Unhealthy for sensitive
    elif aqi < 300:              aqi_risk = 0.5    # Unhealthy
    else:                        aqi_risk = 1.0    # Trigger threshold

    # Weighted combination
    weather_risk = (rain_risk * 0.5) + (heat_risk * 0.3) + (aqi_risk * 0.2)
    return round(min(1.0, weather_risk), 3)
```

---

## 2. Location Risk (weight: 0.30)

Defined per city zone at onboarding. Stored in database.

```python
LOCATION_RISK_MAP = {
    "hyderabad": {
        "kondapur":      0.55,   # Flood-prone, high traffic
        "hitech_city":   0.40,
        "secunderabad":  0.65,   # Historically waterlogged
        "gachibowli":    0.35,
        "default":       0.50
    },
    "mumbai": {
        "dharavi":       0.85,
        "bandra":        0.60,
        "andheri":       0.70,
        "default":       0.65
    },
    "bangalore": {
        "whitefield":    0.45,
        "koramangala":   0.50,
        "default":       0.48
    },
    "default": { "default": 0.50 }
}
```

---

## 3. Seasonal Risk (weight: 0.20)

```python
import datetime

def calculate_seasonal_risk(city: str, date: datetime.date) -> float:
    month = date.month
    monsoon_cities = ["hyderabad", "mumbai", "chennai", "kolkata", "bhubaneswar"]

    if city.lower() in monsoon_cities:
        if month in [6, 7, 8, 9]:    return 0.85   # Peak monsoon
        elif month in [5, 10]:       return 0.55   # Pre/post monsoon
        elif month in [3, 4]:        return 0.40   # Summer (heat risk)
        else:                        return 0.15   # Winter — low risk
    else:
        if month in [6, 7, 8]:      return 0.70   # Monsoon
        elif month in [12, 1]:      return 0.50   # Dense fog
        elif month in [4, 5]:       return 0.45   # Dust storms
        else:                       return 0.20
```

---

## 4. Historical Risk (weight: 0.10)

Count of verified disruption events in the worker's zone over the past 30 days.

```python
def calculate_historical_risk(disruption_count_30d: int) -> float:
    if disruption_count_30d == 0:    return 0.10
    elif disruption_count_30d <= 2:  return 0.25
    elif disruption_count_30d <= 5:  return 0.50
    elif disruption_count_30d <= 8:  return 0.70
    else:                            return 0.90
```

---

## 5. Final Risk Score Assembly

```python
def calculate_risk_score(weather_risk, location_risk, seasonal_risk, historical_risk):
    raw_score = (weather_risk    * 0.40
               + location_risk   * 0.30
               + seasonal_risk   * 0.20
               + historical_risk * 0.10)

    # Clamp to [0.10, 0.90]
    return round(max(0.10, min(0.90, raw_score)), 3)
```

## Risk Labels

| Score Range | Label |
|-------------|-------|
| < 0.30 | Low |
| 0.30 – 0.54 | Medium |
| 0.55 – 0.74 | High |
| ≥ 0.75 | Very High |
