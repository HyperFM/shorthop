import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, Navigation, Users, Car, Zap, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

type WidgetData = {
  role: "driver" | "hopper";
  directionLabel: string;
  directionCount: number;
  nearbyActive: number;
  driversInArea: number;
  isActive: boolean;
};

function SmallWidget({ data }: { data: WidgetData }) {
  const isDriver = data.role === "driver";
  const bg = isDriver ? "from-green-900 to-green-950" : "from-blue-900 to-blue-950";
  const accent = isDriver ? "text-green-400" : "text-blue-400";

  return (
    <div className={`w-[170px] h-[170px] rounded-[22px] bg-gradient-to-br ${bg} p-4 flex flex-col justify-between shadow-2xl border border-white/10`} data-testid="widget-small">
      <div className="flex items-center gap-1.5">
        <div className={`w-5 h-5 rounded-md bg-black/30 flex items-center justify-center`}>
          <Navigation className={`w-3 h-3 ${accent}`} />
        </div>
        <span className="text-[10px] text-white/60 font-medium tracking-wide uppercase">ShortHop</span>
      </div>
      <div>
        <p className="text-3xl font-bold text-orange-400 leading-none" data-testid="widget-direction-count">{data.directionCount}</p>
        <p className="text-[11px] text-white/70 mt-1 leading-tight">heading toward</p>
        <p className={`text-[12px] font-semibold ${accent} leading-tight truncate`}>{data.directionLabel}</p>
      </div>
    </div>
  );
}

function MediumWidget({ data }: { data: WidgetData }) {
  const isDriver = data.role === "driver";
  const bg = isDriver ? "from-green-900 to-green-950" : "from-blue-900 to-blue-950";
  const accent = isDriver ? "text-green-400" : "text-blue-400";
  const accentBg = isDriver ? "bg-green-500/20" : "bg-blue-500/20";

  return (
    <div className={`w-[364px] h-[170px] rounded-[22px] bg-gradient-to-br ${bg} p-4 flex gap-4 shadow-2xl border border-white/10`} data-testid="widget-medium">
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded-md bg-black/30 flex items-center justify-center`}>
            <Navigation className={`w-3 h-3 ${accent}`} />
          </div>
          <span className="text-[10px] text-white/60 font-medium tracking-wide uppercase">ShortHop</span>
        </div>
        <div>
          <p className="text-4xl font-bold text-orange-400 leading-none">{data.directionCount}</p>
          <p className="text-[11px] text-white/70 mt-1 leading-tight">heading toward</p>
          <p className={`text-[13px] font-semibold ${accent} leading-tight`}>{data.directionLabel}</p>
        </div>
      </div>
      <div className="w-px bg-white/10 self-stretch my-2" />
      <div className="flex flex-col justify-center gap-3 min-w-[120px]">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${accentBg} flex items-center justify-center`}>
            <Users className={`w-4 h-4 ${accent}`} />
          </div>
          <div>
            <p className="text-lg font-bold text-orange-400 leading-none">{data.nearbyActive}</p>
            <p className="text-[9px] text-white/50">active nearby</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${accentBg} flex items-center justify-center`}>
            <Car className={`w-4 h-4 ${accent}`} />
          </div>
          <div>
            <p className="text-lg font-bold text-orange-400 leading-none">{data.driversInArea}</p>
            <p className="text-[9px] text-white/50">drivers in area</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LargeWidget({ data }: { data: WidgetData }) {
  const isDriver = data.role === "driver";
  const bg = isDriver ? "from-green-900 to-green-950" : "from-blue-900 to-blue-950";
  const accent = isDriver ? "text-green-400" : "text-blue-400";
  const accentBg = isDriver ? "bg-green-500/20" : "bg-blue-500/20";
  const btnBg = isDriver ? "bg-green-500" : "bg-blue-500";
  const btnLabel = isDriver ? "Go Available" : "Request Hop";
  const BtnIcon = isDriver ? Radio : Zap;

  return (
    <div className={`w-[364px] h-[376px] rounded-[22px] bg-gradient-to-br ${bg} p-5 flex flex-col shadow-2xl border border-white/10`} data-testid="widget-large">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-lg bg-black/30 flex items-center justify-center`}>
            <Navigation className={`w-3.5 h-3.5 ${accent}`} />
          </div>
          <span className="text-[11px] text-white/60 font-medium tracking-wide uppercase">ShortHop Flow</span>
        </div>
        {data.isActive && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-green-400 font-medium">LIVE</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <p className="text-[11px] text-white/50 uppercase tracking-wider mb-1">Heading toward {data.directionLabel}</p>
        <p className="text-6xl font-bold text-orange-400 leading-none">{data.directionCount}</p>
        <p className="text-sm text-white/60 mt-1">people traveling this direction today</p>
      </div>

      <div className="flex gap-3 my-4">
        <div className={`flex-1 rounded-xl ${accentBg} p-3 flex items-center gap-2`}>
          <Users className={`w-5 h-5 ${accent}`} />
          <div>
            <p className="text-xl font-bold text-orange-400 leading-none">{data.nearbyActive}</p>
            <p className="text-[9px] text-white/50">active nearby</p>
          </div>
        </div>
        <div className={`flex-1 rounded-xl ${accentBg} p-3 flex items-center gap-2`}>
          <Car className={`w-5 h-5 ${accent}`} />
          <div>
            <p className="text-xl font-bold text-orange-400 leading-none">{data.driversInArea}</p>
            <p className="text-[9px] text-white/50">drivers in area</p>
          </div>
        </div>
      </div>

      <button className={`w-full ${btnBg} hover:opacity-90 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-opacity`} data-testid="widget-action-button">
        <BtnIcon className="w-5 h-5" />
        {btnLabel}
      </button>
    </div>
  );
}

export default function Widget() {
  const { data: user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: widgetData, isLoading } = useQuery<WidgetData>({
    queryKey: ["/api/widget/data"],
    enabled: !!user,
    refetchInterval: 30000,
  });

  if (authLoading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const data = widgetData || {
    role: user.isDriver ? "driver" as const : "hopper" as const,
    directionLabel: "Downtown Lexington",
    directionCount: 0,
    nearbyActive: 0,
    driversInArea: 0,
    isActive: false,
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white p-1"
            onClick={() => setLocation("/dashboard")}
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium">iOS Home Screen</p>
            <h1 className="text-lg font-display font-bold text-white">Widget Preview</h1>
          </div>
        </div>

        <div className="mb-3 bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-white/50 mb-1">Directional Flow Widget</p>
          <p className="text-sm text-white/80">
            See real-time travel demand at a glance. {data.role === "driver" ? "Green theme = Driver mode" : "Blue theme = Hopper mode"}.
            Important numbers appear in <span className="text-orange-400 font-bold">orange</span>.
          </p>
        </div>

        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] text-white/40 uppercase tracking-wider font-bold">Small Widget</span>
              <span className="text-[10px] text-white/20">170 x 170</span>
            </div>
            <div className="flex justify-center">
              <SmallWidget data={data} />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] text-white/40 uppercase tracking-wider font-bold">Medium Widget</span>
              <span className="text-[10px] text-white/20">364 x 170</span>
            </div>
            <div className="flex justify-center">
              <MediumWidget data={data} />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] text-white/40 uppercase tracking-wider font-bold">Large Widget</span>
              <span className="text-[10px] text-white/20">364 x 376</span>
            </div>
            <div className="flex justify-center">
              <LargeWidget data={data} />
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-white/40 uppercase tracking-wider font-bold mb-2">How It Works</p>
          <ul className="space-y-2 text-sm text-white/60">
            <li className="flex gap-2"><span className="text-orange-400">1.</span> Widget fetches live data from ShortHop every 30 seconds</li>
            <li className="flex gap-2"><span className="text-orange-400">2.</span> Shows demand based on your typical route direction</li>
            <li className="flex gap-2"><span className="text-orange-400">3.</span> Tap the widget to open ShortHop instantly</li>
            <li className="flex gap-2"><span className="text-orange-400">4.</span> Quick action button lets you go live or request in one tap</li>
          </ul>
          <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <p className="text-xs text-orange-300">
              Native iOS widget will be available when ShortHop launches on the App Store.
              This preview shows exactly how it will look on your home screen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
