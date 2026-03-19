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
import { Shield, CheckCircle2, ChevronRight, Activity, CloudRain, MapPin, IndianRupee, AlertCircle } from "lucide-react";
import { api } from "@/lib/axios";

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
  };
}

// Constants
const CITIES: Record<string, string[]> = {
  hyderabad: ["Kondapur", "Hitech City", "Secunderabad", "Gachibowli"],
  mumbai: ["Dharavi", "Bandra", "Andheri"],
  bangalore: ["Whitefield", "Koramangala"],
  delhi: ["Connaught Place", "Dwarka", "Rohini"],
};

export default function Home() {
  const [dailyIncome, setDailyIncome] = useState([700]);
  const [city, setCity] = useState("hyderabad");
  const [zone, setZone] = useState("Kondapur");
  const [coveragePct, setCoveragePct] = useState("0.70");

  const [loading, setLoading] = useState(false);
  const [premiumData, setPremiumData] = useState<PremiumResponse | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Auto update zone when city changes
  useEffect(() => {
    setZone(CITIES[city as keyof typeof CITIES][0]);
  }, [city]);

  // Fetch premium calculation
  useEffect(() => {
    const fetchPremium = async () => {
      setLoading(true);
      try {
        const response = await api.get("/api/premium/calculate", {
          params: {
            income: dailyIncome[0],
            city,
            zone,
            coverage: coveragePct,
          },
        });
        setPremiumData(response.data);
      } catch (err) {
        console.error("Failed to fetch premium", err);
      } finally {
        setLoading(false);
      }
    };

    const delay = setTimeout(() => {
      fetchPremium();
    }, 500); // 500ms debounce

    return () => clearTimeout(delay);
  }, [dailyIncome, city, zone, coveragePct]);

  const handlePurchase = async () => {
    setLoading(true);
    // Simulate backend call to purchase policy
    setTimeout(() => {
      setLoading(false);
      setIsSuccess(true);
    }, 1500);
  };

  if (isSuccess) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 ring-4 ring-green-500/30">
          <CheckCircle2 className="w-12 h-12 text-green-400" />
        </div>
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-300 to-emerald-500 mb-4">
          You are Covered!
        </h1>
        <p className="text-xl text-slate-300 max-w-md mx-auto mb-8">
          Your GigShield policy is active. You are now protected against external disruptions.
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
            <span className="text-slate-400">Status</span>
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Active
            </span>
          </div>
        </div>
        <Button 
          className="mt-8 bg-white/10 hover:bg-white/20 text-white rounded-full px-8 py-6 h-auto text-lg border border-white/10 transition-all duration-300 shadow-[0_0_30px_-5px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.2)]"
          onClick={() => setIsSuccess(false)}
        >
          View Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="py-6 animate-in fade-in duration-700">
      <header className="mb-12 text-center md:text-left md:flex justify-between items-end">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium border border-blue-500/20 mb-6">
            <Shield className="w-4 h-4" />
            AI-Powered Protection
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 drop-shadow-sm">GigShield</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl font-light">
            Automated, parametric income protection that pays out instantly when weather or events disrupt your work.
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
                  { id: "0.50", label: "Basic", desc: "50% cover" },
                  { id: "0.70", label: "Standard", desc: "70% cover" },
                  { id: "0.90", label: "Premium", desc: "90% cover" },
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
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        </div>

        {/* Dynamic Display */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/10 to-transparent p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden group">
            {/* Glossy overlay */}
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
                  premiumData.riskLabel === 'Very High' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  premiumData.riskLabel === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                  premiumData.riskLabel === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  <AlertCircle className="w-3 h-3" />
                  {premiumData.riskLabel} Risk ({premiumData.riskScore})
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
            </div>

            {premiumData && (
              <div className="mb-8 relative z-10">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">AI Risk Breakdown</p>
                <div className="space-y-3">
                  {[
                    { label: "Weather", val: premiumData.riskBreakdown.weather_risk, icon: CloudRain, color: "bg-blue-500" },
                    { label: "Location", val: premiumData.riskBreakdown.location_risk, icon: MapPin, color: "bg-orange-500" },
                  ].map((item, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-300 font-medium">
                        <span className="flex items-center gap-1.5"><item.icon className="w-3 h-3 text-slate-500" /> {item.label}</span>
                        <span>{item.val.toFixed(2)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full opacity-80`} style={{ width: `${item.val * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                  Processing Engine...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Activate GigShield <ChevronRight className="w-5 h-5 ml-1" />
                </span>
              )}
            </Button>
            <p className="text-center text-[10px] text-slate-500 mt-4 relative z-10 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3 opacity-50" /> Fully parametric • Zero manual claims
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
