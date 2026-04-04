"""
Real OpenWeatherMap API integration for DownTime.
Calls live weather + air quality APIs, with simulation fallback.
"""

import os
import httpx
import asyncio
import hashlib
from datetime import datetime
from typing import Optional

API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
BASE_URL = "https://api.openweathermap.org"

# Lat/Lon for Indian cities
CITY_COORDS = {
    "hyderabad": (17.385, 78.4867), "mumbai": (19.076, 72.8777), "bangalore": (12.9716, 77.5946),
    "delhi": (28.7041, 77.1025), "chennai": (13.0827, 80.2707), "kolkata": (22.5726, 88.3639),
    "pune": (18.5204, 73.8567), "ahmedabad": (23.0225, 72.5714), "jaipur": (26.9124, 75.7873),
    "lucknow": (26.8467, 80.9462), "chandigarh": (30.7333, 76.7794), "bhopal": (23.2599, 77.4126),
    "indore": (22.7196, 75.8577), "nagpur": (21.1458, 79.0882), "patna": (25.6093, 85.1376),
    "bhubaneswar": (20.2961, 85.8245), "kochi": (9.9312, 76.2673), "thiruvananthapuram": (8.5241, 76.9366),
    "coimbatore": (11.0168, 76.9558), "visakhapatnam": (17.6868, 83.2185), "surat": (21.1702, 72.8311),
    "vadodara": (22.3072, 73.1812), "rajkot": (22.3039, 70.8022), "kanpur": (26.4499, 80.3319),
    "varanasi": (25.3176, 82.9739), "agra": (27.1767, 78.0081), "noida": (28.5355, 77.3910),
    "gurgaon": (28.4595, 77.0266), "dehradun": (30.3165, 78.0322), "guwahati": (26.1445, 91.7362),
    "ranchi": (23.3441, 85.3096), "raipur": (21.2514, 81.6296), "mysore": (12.2958, 76.6394),
    "mangalore": (12.9141, 74.8560), "madurai": (9.9252, 78.1198), "tiruchirappalli": (10.7905, 78.7047),
    "jodhpur": (26.2389, 73.0243), "udaipur": (24.5854, 73.7125), "goa": (15.2993, 74.1240),
    "jammu": (32.7266, 74.8570), "amritsar": (31.6340, 74.8723), "ludhiana": (30.9010, 75.8573),
    "nashik": (19.9975, 73.7898), "aurangabad": (19.8762, 75.3433), "thane": (19.2183, 72.9781),
    "navi_mumbai": (19.0330, 73.0297),
}


def _simulate_weather(city: str) -> dict:
    """Deterministic simulation fallback when API is unavailable."""
    now = datetime.now()
    seed_str = f"{city}-{now.strftime('%Y-%m-%d-%H')}"
    h = int(hashlib.sha256(seed_str.encode()).hexdigest()[:8], 16)

    from ml_model import get_city_profile
    profile = get_city_profile(city)
    month = now.month
    is_monsoon = month in [6, 7, 8, 9]

    rain = (h % 40) * (2.5 if is_monsoon else 0.8)
    temp = profile["temp"] + ((h % 10) - 5) + (4 if month in [4, 5] else -3 if month in [12, 1] else 0)
    aqi = profile["aqi"] + ((h % 60) - 30) * (1.5 if month in [11, 12, 1] else 0.8)
    wind = profile["wind"] + ((h % 15) - 7)
    humidity = profile["hum"] + ((h % 20) - 10)

    return {
        "source": "simulated",
        "city": city,
        "temperature_c": round(max(5, min(50, temp)), 1),
        "feels_like_c": round(max(5, min(55, temp + 3)), 1),
        "humidity_pct": round(max(15, min(98, humidity)), 0),
        "wind_kmh": round(max(2, min(80, wind)), 1),
        "rain_mm_hr": round(max(0, min(100, rain / 10)), 2),
        "visibility_km": round(max(0.2, profile["vis"] - (rain / 20)), 1),
        "uv_index": round(max(1, min(12, 6 + ((h % 6) - 3))), 1),
        "aqi": round(max(20, min(500, aqi)), 0),
        "aqi_category": _aqi_category(aqi),
        "weather_main": "Rain" if rain > 10 else "Haze" if aqi > 200 else "Clear",
        "weather_desc": "heavy rain" if rain > 20 else "light rain" if rain > 5 else "haze" if aqi > 200 else "clear sky",
        "timestamp": now.isoformat(),
    }


def _aqi_category(aqi: float) -> str:
    if aqi <= 50: return "Good"
    if aqi <= 100: return "Moderate"
    if aqi <= 150: return "Unhealthy for Sensitive"
    if aqi <= 200: return "Unhealthy"
    if aqi <= 300: return "Very Unhealthy"
    return "Hazardous"


async def get_live_weather(city: str) -> dict:
    """Fetch real weather from OpenWeatherMap, fallback to simulation."""
    city_key = city.lower().replace(" ", "_")
    coords = CITY_COORDS.get(city_key)

    if not coords or not API_KEY:
        return _simulate_weather(city)

    lat, lon = coords

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Current weather
            weather_resp = await client.get(
                f"{BASE_URL}/data/2.5/weather",
                params={"lat": lat, "lon": lon, "appid": API_KEY, "units": "metric"}
            )
            weather_data = weather_resp.json()

            # Air Quality
            aqi_resp = await client.get(
                f"{BASE_URL}/data/2.5/air_pollution",
                params={"lat": lat, "lon": lon, "appid": API_KEY}
            )
            aqi_data = aqi_resp.json()

        if weather_resp.status_code != 200:
            print(f"[Weather API] Error {weather_resp.status_code}: {weather_data}")
            return _simulate_weather(city)

        # Parse weather
        main = weather_data.get("main", {})
        wind = weather_data.get("wind", {})
        rain = weather_data.get("rain", {})
        vis_m = weather_data.get("visibility", 10000)
        weather_items = weather_data.get("weather", [{}])

        # Parse AQI
        aqi_value = 100
        if aqi_resp.status_code == 200 and aqi_data.get("list"):
            aqi_list = aqi_data["list"][0]
            components = aqi_list.get("components", {})
            pm25 = components.get("pm2_5", 30)
            pm10 = components.get("pm10", 50)
            # Convert to Indian AQI scale (simplified)
            aqi_value = max(pm25 * 2.5, pm10 * 1.5)

        return {
            "source": "openweathermap_live",
            "city": city,
            "temperature_c": round(main.get("temp", 30), 1),
            "feels_like_c": round(main.get("feels_like", 30), 1),
            "humidity_pct": main.get("humidity", 50),
            "wind_kmh": round(wind.get("speed", 3) * 3.6, 1),  # m/s to km/h
            "rain_mm_hr": rain.get("1h", 0),
            "visibility_km": round(vis_m / 1000, 1),
            "uv_index": 5,  # UV requires separate OneCall API
            "aqi": round(aqi_value, 0),
            "aqi_category": _aqi_category(aqi_value),
            "weather_main": weather_items[0].get("main", "Clear"),
            "weather_desc": weather_items[0].get("description", "clear sky"),
            "timestamp": datetime.now().isoformat(),
            "coords": {"lat": lat, "lon": lon},
        }

    except Exception as e:
        print(f"[Weather API] Exception: {e}, falling back to simulation")
        return _simulate_weather(city)


async def get_forecast(city: str) -> dict:
    """Get 5-day / 3-hour forecast for predictive analytics."""
    city_key = city.lower().replace(" ", "_")
    coords = CITY_COORDS.get(city_key)

    if not coords or not API_KEY:
        return _generate_forecast_simulation(city)

    lat, lon = coords

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{BASE_URL}/data/2.5/forecast",
                params={"lat": lat, "lon": lon, "appid": API_KEY, "units": "metric"}
            )
            data = resp.json()

        if resp.status_code != 200:
            return _generate_forecast_simulation(city)

        daily_risk = {}
        for item in data.get("list", []):
            dt = datetime.fromtimestamp(item["dt"])
            date_key = dt.strftime("%Y-%m-%d")

            rain = item.get("rain", {}).get("3h", 0)
            temp = item["main"]["temp"]
            wind = item["wind"]["speed"] * 3.6

            risk = 0.0
            if rain > 10: risk += 0.3
            elif rain > 3: risk += 0.1
            if temp > 42: risk += 0.25
            elif temp > 38: risk += 0.1
            if wind > 40: risk += 0.2
            elif wind > 25: risk += 0.08

            if date_key not in daily_risk:
                daily_risk[date_key] = {"max_risk": 0, "rain_max": 0, "temp_max": 0, "wind_max": 0}

            daily_risk[date_key]["max_risk"] = max(daily_risk[date_key]["max_risk"], risk)
            daily_risk[date_key]["rain_max"] = max(daily_risk[date_key]["rain_max"], rain)
            daily_risk[date_key]["temp_max"] = max(daily_risk[date_key]["temp_max"], temp)
            daily_risk[date_key]["wind_max"] = max(daily_risk[date_key]["wind_max"], wind)

        forecasts = []
        for date, data_vals in sorted(daily_risk.items())[:7]:
            forecasts.append({
                "date": date,
                "disruption_probability": round(min(1.0, data_vals["max_risk"]), 2),
                "rain_forecast_mm": round(data_vals["rain_max"], 1),
                "temp_forecast_c": round(data_vals["temp_max"], 1),
                "wind_forecast_kmh": round(data_vals["wind_max"], 1),
                "risk_level": "High" if data_vals["max_risk"] > 0.4 else "Moderate" if data_vals["max_risk"] > 0.15 else "Low",
            })

        return {"source": "openweathermap_forecast", "city": city, "daily_forecasts": forecasts}

    except Exception as e:
        print(f"[Forecast API] Exception: {e}")
        return _generate_forecast_simulation(city)


def _generate_forecast_simulation(city: str) -> dict:
    """Generate simulated 7-day forecast."""
    import random
    from ml_model import get_city_profile
    profile = get_city_profile(city)
    now = datetime.now()

    forecasts = []
    for i in range(7):
        rain = max(0, profile["rain"] + random.uniform(-2, 5))
        temp = profile["temp"] + random.uniform(-3, 5)
        wind = profile["wind"] + random.uniform(-5, 10)

        risk = 0.0
        if rain > 10: risk += 0.3
        if temp > 40: risk += 0.2
        if wind > 35: risk += 0.15

        forecasts.append({
            "date": (datetime(now.year, now.month, now.day).__class__(now.year, now.month, now.day + i if now.day + i <= 28 else 1)).strftime("%Y-%m-%d") if i == 0 else f"Day+{i}",
            "disruption_probability": round(min(1.0, risk), 2),
            "rain_forecast_mm": round(rain, 1),
            "temp_forecast_c": round(temp, 1),
            "wind_forecast_kmh": round(wind, 1),
            "risk_level": "High" if risk > 0.4 else "Moderate" if risk > 0.15 else "Low",
        })

    return {"source": "simulated_forecast", "city": city, "daily_forecasts": forecasts}


def get_supported_cities():
    """Return all supported cities."""
    return list(CITY_COORDS.keys())
