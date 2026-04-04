"use client";

import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, ChevronRight, Activity, CloudRain, MapPin, IndianRupee, AlertCircle, History, User, Home as HomeIcon, LogOut, Zap, Wind, Droplets, Sun, Eye, Waves, CloudLightning, Thermometer, Clock, UserPlus, Phone, Briefcase, Play } from "lucide-react";
import { api } from "@/lib/axios";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

interface PremiumResponse {
  weeklyPremium: number;
  coverageLimit: number;
  riskScore: number;
  riskLabel: string;
  riskBreakdown: {
    weather_risk: number;
    location_risk: number;
    seasonal_risk: number;
    historical_risk: number;
    wind_risk: number;
    humidity_risk: number;
    uv_risk: number;
    visibility_risk: number;
    flood_risk: number;
    cyclone_risk: number;
    time_of_day_risk: number;
  };
  premiumBreakdown: {
    baseComponent: number;
    riskMultiplier: number;
    seasonalAdjustment: number;
    coverageFactor: number;
    noclaimDiscount: number;
  };
}

interface WorkerProfile {
  id: string;
  name: string;
  phone: string;
  city: string;
  zone: string;
  platform: string;
  dailyIncome: number;
}

interface Policy {
  id: string;
  workerId: string;
  coveragePct: number;
  weeklyPremium: number;
  startDate: string;
  status: string;
  coverageLimit: number;
  remainingLimit: number;
  weekEndDate: string;
}

interface Claim {
  id: string;
  policyId: string;
  amount: number;
  status: string;
  createdAt: string;
  eventDate: string;
  triggerType: string;
  hoursLost: number;
  finalPayout: number;
}

interface DashboardData {
  activePolicy: Policy | null;
  claims: Claim[];
  worker: WorkerProfile;
  activeEvent?: {
    triggerType: string;
    city: string;
    zone: string;
    startTime: string;
    value: number;
  };
  stats: {
    totalPayouts: number;
    protectedDays: number;
    activeTriggers: number;
    coverageUtilization: number;
  };
}

interface AdminData {
  activePolicies: number;
  totalPremiumsThisWeek: number;
  totalPayoutsThisWeek: number;
  lossRatio: number;
  totalWorkers: number;
  flaggedClaims: number;
  weeklyClaimsCount: number;
  profitability: number;
  triggerDistribution: Record<string, number>;
}

// 45 Indian cities
const CITIES: Record<string, string[]> = {
  hyderabad: ["Kondapur", "Hitech City", "Secunderabad", "Gachibowli", "Madhapur"],
  mumbai: ["Dharavi", "Bandra", "Andheri", "Powai", "Dadar"],
  bangalore: ["Whitefield", "Koramangala", "Indiranagar", "HSR Layout"],
  delhi: ["Connaught Place", "Dwarka", "Rohini", "Saket"],
  chennai: ["T. Nagar", "Anna Nagar", "Adyar"],
  kolkata: ["Salt Lake", "Park Street", "Howrah"],
  pune: ["Kothrud", "Hinjewadi", "Viman Nagar"],
  ahmedabad: ["SG Highway", "Navrangpura", "Maninagar"],
  jaipur: ["Malviya Nagar", "Vaishali Nagar", "C-Scheme"],
  lucknow: ["Hazratganj", "Gomti Nagar", "Aminabad"],
  surat: ["Adajan", "Vesu", "Athwa"],
  kanpur: ["Civil Lines", "Swaroop Nagar"],
  nagpur: ["Sitabuldi", "Dharampeth"],
  indore: ["Vijay Nagar", "Palasia"],
  thane: ["Ghodbunder Road", "Hiranandani"],
  bhopal: ["Arera Colony", "MP Nagar"],
  visakhapatnam: ["MVP Colony", "Dwaraka Nagar"],
  patna: ["Boring Road", "Kankarbagh"],
  vadodara: ["Alkapuri", "Sayajigunj"],
  ghaziabad: ["Indirapuram", "Vaishali"],
  ludhiana: ["Model Town", "Sarabha Nagar"],
  agra: ["Civil Lines", "Sanjay Place"],
  nashik: ["College Road", "Gangapur Road"],
  ranchi: ["Main Road", "Lalpur"],
  meerut: ["Shastri Nagar", "Pallavpuram"],
  rajkot: ["Race Course", "Kalawad Road"],
  varanasi: ["Lanka", "Sigra"],
  amritsar: ["Lawrence Road", "Ranjit Avenue"],
  allahabad: ["Civil Lines", "George Town"],
  coimbatore: ["RS Puram", "Gandhipuram"],
  madurai: ["Anna Nagar", "KK Nagar"],
  guwahati: ["Paltan Bazaar", "Zoo Road"],
  chandigarh: ["Sector 17", "Sector 35"],
  mysore: ["Vijayanagar", "Kuvempunagar"],
  trivandrum: ["Kowdiar", "Pattom"],
  kochi: ["MG Road", "Edappally"],
  dehradun: ["Rajpur Road", "Clock Tower"],
  jammu: ["Gandhi Nagar", "Residency Road"],
  jodhpur: ["Sardarpura", "Paota"],
  raipur: ["Shankar Nagar", "Pandri"],
  mangalore: ["Hampankatta", "Kadri"],
  noida: ["Sector 18", "Sector 62"],
  gurgaon: ["DLF Phase 1", "Cyber City", "Sohna Road"],
  faridabad: ["Sector 15", "NIT"],
  howrah: ["Shibpur", "Kadamtala"],
};

const TRIGGER_LABELS: Record<string, string> = {
  HEAVY_RAIN: "🌧️ Heavy Rain",
  TORRENTIAL_RAIN: "🌊 Torrential Rain",
  EXTREME_HEAT: "🔥 Extreme Heat",
  HEAT_ADVISORY: "🌡️ Heat Advisory",
  SEVERE_POLLUTION: "🏭 Severe Pollution",
  POOR_AIR_QUALITY: "😷 Poor Air Quality",
  HIGH_WIND: "💨 High Wind",
  WIND_ADVISORY: "🌬️ Wind Advisory",
  LOW_VISIBILITY: "🌫️ Low Visibility",
  FLOOD_WARNING: "🌊 Flood Warning",
  CYCLONE_ALERT: "🌀 Cyclone Alert",
  HEAT_INDEX_DANGER: "🥵 Heat Index Danger",
};

// Seeded Worker ID for mock-auth
const DEFAULT_WORKER_ID = "user-seed-123";

export default function Home() {
  const [view, setView] = useState<"register" | "quote" | "success" | "dashboard" | "profile" | "admin">("register");
  const [dailyIncome, setDailyIncome] = useState([700]);
  const [city, setCity] = useState("hyderabad");
  const [zone, setZone] = useState("Kondapur");
  const [coveragePct, setCoveragePct] = useState("0.70");
  const [workerId, setWorkerId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [premiumData, setPremiumData] = useState<PremiumResponse | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [fraudStats, setFraudStats] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  // Registration form
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCity, setRegCity] = useState("hyderabad");
  const [regZone, setRegZone] = useState("Kondapur");
  const [regPlatform, setRegPlatform] = useState("zomato");
  const [regIncome, setRegIncome] = useState([700]);

  // Check saved worker on mount
  useEffect(() => {
    const saved = localStorage.getItem("downtime_worker_id");
    if (saved) {
      setWorkerId(saved);
      setView("quote");
    }
  }, []);

  // Auto update zone when city changes
  useEffect(() => {
    setZone(CITIES[city as keyof typeof CITIES]?.[0] || "");
  }, [city]);
  useEffect(() => {
    setRegZone(CITIES[regCity as keyof typeof CITIES]?.[0] || "");
  }, [regCity]);

  // Registration handler
  const handleRegister = async () => {
    if (!regName || !regPhone) return;
    setLoading(true);
    try {
      const resp = await api.post("/api/workers/register", {
        name: regName,
        phone: regPhone,
        city: regCity,
        zone: regZone,
        platform: regPlatform,
        dailyIncome: regIncome[0],
      });
      const id = resp.data.id;
      setWorkerId(id);
      localStorage.setItem("downtime_worker_id", id);
      setCity(regCity);
      setZone(regZone);
      setDailyIncome(regIncome);
      setView("quote");
    } catch (err: any) {
      // If duplicate phone, try login
      try {
        const loginResp = await api.get(`/api/workers/phone/${regPhone}`);
        if (loginResp.data?.id) {
          setWorkerId(loginResp.data.id);
          localStorage.setItem("downtime_worker_id", loginResp.data.id);
          setCity(loginResp.data.city);
          setView("quote");
        }
      } catch { alert("Registration failed. Is the backend running?"); }
    } finally { setLoading(false); }
  };

  // Fetch premium calculation
  useEffect(() => {
    if (view !== "quote") return;
    const fetchPremium = async () => {
      setLoading(true);
      try {
        const response = await api.get("/api/premium/calculate", {
          params: { income: dailyIncome[0], city, zone, coverage: coveragePct },
        });
        setPremiumData(response.data);
      } catch (err) { console.error("Failed to fetch premium", err); }
      finally { setLoading(false); }
    };
    const delay = setTimeout(() => { fetchPremium(); }, 500);
    return () => clearTimeout(delay);
  }, [dailyIncome, city, zone, coveragePct, view]);

  // Fetch dashboard data
  const wid = workerId || DEFAULT_WORKER_ID;
  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/dashboard/worker/${wid}`);
      setDashboardData(response.data);
    } catch (err) { console.error("Failed to fetch dashboard", err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (view === "dashboard" || view === "profile") {
      fetchDashboard();
    } else if (view === "admin") {
      const fetchAll = async () => {
        setLoading(true);
        try {
          const [adminResp, trendResp, fraudResp] = await Promise.all([
            api.get("/api/dashboard/admin"),
            api.get("/api/dashboard/admin/trends").catch(() => ({ data: { daily: [] } })),
            api.get("/api/dashboard/admin/fraud-stats").catch(() => ({ data: null })),
          ]);
          setAdminData(adminResp.data);
          setTrendData(trendResp.data?.daily || []);
          setFraudStats(fraudResp.data);
        } catch (err) { console.error("Failed to fetch admin dashboard", err); }
        finally { setLoading(false); }
      };
      fetchAll();
    }
  }, [view]);

  // Simulate Disruption
  const handleSimulateDisruption = async () => {
    setSimulating(true);
    try {
      await api.post("/api/triggers/simulate", {
        city: dashboardData?.worker?.city || city,
        zone: dashboardData?.worker?.zone || zone,
        triggerType: "HEAVY_RAIN",
        value: 55,
      });
      await new Promise(r => setTimeout(r, 2000));
      await fetchDashboard();
    } catch (err) { console.error("Simulation failed", err); }
    finally { setSimulating(false); }
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      await api.post("/api/policies", {
        workerId: wid,
        coveragePct: Number(coveragePct),
      });
      setView("success");
    } catch (err) {
      console.error("Failed to purchase policy", err);
      alert("Failed to activate policy. Please make sure the backend is running.");
    } finally { setLoading(false); }
  };

  const renderNavbar = () => (
    <nav className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
      <div 
        className="flex items-center gap-2 cursor-pointer" 
        onClick={() => setView("quote")}
      >
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-pulse-ring">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">DownTime</span>
        <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">v3.0</span>
      </div>
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          className={`rounded-full gap-2 transition-all ${view === 'quote' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
          onClick={() => setView("quote")}
        >
          <HomeIcon className="w-4 h-4" /> <span className="hidden sm:inline">Home</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`rounded-full gap-2 transition-all ${view === 'dashboard' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
          onClick={() => setView("dashboard")}
        >
          <Activity className="w-4 h-4" /> <span className="hidden sm:inline">Dashboard</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`rounded-full gap-2 transition-all ${view === 'profile' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
          onClick={() => setView("profile")}
        >
          <User className="w-4 h-4" /> <span className="hidden sm:inline">Profile</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`rounded-full gap-2 transition-all ${view === 'admin' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-indigo-300/60 hover:text-indigo-300'}`}
          onClick={() => setView("admin")}
        >
          <Shield className="w-4 h-4" /> <span className="hidden sm:inline">Admin</span>
        </Button>
      </div>
    </nav>
  );

  // ─── Risk Breakdown Component ──────────────────────────────────────────
  const renderRiskBreakdown = () => {
    if (!premiumData) return null;
    const rb = premiumData.riskBreakdown;
    const factors = [
      { label: "Weather", val: rb.weather_risk, icon: CloudRain, color: "bg-blue-500" },
      { label: "Location", val: rb.location_risk, icon: MapPin, color: "bg-orange-500" },
      { label: "Seasonal", val: rb.seasonal_risk, icon: Sun, color: "bg-yellow-500" },
      { label: "Historical", val: rb.historical_risk, icon: History, color: "bg-purple-500" },
      { label: "Wind", val: rb.wind_risk, icon: Wind, color: "bg-cyan-500" },
      { label: "Humidity", val: rb.humidity_risk, icon: Droplets, color: "bg-teal-500" },
      { label: "UV Index", val: rb.uv_risk, icon: Sun, color: "bg-amber-500" },
      { label: "Visibility", val: rb.visibility_risk, icon: Eye, color: "bg-slate-400" },
      { label: "Flood", val: rb.flood_risk, icon: Waves, color: "bg-blue-700" },
      { label: "Cyclone", val: rb.cyclone_risk, icon: CloudLightning, color: "bg-red-600" },
      { label: "Time of Day", val: rb.time_of_day_risk, icon: Clock, color: "bg-indigo-400" },
    ];

    return (
      <div className="mb-8 relative z-10">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">
          AI Risk Matrix — {factors.length} Factors
        </p>
        <div className="grid grid-cols-1 gap-2">
          {factors.map((item, i) => (
            <div key={i} className="group">
              <div className="flex justify-between text-[11px] text-slate-300 font-medium mb-1">
                <span className="flex items-center gap-1.5">
                  <item.icon className="w-3 h-3 text-slate-500 group-hover:text-white transition-colors" />
                  {item.label}
                </span>
                <span className={`font-mono ${item.val > 0.5 ? 'text-red-400' : item.val > 0.2 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {(item.val * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded-full opacity-80 risk-bar`}
                  style={{ width: `${Math.max(2, item.val * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── REGISTRATION VIEW ─────────────────────────────────────────────────
  if (view === "register") {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 animate-in fade-in duration-700">
        <div className="max-w-lg w-full">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30 animate-float">
              <Shield className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold mb-3">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">DownTime</span>
            </h1>
            <p className="text-slate-400 text-lg">AI-powered income protection for gig workers</p>
            <p className="text-xs text-slate-500 mt-2">{Object.keys(CITIES).length} cities • 10+ risk factors • Instant payouts</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="space-y-2">
              <Label className="text-sm text-slate-300 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Full Name</Label>
              <input value={regName} onChange={e => setRegName(e.target.value)} placeholder="Rajesh Kumar" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-slate-300 flex items-center gap-2"><Phone className="w-4 h-4" /> Phone Number</Label>
              <input value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-slate-300 flex items-center gap-2"><MapPin className="w-4 h-4" /> City</Label>
                <Select value={regCity} onValueChange={setRegCity}>
                  <SelectTrigger className="bg-black/40 border-white/10 h-12 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                    {Object.keys(CITIES).map(c => (<SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">Zone</Label>
                <Select value={regZone} onValueChange={setRegZone}>
                  <SelectTrigger className="bg-black/40 border-white/10 h-12 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {(CITIES[regCity as keyof typeof CITIES] || []).map(z => (<SelectItem key={z} value={z}>{z}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-slate-300 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Platform</Label>
              <Select value={regPlatform} onValueChange={setRegPlatform}>
                <SelectTrigger className="bg-black/40 border-white/10 h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {["zomato", "swiggy", "zepto", "amazon", "dunzo", "blinkit", "bigbasket", "flipkart"].map(p => (
                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between"><Label className="text-sm text-slate-300 flex items-center gap-2"><IndianRupee className="w-4 h-4" /> Daily Income</Label><span className="text-indigo-300 font-bold">₹{regIncome[0]}</span></div>
              <Slider value={regIncome} onValueChange={setRegIncome} min={200} max={2000} step={50} />
            </div>
            <Button className="w-full py-6 rounded-2xl text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] transition-all hover:scale-[1.02]" onClick={handleRegister} disabled={loading || !regName || !regPhone}>
              {loading ? <span className="flex items-center gap-2"><span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />Creating Account...</span> : <span className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> Join DownTime <ChevronRight className="w-5 h-5" /></span>}
            </Button>
            <p className="text-center text-xs text-slate-500">Already registered? Enter your phone to log in.</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── SUCCESS VIEW ──────────────────────────────────────────────────────
  if (view === "success") {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 ring-4 ring-green-500/30 animate-float">
          <CheckCircle2 className="w-12 h-12 text-green-400" />
        </div>
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-300 to-emerald-500 mb-4">
          You are Covered!
        </h1>
        <p className="text-xl text-slate-300 max-w-md mx-auto mb-8">
          Your DownTime policy is active. You are now protected against <strong>10+ external disruption factors</strong>.
        </p>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md max-w-sm w-full mx-auto text-left space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-400">Weekly Premium</span>
            <span className="font-medium text-white">₹{premiumData?.weeklyPremium}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Coverage Limit</span>
            <span className="font-medium text-white">₹{premiumData?.coverageLimit}</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-white/10 mt-3">
            <span className="text-slate-400">Payment Gateway</span>
            <span className="text-white text-sm font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Razorpay (Mock)
            </span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-white/10 mt-3">
            <span className="text-slate-400">Status</span>
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Active
            </span>
          </div>
        </div>
        <Button 
          className="mt-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full px-8 py-6 h-auto text-lg border border-white/10 transition-all duration-300 shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]"
          onClick={() => setView("dashboard")}
        >
          Go to Dashboard
        </Button>
      </div>
    );
  }

  // ─── DASHBOARD VIEW ────────────────────────────────────────────────────
  if (view === "dashboard") {
    return (
      <div className="py-6 animate-in fade-in duration-700">
        {renderNavbar()}
        
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Worker Dashboard</h1>
          <p className="text-slate-400">Real-time income protection for Food & Grocery Delivery Partners.</p>
        </header>

        {/* Active Disruption Alert */}
        {dashboardData?.activeEvent && (
          <div className="mb-8 p-6 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-start gap-4 ring-4 ring-red-500/5 animate-shimmer">
            <div className="p-3 bg-red-500/20 rounded-2xl shrink-0 animate-pulse">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-400 uppercase tracking-tight">
                ⚠️ Active Disruption Detected
              </h3>
              <p className="text-slate-300 mt-1">
                <span className="font-semibold text-white">{TRIGGER_LABELS[dashboardData.activeEvent.triggerType] || dashboardData.activeEvent.triggerType}</span>
                {" "}in <strong>{dashboardData.activeEvent.zone}</strong>.
                Your protection is actively securing your earnings.
              </p>
            </div>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Payouts", val: `₹${dashboardData?.stats.totalPayouts || 0}`, icon: IndianRupee, color: "text-green-400", bg: "bg-green-500/10" },
            { label: "Protected Days", val: dashboardData?.stats.protectedDays || 0, icon: Shield, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Active Triggers", val: dashboardData?.stats.activeTriggers || 0, icon: Zap, color: "text-orange-400", bg: "bg-orange-500/10" },
            { label: "Coverage Used", val: `${dashboardData?.stats.coverageUtilization || 0}%`, icon: Activity, color: "text-purple-400", bg: "bg-purple-500/10" },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/[0.07] transition-all group">
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color} animate-counter`}>{stat.val}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
          {/* Claims History */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" /> Recent History
            </h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Event</th>
                    <th className="px-6 py-4">Hours</th>
                    <th className="px-6 py-4">Payout</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {dashboardData?.claims && dashboardData.claims.length > 0 ? (
                    dashboardData.claims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-sm">{new Date(claim.eventDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm font-medium">
                          {TRIGGER_LABELS[claim.triggerType] || claim.triggerType}
                        </td>
                        <td className="px-6 py-4 text-sm">{claim.hoursLost}h</td>
                        <td className="px-6 py-4 text-sm text-green-400 font-bold">₹{claim.finalPayout}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                            claim.status === 'PAID' ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30' : 
                            claim.status === 'APPROVED' ? 'bg-blue-500/20 text-blue-400' :
                            claim.status === 'FLAGGED' ? 'bg-red-500/20 text-red-400' :
                            'bg-orange-500/20 text-orange-400'
                          }`}>
                            {claim.status === 'PAID' ? '⚡ RAZORPAY UPI' : claim.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                        No recent claim history found. Go out and work safely!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Policy */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" /> Active Policy
            </h2>
            {dashboardData?.activePolicy ? (
              <div className="bg-gradient-to-b from-indigo-600/10 to-transparent border border-indigo-500/20 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Shield className="w-28 h-28" />
                </div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-xs text-indigo-300 font-bold uppercase mb-1">Weekly Limit</p>
                      <p className="text-3xl font-bold">₹{dashboardData.activePolicy.coverageLimit}</p>
                    </div>
                    <span className="bg-green-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg shadow-green-500/20">ACTIVE</span>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Remaining</span>
                      <span className="text-white font-medium">₹{dashboardData.activePolicy.remainingLimit}</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${(dashboardData.activePolicy.remainingLimit / dashboardData.activePolicy.coverageLimit) * 100}%` }} 
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-between border-t border-white/10 pt-4">
                    <span>Coverage: {dashboardData.activePolicy.coveragePct * 100}%</span>
                    <span>Expires: {new Date(dashboardData.activePolicy.weekEndDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-dashed border-white/20 p-8 rounded-2xl text-center">
                <p className="text-slate-400 mb-4">No active policy found.</p>
                <Button 
                  size="sm" 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                  onClick={() => setView("quote")}
                >
                  Get Covered Now
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── PROFILE VIEW ──────────────────────────────────────────────────────
  if (view === "profile") {
    return (
      <div className="py-6 animate-in fade-in duration-700">
        {renderNavbar()}

        <header className="mb-12">
          <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
          <p className="text-slate-400">Manage your account and work details.</p>
        </header>

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl flex items-center gap-8">
            <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-4xl font-bold shadow-lg shadow-indigo-500/20 animate-float">
              {dashboardData?.worker.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-1">{dashboardData?.worker.name || "Loading..."}</h2>
              <p className="text-indigo-400 font-medium">{dashboardData?.worker.platform.toUpperCase()} Partner</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: "Phone Number", val: dashboardData?.worker.phone, icon: Activity },
              { label: "Operating City", val: dashboardData?.worker.city, icon: MapPin },
              { label: "Base Zone", val: dashboardData?.worker.zone, icon: MapPin },
              { label: "Daily Income", val: `₹${dashboardData?.worker.dailyIncome}`, icon: IndianRupee },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/[0.07] transition-all">
                <p className="text-xs text-slate-500 font-bold uppercase mb-2 flex items-center gap-1.5">
                  <item.icon className="w-3 h-3" /> {item.label}
                </p>
                <p className="text-lg font-medium text-white">{item.val || "---"}</p>
              </div>
            ))}
          </div>

          <div className="pt-8 flex justify-center">
            <Button variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── ADMIN VIEW ────────────────────────────────────────────────────────
  if (view === "admin") {
    // Basic mock mapping if backend lacks specific predictive arrays
    return (
      <div className="py-6 animate-in fade-in duration-700">
        {renderNavbar()}

        <header className="mb-12">
          <h1 className="text-3xl font-bold text-white mb-2">Insurer Dashboard (Admin)</h1>
          <p className="text-slate-400">Portfolio analytics, Loss ratios, and AI Disruption Predictions.</p>
        </header>

        {loading ? (
          <div className="flex justify-center p-12">
            <span className="animate-spin w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full" />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "Active Policies", val: adminData?.activePolicies || 0, icon: Shield, color: "text-blue-400", bg: "bg-blue-500/10" },
                { label: "Weekly Premiums", val: `₹${adminData?.totalPremiumsThisWeek || 0}`, icon: IndianRupee, color: "text-green-400", bg: "bg-green-500/10" },
                { label: "Total Payouts (Wk)", val: `₹${adminData?.totalPayoutsThisWeek || 0}`, icon: IndianRupee, color: "text-red-400", bg: "bg-red-500/10" },
                { label: "Loss Ratio (Wk)", val: `${adminData?.lossRatio !== undefined ? adminData.lossRatio : 0}%`, icon: Activity, color: (adminData?.lossRatio || 0) > 80 ? "text-red-400" : "text-emerald-400", bg: "bg-white/5" },
              ].map((stat, i) => (
                <div key={i} className={`p-6 rounded-3xl border border-white/10 ${stat.bg}`}>
                  <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    {stat.label}
                  </p>
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.val}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <CloudLightning className="text-yellow-400 w-5 h-5" />
                  Next Week&apos;s Predictive Claims
                </h2>
                <div className="space-y-4">
                  {[
                    { city: "Hyderabad", zone: "Kondapur", type: "EXTREME_HEAT", prob: 85, impact: "High" },
                    { city: "Mumbai", zone: "Dharavi", type: "FLOOD_WARNING", prob: 62, impact: "Medium" },
                    { city: "Delhi", zone: "Connaught Place", type: "SEVERE_POLLUTION", prob: 92, impact: "High" },
                  ].map((pred, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-white/5">
                      <div>
                        <p className="font-bold text-white text-sm">{pred.city} ({pred.zone})</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3 text-yellow-500" /> {TRIGGER_LABELS[pred.type] || pred.type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-indigo-400">{pred.prob}% Probability</p>
                        <p className={`text-[10px] uppercase font-bold mt-1 ${pred.impact === 'High' ? 'text-red-400' : 'text-orange-400'}`}>{pred.impact} IMPACT</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Activity className="text-red-400 w-5 h-5" />
                  Recent Fraud Checks (Phase 3)
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl relative overflow-hidden">
                    <span className="absolute top-0 right-0 px-3 py-1 bg-red-500 text-white text-[10px] font-bold rounded-bl-lg">FLAGGED</span>
                    <p className="text-white text-sm font-bold mb-1">Claim #CLM-9281</p>
                    <p className="text-slate-400 text-xs">Worker ID: user-seed-123</p>
                    <div className="mt-3 text-xs text-red-300 bg-red-500/10 rounded-lg p-2 font-mono">
                      Reason: GPS Spoofing Detected (Too fast travel between zones)
                    </div>
                  </div>
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl relative overflow-hidden">
                    <span className="absolute top-0 right-0 px-3 py-1 bg-green-500 text-white text-[10px] font-bold rounded-bl-lg">CLEARED</span>
                    <p className="text-white text-sm font-bold mb-1">Claim #CLM-9282</p>
                    <p className="text-slate-400 text-xs">Location: Hyderabad, Kondapur</p>
                    <div className="mt-3 text-xs text-green-300 bg-green-500/10 rounded-lg p-2 font-mono">
                      Validation: External Weather API matched API payload.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── QUOTE VIEW (HOME) ────────────────────────────────────────────────
  return (
    <div className="py-6 animate-in fade-in duration-700">
      {renderNavbar()}
      
      <header className="mb-12 text-center md:text-left md:flex justify-between items-end">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium border border-blue-500/20 mb-6 font-mono tracking-tight uppercase">
            <Zap className="w-4 h-4" />
            AI-Driven Parametric Engine v2.0
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 drop-shadow-sm animate-gradient">DownTime</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl font-light leading-relaxed">
            Automated, parametric income protection exclusively designed for <strong className="text-white">Food & Q-Commerce Delivery Partners (Zomato, Swiggy, Zepto)</strong>, paying out instantly via Razorpay when uncontrollable external disruptions hit.
          </p>
        </div>
      </header>

      <div className="grid md:grid-cols-[1fr_400px] gap-8 items-start">
        {/* Input Form */}
        <div className="rounded-3xl border border-white/5 bg-foreground/5 p-8 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-1 ring-white/10 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 border-b border-white/10 pb-4">
            <Activity className="text-indigo-400 w-6 h-6" /> Configure Coverage
          </h2>

          <div className="space-y-10">
            {/* Daily Income Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <Label className="text-lg text-slate-200 flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-slate-400" />
                  Expected Daily Income
                </Label>
                <div className="text-3xl font-bold text-indigo-300 drop-shadow-md">₹{dailyIncome[0]}</div>
              </div>
              <Slider
                value={dailyIncome}
                onValueChange={setDailyIncome}
                min={200}
                max={2000}
                step={50}
                className="py-4"
              />
              <div className="flex justify-between text-xs font-medium text-slate-500 pt-1">
                <span>₹200</span>
                <span>₹1,100</span>
                <span>₹2,000</span>
              </div>
            </div>

            {/* Location Selection */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  City
                </Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="bg-black/40 border-white/10 h-14 text-lg rounded-xl focus:ring-indigo-500/30">
                    <SelectValue placeholder="Select City" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {Object.keys(CITIES).map((c) => (
                      <SelectItem key={c} value={c} className="text-base capitalize">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  Operating Zone
                </Label>
                <Select value={zone} onValueChange={setZone}>
                  <SelectTrigger className="bg-black/40 border-white/10 h-14 text-lg rounded-xl focus:ring-indigo-500/30">
                    <SelectValue placeholder="Select Zone" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {CITIES[city as keyof typeof CITIES].map((z) => (
                      <SelectItem key={z} value={z} className="text-base">
                        {z}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Coverage Tier */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              <Label className="text-lg text-slate-200">Protection Tier</Label>
              <RadioGroup value={coveragePct} onValueChange={setCoveragePct} className="grid grid-cols-3 gap-4">
                {[
                  { id: "0.50", label: "Basic", desc: "50% cover", price: "Lowest" },
                  { id: "0.70", label: "Standard", desc: "70% cover", price: "Balanced" },
                  { id: "0.90", label: "Premium", desc: "90% cover", price: "Max Safety" },
                ].map((tier) => (
                  <div key={tier.id}>
                    <RadioGroupItem value={tier.id} id={tier.id} className="peer sr-only" />
                    <Label
                      htmlFor={tier.id}
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-white/5 bg-black/40 p-4 hover:bg-white/5 hover:border-white/20 peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:bg-indigo-500/10 cursor-pointer transition-all h-full"
                    >
                      <span className="font-semibold text-lg mb-1 relative">
                        {tier.label}
                        {coveragePct === tier.id && (
                          <span className="absolute -top-2 -right-4 w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_10px_2px_rgba(129,140,248,0.5)]" />
                        )}
                      </span>
                      <span className="text-xs text-slate-400">{tier.desc}</span>
                      <span className="text-[10px] text-indigo-400 mt-1 font-mono">{tier.price}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Covered Disruptions mini-grid */}
            <div className="pt-4 border-t border-white/5">
              <Label className="text-sm text-slate-400 mb-3 block">Covered Disruptions</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: CloudRain, label: "Rain" },
                  { icon: Thermometer, label: "Heat" },
                  { icon: Wind, label: "Wind" },
                  { icon: Eye, label: "Fog" },
                  { icon: Droplets, label: "Humidity" },
                  { icon: Waves, label: "Floods" },
                  { icon: CloudLightning, label: "Cyclone" },
                  { icon: AlertCircle, label: "AQI" },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center p-2 rounded-lg bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 transition-all">
                    <item.icon className="w-4 h-4 text-slate-400 mb-1" />
                    <span className="text-[10px] text-slate-500">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Display */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/10 to-transparent p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <p className="text-sm font-medium text-indigo-300/80 uppercase tracking-wider mb-2">Weekly Premium</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black tracking-tighter text-white drop-shadow-md">
                    {premiumData ? `₹${premiumData.weeklyPremium}` : "---"}
                  </span>
                  <span className="text-lg text-slate-400 font-medium">/wk</span>
                </div>
              </div>

              {premiumData && (
                <div className={`px-4 py-2 rounded-full text-xs font-bold border flex items-center gap-2 ${
                  premiumData.riskLabel === 'Critical' ? 'bg-red-600/20 text-red-400 border-red-500/30' :
                  premiumData.riskLabel === 'Very High' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  premiumData.riskLabel === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                  premiumData.riskLabel === 'Moderate' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  <AlertCircle className="w-3 h-3" />
                  {premiumData.riskLabel} ({(premiumData.riskScore * 100).toFixed(0)}%)
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3 mb-8 relative z-10">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Weekly Payout Limit</span>
                <span className="text-white font-semibold flex items-center gap-1">
                  <Shield className="w-3 h-3 text-indigo-400" />
                  ₹{premiumData ? premiumData.coverageLimit : "---"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Income Protected</span>
                <span className="text-white font-semibold">
                  {Math.round(Number(coveragePct) * 100)}%
                </span>
              </div>
              {premiumData?.premiumBreakdown && (
                <div className="flex justify-between text-sm border-t border-white/5 pt-3">
                  <span className="text-slate-400">Seasonal Factor</span>
                  <span className="text-indigo-300 font-mono text-xs">×{premiumData.premiumBreakdown.seasonalAdjustment}</span>
                </div>
              )}
            </div>

            {renderRiskBreakdown()}

            <Button 
              className={`w-full py-7 rounded-2xl text-lg font-bold transition-all relative z-10 ${
                loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)]'
              } bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-none`}
              disabled={loading || !premiumData}
              onClick={handlePurchase}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                  Finalizing Coverage...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Activate DownTime <ChevronRight className="w-5 h-5 ml-1" />
                </span>
              )}
            </Button>
            <p className="text-center text-[10px] text-slate-500 mt-4 relative z-10 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3 opacity-50" /> 10+ Sensors • Zero Claims • Instant Payouts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
