import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Trash2, Clock, MapPin, ArrowLeftRight, ChevronDown, ChevronUp, Pencil, Route as RouteIcon, Sparkles, Car, User as UserIcon, Lock, CreditCard, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { showFlash } from "@/components/FlashNotification";
import type { Schedule } from "@shared/schema";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatDays(days: string[]): string {
  if (days.length === 7) return "Every day";
  if (days.length === 5 && days.every(d => ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(d))) return "Weekdays";
  if (days.length === 2 && days.every(d => ["Sat", "Sun"].includes(d))) return "Weekends";
  return days.join(", ");
}

function ScheduleForm({ onSave, initial, onCancel, isLongHop = false, role = "hopper" }: {
  onSave: (data: any) => void;
  initial?: Schedule;
  onCancel: () => void;
  isLongHop?: boolean;
  role?: "hopper" | "driver";
}) {
  const [days, setDays] = useState<string[]>((initial?.days as string[]) || []);
  const [startLocation, setStartLocation] = useState(initial?.startLocation || "");
  const [destination, setDestination] = useState(initial?.destination || "");
  const [timeStart, setTimeStart] = useState(initial?.timeStart || "07:30");
  const [timeEnd, setTimeEnd] = useState(initial?.timeEnd || "08:00");
  const [returnTrip, setReturnTrip] = useState(initial?.returnTrip || false);
  const [anytime, setAnytime] = useState((initial as any)?.anytime || false);
  const [paymentPreference] = useState("stripe");

  const toggleDay = (day: string) => {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!anytime && days.length === 0) {
      showFlash("⚠️", "Select at least one day or enable Anytime", "error");
      return;
    }
    if (!startLocation || !destination) {
      showFlash("⚠️", "Fill in start and destination", "error");
      return;
    }
    onSave({ days: anytime ? [] : days, startLocation, destination, timeStart: anytime ? null : timeStart, timeEnd: anytime ? null : timeEnd, returnTrip, anytime, paymentPreference, role });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isLongHop && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-700/30">
          <RouteIcon className="w-4 h-4 text-purple-500" />
          <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400">Long Hop — for longer commutes (10+ miles)</p>
        </div>
      )}

      {role === "driver" && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-700/30">
          <Car className="w-4 h-4 text-green-500" />
          <p className="text-[11px] font-bold text-green-600 dark:text-green-400">Driver Schedule — plan trips you'll drive</p>
        </div>
      )}

      <div className="flex items-center justify-between py-2 px-1 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-700/30">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-green-500" />
          <div>
            <span className="text-sm font-bold text-foreground">Request Anytime</span>
            <p className="text-[10px] text-muted-foreground">{role === "driver" ? "Accept matches whenever available" : "Match whenever a driver is available"}</p>
          </div>
        </div>
        <Switch checked={anytime} onCheckedChange={setAnytime} data-testid="switch-anytime" />
      </div>

      {!anytime && (
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Days</p>
        <div className="flex gap-1.5">
          {DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                days.includes(day)
                  ? "bg-primary text-white shadow-md shadow-primary/25"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
              }`}
              data-testid={`day-${day.toLowerCase()}`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-0.5 py-1">
            <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary" />
            <div className="w-px h-6 bg-border" />
            <div className="w-3 h-3 rounded-sm bg-orange-500 border-2 border-orange-500" />
          </div>
          <div className="flex-1 space-y-2">
            <Input
              placeholder="Starting location"
              value={startLocation}
              onChange={(e) => setStartLocation(e.target.value)}
              className="h-11 text-sm rounded-xl bg-muted/40 border-transparent focus:bg-background"
              data-testid="input-schedule-start"
            />
            <Input
              placeholder="Destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="h-11 text-sm rounded-xl bg-muted/40 border-transparent focus:bg-background"
              data-testid="input-schedule-destination"
            />
          </div>
        </div>
      </div>

      {!anytime && (
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Time Window</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="time"
              value={timeStart}
              onChange={(e) => setTimeStart(e.target.value)}
              className="h-11 pl-9 text-sm rounded-xl bg-muted/40 border-transparent"
              data-testid="input-time-start"
            />
          </div>
          <span className="text-sm text-muted-foreground font-medium">to</span>
          <div className="flex-1 relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="time"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
              className="h-11 pl-9 text-sm rounded-xl bg-muted/40 border-transparent"
              data-testid="input-time-end"
            />
          </div>
        </div>
      </div>
      )}

      <div className="flex items-center justify-between py-2 px-1">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground">Include return trip</span>
        </div>
        <Switch checked={returnTrip} onCheckedChange={setReturnTrip} data-testid="switch-return-trip" />
      </div>

      {role === "hopper" && (
        <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-700/30">
          <span className="text-base">💳</span>
          <div>
            <p className="text-[11px] font-bold text-foreground">Payment via Stripe</p>
            <p className="text-[10px] text-muted-foreground">Scheduled hops are paid in advance through Stripe.</p>
          </div>
        </div>
      )}

      {role === "driver" && (
        <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-green-50/50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-700/30">
          <Car className="w-4 h-4 text-green-500" />
          <div>
            <p className="text-[11px] font-bold text-foreground">No payment needed</p>
            <p className="text-[10px] text-muted-foreground">Drivers earn when matched with scheduled hoppers.</p>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-12 rounded-xl" data-testid="button-cancel-schedule">
          Cancel
        </Button>
        <button type="submit" className="flex-1 primary-action-btn" data-testid="button-save-schedule">
          {initial ? "Update" : "Save Schedule"}
        </button>
      </div>
    </form>
  );
}

function ReadySetHop() {
  const words = ["Ready", "Set", "Hop!"];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % words.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center gap-3 py-4" data-testid="text-ready-set-hop">
      {words.map((word, i) => (
        <motion.span
          key={word}
          animate={{
            scale: activeIndex === i ? 1.4 : 0.85,
            opacity: activeIndex === i ? 1 : 0.35,
            y: activeIndex === i ? -4 : 0,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className={`text-2xl font-black tracking-tight ${
            i === 0 ? "text-orange-500" : i === 1 ? "text-amber-500" : "text-green-500"
          }`}
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
}

function RolePanelToggle({ activeRole, onChangeRole }: { activeRole: "hopper" | "driver"; onChangeRole: (r: "hopper" | "driver") => void }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl" data-testid="toggle-schedule-role">
      <button
        type="button"
        onClick={() => onChangeRole("hopper")}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[11px] font-bold transition-all ${
          activeRole === "hopper"
            ? "bg-blue-500 text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
        data-testid="button-role-hopper"
      >
        <UserIcon className="w-3.5 h-3.5" />
        Hopper
      </button>
      <button
        type="button"
        onClick={() => onChangeRole("driver")}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[11px] font-bold transition-all ${
          activeRole === "driver"
            ? "bg-green-500 text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
        data-testid="button-role-driver"
      >
        <Car className="w-3.5 h-3.5" />
        Driver
      </button>
    </div>
  );
}

function PowerHopGate({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <Card className="border-purple-200/60 dark:border-purple-700/30 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20 rounded-2xl" data-testid="card-powerhop-gate">
      <CardContent className="p-4 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6 text-purple-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">PowerHop Required</p>
          <p className="text-xs text-muted-foreground mt-1">
            Scheduled hops are a PowerHop feature. Upgrade to plan your rides in advance and get pre-matched with drivers.
          </p>
        </div>
        <Button
          onClick={onUpgrade}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold shadow-md shadow-purple-500/20"
          data-testid="button-upgrade-powerhop"
        >
          Upgrade to PowerHop — $25/mo
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SchedulePage() {
  const { data: user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showLongHopForm, setShowLongHopForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const userModeLock = user?.modeLock || "none";
  const [panelRole, setPanelRole] = useState<"hopper" | "driver">(() => {
    if (userModeLock === "driver_only") return "driver";
    if (userModeLock === "hopper_only") return "hopper";
    return "hopper";
  });
  const [showSubscriptionPrompt, setShowSubscriptionPrompt] = useState(false);
  const touchStartX = useRef(0);

  const { data: mySchedules = [], isLoading } = useQuery<Schedule[]>({
    queryKey: ['/api/schedules'],
  });

  const hasPowerHop = user?.subscription === "power_hop" || (user as any)?.lifetimeSubscription;
  const isDriver = user?.isDriver;

  const filteredSchedules = mySchedules.filter(s => (s as any).role === panelRole || (!((s as any).role) && panelRole === "hopper"));

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/schedules", data);
      if (!res.ok) {
        const err = await res.json();
        if (err.requiresPowerHop) {
          setShowSubscriptionPrompt(true);
          throw new Error("PowerHop required");
        }
        throw new Error(err.message || "Failed to create schedule");
      }
      return res.json();
    },
    onSuccess: (schedule) => {
      qc.invalidateQueries({ queryKey: ['/api/schedules'] });
      setShowForm(false);
      setShowLongHopForm(false);
      showFlash("📅", "Schedule saved!", "success");
      if (panelRole === "hopper" && !(schedule as any).paid) {
        payScheduleMutation.mutate({ scheduleId: schedule.id, distanceMiles: 5 });
      }
    },
    onError: (err: Error) => {
      if (err.message !== "PowerHop required") {
        showFlash("⚠️", err.message, "error");
      }
    },
  });

  const payScheduleMutation = useMutation({
    mutationFn: async ({ scheduleId, distanceMiles }: { scheduleId: number; distanceMiles: number }) => {
      const res = await apiRequest("POST", `/api/schedules/${scheduleId}/pay`, { distanceMiles });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/schedules'] });
      showFlash("💳", "Payment confirmed! You'll be pre-matched with a driver.", "success");
    },
    onError: () => {
      showFlash("⚠️", "Payment failed. Please try again.", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/schedules/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/schedules'] });
      setEditingSchedule(null);
      showFlash("✅", "Schedule updated", "success");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/schedules/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/schedules'] });
      showFlash("🗑️", "Schedule removed", "success");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/schedules/${id}`, { active });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/schedules'] });
    },
  });

  const handleSwipe = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (userModeLock !== "none") return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setPanelRole("hopper");
      else setPanelRole("driver");
    }
  };

  if (!user) return null;

  const handleUpgrade = () => {
    window.location.href = "/settings";
  };

  return (
    <div className="px-4 pt-1 pb-40 max-w-lg mx-auto">
      <ReadySetHop />

      <div className="mt-6 mb-4">
        <h1 className="text-xl font-bold text-foreground text-center" data-testid="text-schedule-title">Planned Hops</h1>
        <p className="text-xs text-muted-foreground text-center mt-1">Set recurring trips for automatic matching</p>
      </div>

      <div className="flex gap-2 mb-5">
        {!showForm && !editingSchedule && !showLongHopForm && (
          <>
            <Button
              onClick={() => {
                if (panelRole === "hopper" && !hasPowerHop) {
                  setShowSubscriptionPrompt(true);
                  return;
                }
                setShowForm(true);
                setShowLongHopForm(false);
              }}
              className={`flex-1 h-12 rounded-2xl gap-2 font-bold shadow-md ${
                panelRole === "driver"
                  ? "bg-green-500 hover:bg-green-600 text-white shadow-green-500/20"
                  : "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20"
              }`}
              data-testid="button-add-schedule"
            >
              <Calendar className="w-4 h-4" />
              {panelRole === "driver" ? "Plan a Drive" : "Schedule"}
            </Button>
            <Button
              onClick={() => {
                if (panelRole === "hopper" && !hasPowerHop) {
                  setShowSubscriptionPrompt(true);
                  return;
                }
                setShowLongHopForm(true);
                setShowForm(false);
              }}
              className={`flex-1 h-12 rounded-2xl gap-2 font-bold shadow-md ${
                panelRole === "driver"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                  : "bg-purple-500 hover:bg-purple-600 text-white shadow-purple-500/20"
              }`}
              data-testid="button-add-long-hop"
            >
              <RouteIcon className="w-4 h-4" />
              {panelRole === "driver" ? "Long Drive" : "Long Hop"}
            </Button>
          </>
        )}
      </div>

      <AnimatePresence>
        {showSubscriptionPrompt && !hasPowerHop && panelRole === "hopper" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4"
          >
            <PowerHopGate onUpgrade={handleUpgrade} />
            <button
              type="button"
              onClick={() => setShowSubscriptionPrompt(false)}
              className="w-full text-xs text-muted-foreground mt-2 hover:text-foreground"
              data-testid="button-dismiss-powerhop"
            >
              Maybe later
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {(showForm || showLongHopForm || editingSchedule) && (
        <Card className="mb-4 border-border/50 shadow-md rounded-2xl" data-testid="card-schedule-form">
          <CardContent className="p-4">
            <p className="text-sm font-bold text-foreground mb-3">
              {editingSchedule
                ? "Edit Schedule"
                : showLongHopForm
                  ? (panelRole === "driver" ? "New Long Drive" : "New Long Hop")
                  : (panelRole === "driver" ? "New Driver Schedule" : "New Schedule")}
            </p>
            <ScheduleForm
              initial={editingSchedule || undefined}
              isLongHop={showLongHopForm}
              role={panelRole}
              onSave={(data) => {
                if (editingSchedule) {
                  updateMutation.mutate({ id: editingSchedule.id, data });
                } else {
                  createMutation.mutate(data);
                }
              }}
              onCancel={() => {
                setShowForm(false);
                setShowLongHopForm(false);
                setEditingSchedule(null);
              }}
            />
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredSchedules.length === 0 && !showForm && !showLongHopForm ? (
        <Card className="border-border/50 shadow-sm rounded-2xl" data-testid="card-empty-schedules">
          <CardContent className="p-8 text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
              panelRole === "driver" ? "bg-green-50 dark:bg-green-950/30" : "bg-orange-50 dark:bg-orange-950/30"
            }`}>
              {panelRole === "driver"
                ? <Car className="w-8 h-8 text-green-500" />
                : <Calendar className="w-8 h-8 text-orange-500" />}
            </div>
            <p className="text-sm font-bold text-foreground mb-1">
              {panelRole === "driver" ? "No drives planned yet" : "No schedules yet"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {panelRole === "driver"
                ? "Plan your regular drives to get matched with hoppers going your way."
                : "Add your regular trips so we can match you with people going the same way."}
            </p>
            <Button
              onClick={() => {
                if (panelRole === "hopper" && !hasPowerHop) {
                  setShowSubscriptionPrompt(true);
                  return;
                }
                setShowForm(true);
              }}
              className={`rounded-xl gap-2 ${panelRole === "driver" ? "bg-green-500 hover:bg-green-600" : ""}`}
              data-testid="button-create-first-schedule"
            >
              <Plus className="w-4 h-4" />
              {panelRole === "driver" ? "Plan Your First Drive" : "Create Your First Schedule"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSchedules.map((schedule) => {
            const isExpanded = expandedId === schedule.id;
            const days = (schedule.days as string[]) || [];
            const isPaid = (schedule as any).paid;
            const schedRole = (schedule as any).role || "hopper";
            return (
              <Card
                key={schedule.id}
                className={`border-border/50 shadow-sm rounded-2xl transition-all ${!schedule.active ? 'opacity-60' : ''}`}
                data-testid={`card-schedule-${schedule.id}`}
              >
                <CardContent className="p-3">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between text-left"
                    onClick={() => setExpandedId(isExpanded ? null : schedule.id)}
                    data-testid={`button-expand-schedule-${schedule.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        schedRole === "driver" ? "bg-green-500/10" : "bg-primary/10"
                      }`}>
                        {schedRole === "driver"
                          ? <Car className="w-5 h-5 text-green-500" />
                          : <Calendar className="w-5 h-5 text-primary" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {schedule.startLocation} → {schedule.destination}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {(schedule as any).anytime ? (
                            <span className="text-[10px] text-green-600 font-bold">⚡ Anytime</span>
                          ) : (
                            <>
                              <span className="text-[10px] text-muted-foreground">{formatDays(days)}</span>
                              <span className="text-[10px] text-muted-foreground">•</span>
                              <span className="text-[10px] text-muted-foreground">{schedule.timeStart}–{schedule.timeEnd}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {schedRole === "hopper" && !isPaid && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-orange-200 text-orange-600">
                          <CreditCard className="w-3 h-3 mr-0.5" />
                          Unpaid
                        </Badge>
                      )}
                      {schedRole === "hopper" && isPaid && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-green-200 text-green-600">
                          Paid
                        </Badge>
                      )}
                      {schedule.returnTrip && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-orange-200 text-orange-600">
                          <ArrowLeftRight className="w-3 h-3 mr-0.5" />
                          Return
                        </Badge>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{schedule.startLocation}</span>
                          <span className="text-foreground font-medium">→</span>
                          <span>{schedule.destination}</span>
                        </div>
                        {(schedule as any).anytime ? (
                          <div className="flex items-center gap-2 text-xs">
                            <Sparkles className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-green-600 font-bold">Anytime — match whenever available</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{schedule.timeStart} – {schedule.timeEnd}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {days.map(d => (
                                <Badge key={d} variant="secondary" className="text-[10px] px-1.5 py-0">{d}</Badge>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {schedRole === "hopper" && !isPaid && (
                        <Button
                          size="sm"
                          className="w-full mb-3 h-9 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold"
                          onClick={() => payScheduleMutation.mutate({ scheduleId: schedule.id, distanceMiles: 5 })}
                          disabled={payScheduleMutation.isPending}
                          data-testid={`button-pay-schedule-${schedule.id}`}
                        >
                          {payScheduleMutation.isPending ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Processing...</>
                          ) : (
                            <><CreditCard className="w-3.5 h-3.5 mr-1" /> Pay & Activate</>
                          )}
                        </Button>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={schedule.active ?? true}
                            onCheckedChange={(active) => toggleMutation.mutate({ id: schedule.id, active })}
                            data-testid={`switch-active-${schedule.id}`}
                          />
                          <span className="text-xs text-muted-foreground">{schedule.active ? 'Active' : 'Paused'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => { setEditingSchedule(schedule); setExpandedId(null); }}
                            data-testid={`button-edit-schedule-${schedule.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => deleteMutation.mutate(schedule.id)}
                            data-testid={`button-delete-schedule-${schedule.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div
        className="fixed bottom-[4rem] left-0 right-0 z-30"
        onTouchStart={handleSwipe}
        onTouchEnd={handleSwipeEnd}
      >
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-background/95 backdrop-blur-xl rounded-t-2xl shadow-2xl border border-border/30 border-b-0 p-3 space-y-2">
            <div className="w-8 h-1 bg-muted-foreground/20 rounded-full mx-auto mb-1" />
            {userModeLock === "none" ? (
              <RolePanelToggle activeRole={panelRole} onChangeRole={setPanelRole} />
            ) : (
              <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl ${
                userModeLock === "driver_only"
                  ? "bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400"
                  : "bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400"
              }`} data-testid="schedule-mode-locked">
                <Lock className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">
                  {userModeLock === "driver_only" ? "🚗 Driver Only" : "🚶 Hopper Only"}
                </span>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground text-center">
              {panelRole === "driver"
                ? "Plan drives to receive scheduled matches"
                : hasPowerHop
                  ? "Schedule hops with advance payment"
                  : "PowerHop required to schedule hops"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
