"""
DownTime ML Pricing Engine v3.0
Trained GradientBoostingRegressor with 20+ features across 45 Indian cities.
Generates 50,000 synthetic actuarial scenarios for training.
"""

import numpy as np
import pandas as pd
import math
import random
import joblib
import os
from sklearn.ensemble import GradientBoostingRegressor, IsolationForest
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler
from datetime import datetime

# ─── 45 Indian City Profiles ─────────────────────────────────────────────────
# Each city has: rain_base, temp_base, aqi_base, humidity_base, wind_base,
#   visibility_base, flood_prone (0-1), cyclone_prone (0-1), pollution_prone (0-1),
#   fog_prone (0-1), population_density (relative 0-1)

CITY_PROFILES = {
    "hyderabad": {"rain": 3.0, "temp": 33, "aqi": 95, "hum": 55, "wind": 12, "vis": 8.0,
                  "flood": 0.5, "cyclone": 0.1, "pollution": 0.3, "fog": 0.1, "pop": 0.7,
                  "zones": {"kondapur": {"drain": 0.4, "infra": 0.6}, "hitech_city": {"drain": 0.7, "infra": 0.8},
                            "secunderabad": {"drain": 0.3, "infra": 0.5}, "gachibowli": {"drain": 0.8, "infra": 0.9},
                            "madhapur": {"drain": 0.6, "infra": 0.7}, "lb_nagar": {"drain": 0.3, "infra": 0.4},
                            "kukatpally": {"drain": 0.4, "infra": 0.5}, "ameerpet": {"drain": 0.5, "infra": 0.6}}},
    "mumbai": {"rain": 5.0, "temp": 31, "aqi": 120, "hum": 75, "wind": 18, "vis": 6.5,
               "flood": 0.9, "cyclone": 0.4, "pollution": 0.5, "fog": 0.1, "pop": 0.95,
               "zones": {"dharavi": {"drain": 0.1, "infra": 0.2}, "bandra": {"drain": 0.5, "infra": 0.7},
                         "andheri": {"drain": 0.3, "infra": 0.5}, "dadar": {"drain": 0.4, "infra": 0.6},
                         "borivali": {"drain": 0.4, "infra": 0.5}, "malad": {"drain": 0.3, "infra": 0.4},
                         "worli": {"drain": 0.5, "infra": 0.7}, "powai": {"drain": 0.6, "infra": 0.7}}},
    "bangalore": {"rain": 2.0, "temp": 28, "aqi": 80, "hum": 60, "wind": 10, "vis": 9.0,
                  "flood": 0.4, "cyclone": 0.0, "pollution": 0.2, "fog": 0.1, "pop": 0.75,
                  "zones": {"whitefield": {"drain": 0.5, "infra": 0.7}, "koramangala": {"drain": 0.4, "infra": 0.6},
                            "hsr_layout": {"drain": 0.5, "infra": 0.7}, "electronic_city": {"drain": 0.6, "infra": 0.8},
                            "indiranagar": {"drain": 0.5, "infra": 0.7}, "jayanagar": {"drain": 0.4, "infra": 0.6},
                            "marathahalli": {"drain": 0.3, "infra": 0.5}, "hebbal": {"drain": 0.4, "infra": 0.6}}},
    "delhi": {"rain": 1.5, "temp": 35, "aqi": 220, "hum": 45, "wind": 14, "vis": 5.0,
              "flood": 0.4, "cyclone": 0.0, "pollution": 0.9, "fog": 0.8, "pop": 0.9,
              "zones": {"connaught_place": {"drain": 0.5, "infra": 0.7}, "dwarka": {"drain": 0.6, "infra": 0.8},
                        "rohini": {"drain": 0.4, "infra": 0.6}, "lajpat_nagar": {"drain": 0.4, "infra": 0.5},
                        "saket": {"drain": 0.5, "infra": 0.7}, "karol_bagh": {"drain": 0.3, "infra": 0.4},
                        "janakpuri": {"drain": 0.5, "infra": 0.6}, "pitampura": {"drain": 0.4, "infra": 0.5}}},
    "chennai": {"rain": 4.5, "temp": 34, "aqi": 90, "hum": 70, "wind": 16, "vis": 7.0,
                "flood": 0.8, "cyclone": 0.6, "pollution": 0.3, "fog": 0.1, "pop": 0.8,
                "zones": {"t_nagar": {"drain": 0.3, "infra": 0.5}, "adyar": {"drain": 0.4, "infra": 0.6},
                          "velachery": {"drain": 0.2, "infra": 0.4}, "anna_nagar": {"drain": 0.5, "infra": 0.7},
                          "porur": {"drain": 0.3, "infra": 0.5}, "tambaram": {"drain": 0.3, "infra": 0.4}}},
    "kolkata": {"rain": 4.0, "temp": 32, "aqi": 150, "hum": 72, "wind": 14, "vis": 6.0,
                "flood": 0.7, "cyclone": 0.5, "pollution": 0.6, "fog": 0.4, "pop": 0.85,
                "zones": {"salt_lake": {"drain": 0.5, "infra": 0.7}, "howrah": {"drain": 0.2, "infra": 0.3},
                          "new_town": {"drain": 0.7, "infra": 0.8}, "park_street": {"drain": 0.4, "infra": 0.6},
                          "jadavpur": {"drain": 0.3, "infra": 0.5}, "dum_dum": {"drain": 0.3, "infra": 0.4}}},
    "pune": {"rain": 2.5, "temp": 30, "aqi": 85, "hum": 55, "wind": 11, "vis": 8.5,
             "flood": 0.4, "cyclone": 0.0, "pollution": 0.3, "fog": 0.2, "pop": 0.7,
             "zones": {"hinjewadi": {"drain": 0.6, "infra": 0.8}, "kothrud": {"drain": 0.5, "infra": 0.7},
                       "hadapsar": {"drain": 0.4, "infra": 0.5}, "viman_nagar": {"drain": 0.5, "infra": 0.7},
                       "wakad": {"drain": 0.6, "infra": 0.7}, "pimpri": {"drain": 0.4, "infra": 0.5}}},
    "ahmedabad": {"rain": 1.5, "temp": 36, "aqi": 130, "hum": 40, "wind": 13, "vis": 7.0,
                  "flood": 0.3, "cyclone": 0.2, "pollution": 0.5, "fog": 0.3, "pop": 0.7,
                  "zones": {"sg_highway": {"drain": 0.6, "infra": 0.8}, "maninagar": {"drain": 0.3, "infra": 0.4},
                            "satellite": {"drain": 0.5, "infra": 0.7}, "bopal": {"drain": 0.6, "infra": 0.7}}},
    "jaipur": {"rain": 1.2, "temp": 37, "aqi": 140, "hum": 35, "wind": 15, "vis": 7.5,
               "flood": 0.2, "cyclone": 0.0, "pollution": 0.5, "fog": 0.4, "pop": 0.6,
               "zones": {"malviya_nagar": {"drain": 0.5, "infra": 0.6}, "vaishali_nagar": {"drain": 0.5, "infra": 0.7},
                         "mansarovar": {"drain": 0.4, "infra": 0.5}, "tonk_road": {"drain": 0.3, "infra": 0.4}}},
    "lucknow": {"rain": 1.8, "temp": 34, "aqi": 180, "hum": 50, "wind": 10, "vis": 5.5,
                "flood": 0.3, "cyclone": 0.0, "pollution": 0.7, "fog": 0.7, "pop": 0.65,
                "zones": {"gomti_nagar": {"drain": 0.5, "infra": 0.7}, "hazratganj": {"drain": 0.3, "infra": 0.5},
                          "aliganj": {"drain": 0.4, "infra": 0.5}, "indira_nagar": {"drain": 0.5, "infra": 0.6}}},
    "chandigarh": {"rain": 1.5, "temp": 32, "aqi": 130, "hum": 48, "wind": 12, "vis": 6.0,
                   "flood": 0.2, "cyclone": 0.0, "pollution": 0.5, "fog": 0.7, "pop": 0.5,
                   "zones": {"sector_17": {"drain": 0.7, "infra": 0.9}, "sector_35": {"drain": 0.7, "infra": 0.8},
                             "mohali": {"drain": 0.5, "infra": 0.6}, "panchkula": {"drain": 0.5, "infra": 0.7}}},
    "bhopal": {"rain": 2.0, "temp": 33, "aqi": 110, "hum": 50, "wind": 10, "vis": 7.5,
               "flood": 0.3, "cyclone": 0.0, "pollution": 0.4, "fog": 0.3, "pop": 0.5,
               "zones": {"mp_nagar": {"drain": 0.5, "infra": 0.6}, "arera_colony": {"drain": 0.5, "infra": 0.7},
                         "habibganj": {"drain": 0.4, "infra": 0.5}}},
    "indore": {"rain": 1.8, "temp": 34, "aqi": 100, "hum": 45, "wind": 11, "vis": 8.0,
               "flood": 0.2, "cyclone": 0.0, "pollution": 0.3, "fog": 0.2, "pop": 0.55,
               "zones": {"vijay_nagar": {"drain": 0.6, "infra": 0.8}, "palasia": {"drain": 0.4, "infra": 0.5},
                         "sapna_sangeeta": {"drain": 0.5, "infra": 0.6}}},
    "nagpur": {"rain": 2.2, "temp": 35, "aqi": 110, "hum": 45, "wind": 10, "vis": 7.5,
               "flood": 0.3, "cyclone": 0.0, "pollution": 0.4, "fog": 0.3, "pop": 0.55,
               "zones": {"dharampeth": {"drain": 0.5, "infra": 0.6}, "sadar": {"drain": 0.4, "infra": 0.5},
                         "sitabuldi": {"drain": 0.3, "infra": 0.5}}},
    "patna": {"rain": 2.5, "temp": 33, "aqi": 170, "hum": 60, "wind": 10, "vis": 5.5,
              "flood": 0.6, "cyclone": 0.1, "pollution": 0.7, "fog": 0.6, "pop": 0.65,
              "zones": {"boring_road": {"drain": 0.3, "infra": 0.4}, "kankarbagh": {"drain": 0.3, "infra": 0.4},
                        "patliputra": {"drain": 0.4, "infra": 0.5}}},
    "bhubaneswar": {"rain": 3.5, "temp": 32, "aqi": 85, "hum": 65, "wind": 15, "vis": 7.0,
                    "flood": 0.6, "cyclone": 0.7, "pollution": 0.2, "fog": 0.1, "pop": 0.5,
                    "zones": {"saheed_nagar": {"drain": 0.5, "infra": 0.6}, "patia": {"drain": 0.5, "infra": 0.7},
                              "jaydev_vihar": {"drain": 0.4, "infra": 0.6}}},
    "kochi": {"rain": 4.5, "temp": 30, "aqi": 65, "hum": 78, "wind": 14, "vis": 7.5,
              "flood": 0.7, "cyclone": 0.3, "pollution": 0.1, "fog": 0.1, "pop": 0.55,
              "zones": {"edappally": {"drain": 0.4, "infra": 0.6}, "kakkanad": {"drain": 0.5, "infra": 0.7},
                        "fort_kochi": {"drain": 0.3, "infra": 0.5}}},
    "thiruvananthapuram": {"rain": 4.0, "temp": 30, "aqi": 60, "hum": 75, "wind": 13, "vis": 8.0,
                           "flood": 0.5, "cyclone": 0.2, "pollution": 0.1, "fog": 0.1, "pop": 0.5,
                           "zones": {"technopark": {"drain": 0.6, "infra": 0.8}, "kowdiar": {"drain": 0.5, "infra": 0.6},
                                     "kazhakkoottam": {"drain": 0.5, "infra": 0.7}}},
    "coimbatore": {"rain": 1.5, "temp": 31, "aqi": 70, "hum": 55, "wind": 11, "vis": 9.0,
                   "flood": 0.2, "cyclone": 0.1, "pollution": 0.2, "fog": 0.1, "pop": 0.5,
                   "zones": {"rs_puram": {"drain": 0.5, "infra": 0.7}, "gandhipuram": {"drain": 0.4, "infra": 0.5},
                             "peelamedu": {"drain": 0.5, "infra": 0.6}}},
    "visakhapatnam": {"rain": 3.5, "temp": 32, "aqi": 75, "hum": 70, "wind": 16, "vis": 7.0,
                      "flood": 0.5, "cyclone": 0.6, "pollution": 0.2, "fog": 0.1, "pop": 0.55,
                      "zones": {"mvp_colony": {"drain": 0.5, "infra": 0.6}, "madhurawada": {"drain": 0.5, "infra": 0.7},
                                "gajuwaka": {"drain": 0.3, "infra": 0.4}}},
    "surat": {"rain": 2.5, "temp": 34, "aqi": 110, "hum": 60, "wind": 14, "vis": 7.0,
              "flood": 0.5, "cyclone": 0.3, "pollution": 0.4, "fog": 0.2, "pop": 0.65,
              "zones": {"adajan": {"drain": 0.5, "infra": 0.7}, "vesu": {"drain": 0.6, "infra": 0.7},
                        "varachha": {"drain": 0.3, "infra": 0.4}}},
    "vadodara": {"rain": 2.0, "temp": 35, "aqi": 100, "hum": 50, "wind": 12, "vis": 7.5,
                 "flood": 0.3, "cyclone": 0.1, "pollution": 0.3, "fog": 0.2, "pop": 0.5,
                 "zones": {"alkapuri": {"drain": 0.6, "infra": 0.8}, "sayajigunj": {"drain": 0.4, "infra": 0.5},
                           "manjalpur": {"drain": 0.4, "infra": 0.5}}},
    "rajkot": {"rain": 1.2, "temp": 36, "aqi": 95, "hum": 40, "wind": 15, "vis": 8.0,
               "flood": 0.2, "cyclone": 0.2, "pollution": 0.3, "fog": 0.2, "pop": 0.45,
               "zones": {"kalawad_road": {"drain": 0.5, "infra": 0.6}, "university_road": {"drain": 0.5, "infra": 0.7}}},
    "kanpur": {"rain": 1.5, "temp": 35, "aqi": 200, "hum": 50, "wind": 10, "vis": 5.0,
               "flood": 0.3, "cyclone": 0.0, "pollution": 0.8, "fog": 0.7, "pop": 0.6,
               "zones": {"swaroop_nagar": {"drain": 0.3, "infra": 0.4}, "kakadeo": {"drain": 0.4, "infra": 0.5},
                         "civil_lines": {"drain": 0.4, "infra": 0.5}}},
    "varanasi": {"rain": 1.8, "temp": 34, "aqi": 190, "hum": 55, "wind": 10, "vis": 5.5,
                 "flood": 0.4, "cyclone": 0.0, "pollution": 0.7, "fog": 0.6, "pop": 0.6,
                 "zones": {"sigra": {"drain": 0.3, "infra": 0.4}, "lanka": {"drain": 0.3, "infra": 0.5},
                           "bhelupur": {"drain": 0.3, "infra": 0.4}}},
    "agra": {"rain": 1.2, "temp": 36, "aqi": 180, "hum": 45, "wind": 12, "vis": 5.5,
             "flood": 0.2, "cyclone": 0.0, "pollution": 0.6, "fog": 0.6, "pop": 0.55,
             "zones": {"taj_nagri": {"drain": 0.3, "infra": 0.4}, "sikandra": {"drain": 0.4, "infra": 0.5}}},
    "noida": {"rain": 1.5, "temp": 35, "aqi": 210, "hum": 48, "wind": 12, "vis": 5.0,
              "flood": 0.3, "cyclone": 0.0, "pollution": 0.85, "fog": 0.7, "pop": 0.75,
              "zones": {"sector_62": {"drain": 0.6, "infra": 0.8}, "sector_18": {"drain": 0.5, "infra": 0.7},
                        "greater_noida": {"drain": 0.6, "infra": 0.7}}},
    "gurgaon": {"rain": 1.5, "temp": 36, "aqi": 200, "hum": 45, "wind": 13, "vis": 5.0,
                "flood": 0.4, "cyclone": 0.0, "pollution": 0.8, "fog": 0.7, "pop": 0.75,
                "zones": {"cyber_city": {"drain": 0.6, "infra": 0.8}, "sohna_road": {"drain": 0.4, "infra": 0.6},
                          "mg_road": {"drain": 0.5, "infra": 0.7}, "sector_56": {"drain": 0.5, "infra": 0.6}}},
    "dehradun": {"rain": 2.5, "temp": 28, "aqi": 90, "hum": 55, "wind": 10, "vis": 8.0,
                 "flood": 0.4, "cyclone": 0.0, "pollution": 0.3, "fog": 0.4, "pop": 0.4,
                 "zones": {"rajpur_road": {"drain": 0.4, "infra": 0.6}, "clock_tower": {"drain": 0.3, "infra": 0.4}}},
    "guwahati": {"rain": 4.0, "temp": 29, "aqi": 80, "hum": 70, "wind": 12, "vis": 7.0,
                 "flood": 0.6, "cyclone": 0.1, "pollution": 0.2, "fog": 0.3, "pop": 0.5,
                 "zones": {"zoo_road": {"drain": 0.3, "infra": 0.5}, "ganeshguri": {"drain": 0.4, "infra": 0.6},
                           "paltan_bazaar": {"drain": 0.3, "infra": 0.4}}},
    "ranchi": {"rain": 2.5, "temp": 30, "aqi": 95, "hum": 55, "wind": 10, "vis": 7.5,
               "flood": 0.3, "cyclone": 0.0, "pollution": 0.3, "fog": 0.3, "pop": 0.4,
               "zones": {"main_road": {"drain": 0.4, "infra": 0.5}, "doranda": {"drain": 0.4, "infra": 0.5}}},
    "raipur": {"rain": 2.2, "temp": 34, "aqi": 100, "hum": 50, "wind": 10, "vis": 7.5,
               "flood": 0.3, "cyclone": 0.0, "pollution": 0.3, "fog": 0.3, "pop": 0.45,
               "zones": {"shankar_nagar": {"drain": 0.4, "infra": 0.5}, "pandri": {"drain": 0.3, "infra": 0.4}}},
    "mysore": {"rain": 1.8, "temp": 28, "aqi": 65, "hum": 55, "wind": 10, "vis": 9.0,
               "flood": 0.2, "cyclone": 0.0, "pollution": 0.1, "fog": 0.1, "pop": 0.4,
               "zones": {"vijayanagar": {"drain": 0.5, "infra": 0.7}, "gokulam": {"drain": 0.5, "infra": 0.6}}},
    "mangalore": {"rain": 4.0, "temp": 30, "aqi": 60, "hum": 75, "wind": 14, "vis": 7.5,
                  "flood": 0.5, "cyclone": 0.3, "pollution": 0.1, "fog": 0.1, "pop": 0.45,
                  "zones": {"kadri": {"drain": 0.4, "infra": 0.6}, "hampankatta": {"drain": 0.3, "infra": 0.5}}},
    "madurai": {"rain": 1.5, "temp": 34, "aqi": 80, "hum": 58, "wind": 12, "vis": 8.0,
                "flood": 0.3, "cyclone": 0.2, "pollution": 0.2, "fog": 0.1, "pop": 0.5,
                "zones": {"anna_nagar": {"drain": 0.4, "infra": 0.6}, "kk_nagar": {"drain": 0.4, "infra": 0.5}}},
    "tiruchirappalli": {"rain": 1.8, "temp": 34, "aqi": 75, "hum": 60, "wind": 11, "vis": 8.0,
                        "flood": 0.3, "cyclone": 0.2, "pollution": 0.2, "fog": 0.1, "pop": 0.45,
                        "zones": {"srirangam": {"drain": 0.4, "infra": 0.5}, "thillai_nagar": {"drain": 0.4, "infra": 0.6}}},
    "jodhpur": {"rain": 0.8, "temp": 38, "aqi": 120, "hum": 30, "wind": 16, "vis": 7.0,
                "flood": 0.1, "cyclone": 0.0, "pollution": 0.4, "fog": 0.3, "pop": 0.4,
                "zones": {"paota": {"drain": 0.4, "infra": 0.5}, "sardarpura": {"drain": 0.4, "infra": 0.5}}},
    "udaipur": {"rain": 1.2, "temp": 34, "aqi": 90, "hum": 40, "wind": 12, "vis": 8.0,
                "flood": 0.2, "cyclone": 0.0, "pollution": 0.3, "fog": 0.2, "pop": 0.35,
                "zones": {"fatehpura": {"drain": 0.4, "infra": 0.5}, "hiran_magri": {"drain": 0.5, "infra": 0.6}}},
    "goa": {"rain": 4.0, "temp": 30, "aqi": 55, "hum": 72, "wind": 14, "vis": 8.0,
            "flood": 0.4, "cyclone": 0.2, "pollution": 0.1, "fog": 0.1, "pop": 0.35,
            "zones": {"panaji": {"drain": 0.5, "infra": 0.6}, "margao": {"drain": 0.4, "infra": 0.5},
                      "vasco": {"drain": 0.4, "infra": 0.5}}},
    "jammu": {"rain": 1.5, "temp": 30, "aqi": 100, "hum": 50, "wind": 10, "vis": 7.0,
              "flood": 0.3, "cyclone": 0.0, "pollution": 0.3, "fog": 0.5, "pop": 0.35,
              "zones": {"gandhi_nagar": {"drain": 0.4, "infra": 0.5}, "residency_road": {"drain": 0.3, "infra": 0.5}}},
    "amritsar": {"rain": 1.5, "temp": 33, "aqi": 140, "hum": 50, "wind": 12, "vis": 6.0,
                 "flood": 0.2, "cyclone": 0.0, "pollution": 0.5, "fog": 0.7, "pop": 0.5,
                 "zones": {"lawrence_road": {"drain": 0.4, "infra": 0.5}, "ranjit_avenue": {"drain": 0.5, "infra": 0.6}}},
    "ludhiana": {"rain": 1.5, "temp": 34, "aqi": 160, "hum": 50, "wind": 11, "vis": 5.5,
                 "flood": 0.2, "cyclone": 0.0, "pollution": 0.6, "fog": 0.7, "pop": 0.55,
                 "zones": {"model_town": {"drain": 0.5, "infra": 0.6}, "sarabha_nagar": {"drain": 0.5, "infra": 0.6}}},
    "nashik": {"rain": 2.0, "temp": 31, "aqi": 85, "hum": 50, "wind": 10, "vis": 8.0,
               "flood": 0.3, "cyclone": 0.0, "pollution": 0.3, "fog": 0.2, "pop": 0.45,
               "zones": {"college_road": {"drain": 0.4, "infra": 0.6}, "gangapur_road": {"drain": 0.5, "infra": 0.6}}},
    "aurangabad": {"rain": 1.5, "temp": 33, "aqi": 90, "hum": 48, "wind": 11, "vis": 8.0,
                   "flood": 0.2, "cyclone": 0.0, "pollution": 0.3, "fog": 0.2, "pop": 0.45,
                   "zones": {"cidco": {"drain": 0.5, "infra": 0.6}, "jalna_road": {"drain": 0.4, "infra": 0.5}}},
    "thane": {"rain": 4.5, "temp": 31, "aqi": 110, "hum": 72, "wind": 16, "vis": 6.5,
              "flood": 0.7, "cyclone": 0.3, "pollution": 0.4, "fog": 0.1, "pop": 0.8,
              "zones": {"ghodbunder_road": {"drain": 0.4, "infra": 0.6}, "majiwada": {"drain": 0.3, "infra": 0.5},
                        "kasarvadavali": {"drain": 0.4, "infra": 0.5}}},
    "navi_mumbai": {"rain": 4.5, "temp": 31, "aqi": 105, "hum": 72, "wind": 16, "vis": 6.5,
                    "flood": 0.6, "cyclone": 0.3, "pollution": 0.4, "fog": 0.1, "pop": 0.7,
                    "zones": {"vashi": {"drain": 0.6, "infra": 0.8}, "kharghar": {"drain": 0.6, "infra": 0.7},
                              "belapur": {"drain": 0.5, "infra": 0.7}}},
}

PLATFORMS = ["zomato", "swiggy", "zepto", "blinkit", "dunzo", "amazon", "flipkart", "bigbasket"]

# Monsoon months per region
MONSOON_MONTHS = {
    "south_west": [6, 7, 8, 9],    # Most of India
    "north_east": [10, 11, 12],      # Tamil Nadu, SE coast
    "winter_fog": [11, 12, 1, 2],    # North India
    "summer_heat": [4, 5, 6],        # North/Central India
}


def get_city_profile(city: str) -> dict:
    """Get city profile with fallback to default."""
    key = city.lower().replace(" ", "_")
    if key in CITY_PROFILES:
        return CITY_PROFILES[key]
    return {"rain": 2.0, "temp": 30, "aqi": 100, "hum": 55, "wind": 12, "vis": 7.0,
            "flood": 0.3, "cyclone": 0.1, "pollution": 0.3, "fog": 0.2, "pop": 0.5,
            "zones": {"default": {"drain": 0.5, "infra": 0.6}}}


def get_zone_data(city: str, zone: str) -> dict:
    """Get zone-specific drainage and infrastructure data."""
    profile = get_city_profile(city)
    zone_key = zone.lower().replace(" ", "_")
    zones = profile.get("zones", {})
    return zones.get(zone_key, zones.get("default", {"drain": 0.5, "infra": 0.6}))


def generate_synthetic_data(n_samples: int = 50000, seed: int = 42) -> pd.DataFrame:
    """
    Generate synthetic actuarial training data for the ML model.
    Each row = one weekly insurance scenario with realistic weather/location/worker features
    and calculated expected loss ratio as the target.
    """
    np.random.seed(seed)
    random.seed(seed)

    cities = list(CITY_PROFILES.keys())
    rows = []

    for _ in range(n_samples):
        # Pick random city and zone
        city = random.choice(cities)
        profile = CITY_PROFILES[city]
        zone_keys = list(profile["zones"].keys())
        zone = random.choice(zone_keys)
        zone_data = profile["zones"][zone]

        # Random month and hour
        month = random.randint(1, 12)
        hour = random.randint(6, 22)
        day_of_week = random.randint(0, 6)

        # Generate realistic weather for this city/month
        is_monsoon = month in [6, 7, 8, 9]
        is_winter = month in [11, 12, 1, 2]
        is_summer = month in [4, 5]

        monsoon_mult = 3.0 if (is_monsoon and profile["flood"] > 0.4) else 1.0
        winter_mult = 1.5 if (is_winter and profile["fog"] > 0.3) else 1.0

        rain = max(0, np.random.exponential(profile["rain"] * monsoon_mult) + np.random.normal(0, 1))
        temp = profile["temp"] + np.random.normal(0, 4) + (5 if is_summer else (-3 if is_winter else 0))
        aqi = max(20, profile["aqi"] * (1.8 if is_winter and profile["pollution"] > 0.5 else 1.0) + np.random.normal(0, 40))
        wind = max(2, profile["wind"] + np.random.normal(0, 5) + (8 if profile["cyclone"] > 0.3 and is_monsoon else 0))
        humidity = max(15, min(98, profile["hum"] + np.random.normal(0, 12) + (15 if is_monsoon else 0)))
        uv = max(1, min(12, 6 + np.random.normal(0, 2) + (3 if is_summer else -1)))
        visibility = max(0.2, profile["vis"] - abs(np.random.normal(0, 2)) - (3 if is_winter and profile["fog"] > 0.3 else 0))

        # Worker profile
        daily_income = random.choice(range(300, 1500, 50))
        working_hours = random.choice([6, 7, 8, 9, 10])
        experience_days = random.randint(7, 730)
        no_claim_streak = random.randint(0, 26)
        claims_30d = max(0, int(np.random.exponential(1.5)))
        platform_idx = random.randint(0, len(PLATFORMS) - 1)

        drainage = zone_data["drain"]
        infra = zone_data["infra"]

        # ─── Calculate expected loss (target variable) ───
        # This simulates actuarial loss modeling
        loss_score = 0.0

        # Rain impact
        if rain > 20: loss_score += 0.35
        elif rain > 10: loss_score += 0.20
        elif rain > 5: loss_score += 0.08

        # Temperature extremes
        if temp > 45: loss_score += 0.30
        elif temp > 42: loss_score += 0.20
        elif temp > 40: loss_score += 0.10
        if temp < 5: loss_score += 0.20

        # AQI
        if aqi > 300: loss_score += 0.25
        elif aqi > 200: loss_score += 0.12
        elif aqi > 150: loss_score += 0.05

        # Wind
        if wind > 50: loss_score += 0.25
        elif wind > 35: loss_score += 0.12

        # Visibility
        if visibility < 0.5: loss_score += 0.30
        elif visibility < 1.0: loss_score += 0.15
        elif visibility < 2.0: loss_score += 0.05

        # Flood risk (rain × drainage)
        flood_risk = (rain / 30.0) * (1.0 - drainage) if rain > 5 else 0
        loss_score += min(0.3, flood_risk)

        # Cyclone risk
        if profile["cyclone"] > 0.3 and wind > 45 and rain > 15:
            loss_score += 0.3

        # Humidity + heat compound
        if humidity > 85 and temp > 35:
            loss_score += 0.10

        # Infrastructure quality reduces risk
        loss_score *= (1.0 - infra * 0.3)

        # Seasonal adjustment
        seasonal = 1.0
        if is_monsoon and profile["flood"] > 0.4: seasonal = 1.4
        elif is_winter and profile["fog"] > 0.3: seasonal = 1.2
        elif is_summer and temp > 38: seasonal = 1.15
        loss_score *= seasonal

        # Population density increases risk slightly
        loss_score *= (1.0 + profile["pop"] * 0.15)

        # Clip and add noise
        loss_score = min(0.95, max(0.01, loss_score + np.random.normal(0, 0.02)))

        # Convert to premium rate (actuarial pricing: premium = expected_loss × (1 + loading_factor))
        loading_factor = 0.35  # 35% margin for admin + profit
        premium_rate = loss_score * (1 + loading_factor) * 0.10  # Scale to reasonable % of income

        # No-claim discount effect
        ncd = max(0.75, 1.0 - no_claim_streak * 0.01)
        premium_rate *= ncd

        # Experience discount
        exp_factor = max(0.90, 1.0 - experience_days / 3650)
        premium_rate *= exp_factor

        premium_rate = max(0.005, min(0.15, premium_rate))

        # Temporal features
        month_sin = math.sin(2 * math.pi * month / 12)
        month_cos = math.cos(2 * math.pi * month / 12)
        hour_sin = math.sin(2 * math.pi * hour / 24)
        hour_cos = math.cos(2 * math.pi * hour / 24)
        is_weekend = 1 if day_of_week >= 5 else 0

        rows.append({
            "rain_mm_hr": round(rain, 2),
            "temperature_c": round(temp, 1),
            "aqi": round(aqi, 0),
            "wind_kmh": round(wind, 1),
            "humidity_pct": round(humidity, 0),
            "uv_index": round(uv, 1),
            "visibility_km": round(visibility, 1),
            "drainage_quality": drainage,
            "infra_quality": infra,
            "zone_base_risk": profile["flood"] * 0.3 + profile["cyclone"] * 0.2 + profile["pollution"] * 0.2 + profile["fog"] * 0.15 + profile["pop"] * 0.15,
            "population_density": profile["pop"],
            "month_sin": round(month_sin, 4),
            "month_cos": round(month_cos, 4),
            "hour_sin": round(hour_sin, 4),
            "hour_cos": round(hour_cos, 4),
            "is_weekend": is_weekend,
            "daily_income": daily_income,
            "working_hours": working_hours,
            "experience_days": experience_days,
            "no_claim_streak": no_claim_streak,
            "claims_30d": claims_30d,
            "platform_idx": platform_idx,
            "premium_rate": round(premium_rate, 6),
        })

    return pd.DataFrame(rows)


FEATURE_COLS = [
    "rain_mm_hr", "temperature_c", "aqi", "wind_kmh", "humidity_pct",
    "uv_index", "visibility_km", "drainage_quality", "infra_quality",
    "zone_base_risk", "population_density", "month_sin", "month_cos",
    "hour_sin", "hour_cos", "is_weekend", "daily_income", "working_hours",
    "experience_days", "no_claim_streak", "claims_30d", "platform_idx",
]


class DownTimePricingModel:
    """ML-powered dynamic pricing model for parametric insurance."""

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.fraud_detector = None
        self.feature_importances = {}
        self.cv_score = 0.0
        self.is_trained = False

    def train(self):
        """Train the pricing model on synthetic actuarial data."""
        print("[ML] Generating 50,000 synthetic training scenarios...")
        df = generate_synthetic_data(n_samples=50000)

        X = df[FEATURE_COLS].values
        y = df["premium_rate"].values

        # Scale features
        X_scaled = self.scaler.fit_transform(X)

        # Train GradientBoosting
        print("[ML] Training GradientBoostingRegressor (500 trees, depth=6)...")
        self.model = GradientBoostingRegressor(
            n_estimators=500,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            min_samples_split=10,
            min_samples_leaf=5,
            random_state=42,
        )
        self.model.fit(X_scaled, y)

        # Cross-validation
        print("[ML] Running 5-fold cross-validation...")
        cv_scores = cross_val_score(self.model, X_scaled, y, cv=5, scoring="r2")
        self.cv_score = float(np.mean(cv_scores))
        print(f"[ML] CV R² = {self.cv_score:.4f} (±{np.std(cv_scores):.4f})")

        # Feature importances
        importances = self.model.feature_importances_
        self.feature_importances = {
            FEATURE_COLS[i]: round(float(importances[i]), 4)
            for i in range(len(FEATURE_COLS))
        }
        sorted_feats = sorted(self.feature_importances.items(), key=lambda x: -x[1])
        print("[ML] Top 10 features:")
        for name, imp in sorted_feats[:10]:
            print(f"  {name}: {imp:.4f}")

        # Train fraud detector (Isolation Forest)
        print("[ML] Training Isolation Forest for fraud detection...")
        self.fraud_detector = IsolationForest(
            n_estimators=200,
            contamination=0.05,
            random_state=42,
        )
        self.fraud_detector.fit(X_scaled)

        self.is_trained = True
        print("[ML] Model training complete!")

    def predict_premium(self, features: dict) -> dict:
        """
        Predict the optimal weekly premium for a given set of features.
        Returns premium rate and full breakdown.
        """
        if not self.is_trained:
            self.train()

        # Build feature vector
        city = features.get("city", "delhi")
        zone = features.get("zone", "default")
        profile = get_city_profile(city)
        zone_data = get_zone_data(city, zone)
        month = features.get("month", datetime.now().month)
        hour = features.get("hour", datetime.now().hour)

        feature_vector = {
            "rain_mm_hr": features.get("rain_mm_hr", 0),
            "temperature_c": features.get("temperature_c", 30),
            "aqi": features.get("aqi", 100),
            "wind_kmh": features.get("wind_kmh", 10),
            "humidity_pct": features.get("humidity_pct", 50),
            "uv_index": features.get("uv_index", 5),
            "visibility_km": features.get("visibility_km", 8),
            "drainage_quality": zone_data.get("drain", 0.5),
            "infra_quality": zone_data.get("infra", 0.6),
            "zone_base_risk": profile.get("flood", 0.3) * 0.3 + profile.get("cyclone", 0.1) * 0.2 + profile.get("pollution", 0.3) * 0.2 + profile.get("fog", 0.2) * 0.15 + profile.get("pop", 0.5) * 0.15,
            "population_density": profile.get("pop", 0.5),
            "month_sin": round(math.sin(2 * math.pi * month / 12), 4),
            "month_cos": round(math.cos(2 * math.pi * month / 12), 4),
            "hour_sin": round(math.sin(2 * math.pi * hour / 24), 4),
            "hour_cos": round(math.cos(2 * math.pi * hour / 24), 4),
            "is_weekend": 1 if datetime.now().weekday() >= 5 else 0,
            "daily_income": features.get("daily_income", 500),
            "working_hours": features.get("working_hours", 8),
            "experience_days": features.get("experience_days", 30),
            "no_claim_streak": features.get("no_claim_streak", 0),
            "claims_30d": features.get("claims_30d", 0),
            "platform_idx": PLATFORMS.index(features.get("platform", "zomato").lower()) if features.get("platform", "zomato").lower() in PLATFORMS else 0,
        }

        X = np.array([[feature_vector[col] for col in FEATURE_COLS]])
        X_scaled = self.scaler.transform(X)

        predicted_rate = float(self.model.predict(X_scaled)[0])
        predicted_rate = max(0.005, min(0.15, predicted_rate))

        daily_income = features.get("daily_income", 500)
        coverage_pct = features.get("coverage_pct", 0.7)
        weekly_income = daily_income * 7
        coverage_limit = weekly_income * coverage_pct

        weekly_premium = round(coverage_limit * predicted_rate, 2)
        weekly_premium = max(15, min(600, weekly_premium))

        # Anomaly score for this scenario
        anomaly_score = float(self.fraud_detector.decision_function(X_scaled)[0])

        return {
            "weekly_premium": weekly_premium,
            "premium_rate": round(predicted_rate, 6),
            "weekly_income": weekly_income,
            "coverage_limit": round(coverage_limit, 2),
            "coverage_pct": coverage_pct,
            "risk_factors": feature_vector,
            "feature_importances": self.feature_importances,
            "model_confidence": round(self.cv_score, 4),
            "anomaly_score": round(anomaly_score, 4),
            "model_type": "GradientBoostingRegressor",
            "training_samples": 50000,
            "n_features": len(FEATURE_COLS),
        }

    def detect_fraud_anomaly(self, features: dict) -> dict:
        """Use Isolation Forest to detect anomalous claim patterns."""
        if not self.is_trained:
            self.train()

        X = np.array([[features.get(col, 0) for col in FEATURE_COLS]])
        X_scaled = self.scaler.transform(X)

        prediction = int(self.fraud_detector.predict(X_scaled)[0])
        score = float(self.fraud_detector.decision_function(X_scaled)[0])

        return {
            "is_anomaly": prediction == -1,
            "anomaly_score": round(score, 4),
            "confidence": round(abs(score), 4),
        }

    def get_model_info(self) -> dict:
        """Return model metadata."""
        return {
            "is_trained": self.is_trained,
            "model_type": "GradientBoostingRegressor" if self.model else None,
            "cv_r2_score": round(self.cv_score, 4) if self.is_trained else None,
            "n_features": len(FEATURE_COLS),
            "feature_names": FEATURE_COLS,
            "feature_importances": self.feature_importances if self.is_trained else None,
            "training_samples": 50000,
            "n_cities": len(CITY_PROFILES),
            "cities": list(CITY_PROFILES.keys()),
            "fraud_detector": "IsolationForest" if self.fraud_detector else None,
        }


# Singleton instance
pricing_model = DownTimePricingModel()
