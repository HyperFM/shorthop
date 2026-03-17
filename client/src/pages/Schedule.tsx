import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Trash2, Clock, MapPin, ArrowLeftRight, ChevronDown, ChevronUp, Pencil, Route as RouteIcon } from "lucide-react";
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

function ScheduleForm({ onSave, initial, onCancel, isLongHop = false }: {
  onSave: (data: any) => void;
  initial?: Schedule;
  onCancel: () => void;
  isLongHop?: boolean;
}) {
  const [days, setDays] = useState<string[]>((initial?.days as string[]) || []);
  const [startLocation, setStartLocation] = useState(initial?.startLocation || "");
  const [destination, setDestination] = useState(initial?.destination || "");
  const [timeStart, setTimeStart] = useState(initial?.timeStart || "07:30");
  const [timeEnd, setTimeEnd] = useState(initial?.timeEnd || "08:00");
  const [returnTrip, setReturnTrip] = useState(initial?.returnTrip || false);

  const toggleDay = (day: string) => {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (days.length === 0 || !startLocation || !destination) {
      showFlash("⚠️", "Fill in all fields and select at least one day", "error");
      return;
    }
    onSave({ days, startLocation, destination, timeStart, timeEnd, returnTrip });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isLongHop && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-700/30">
          <RouteIcon className="w-4 h-4 text-purple-500" />
          <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400">Long Hop — for longer commutes (10+ miles)</p>
        </div>
      )}
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

      <div className="flex items-center justify-between py-2 px-1">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground">Include return trip</span>
        </div>
        <Switch checked={returnTrip} onCheckedChange={setReturnTrip} data-testid="switch-return-trip" />
      </div>

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

export default function SchedulePage() {
  const { data: user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showLongHopForm, setShowLongHopForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: mySchedules = [], isLoading } = useQuery<Schedule[]>({
    queryKey: ['/api/schedules'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/schedules", data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/schedules'] });
      setShowForm(false);
      setShowLongHopForm(false);
      showFlash("📅", "Schedule saved!", "success");
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

  if (!user) return null;

  return (
    <div className="px-4 pt-1 pb-24 max-w-lg mx-auto">
      <ReadySetHop />

      <div className="mt-6 mb-4">
        <h1 className="text-xl font-bold text-foreground text-center" data-testid="text-schedule-title">Planned Hops</h1>
        <p className="text-xs text-muted-foreground text-center mt-1">Set recurring trips for automatic matching</p>
      </div>

      <div className="flex gap-2 mb-5">
        {!showForm && !editingSchedule && !showLongHopForm && (
          <>
            <Button
              onClick={() => { setShowForm(true); setShowLongHopForm(false); }}
              className="flex-1 h-12 rounded-2xl gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20"
              data-testid="button-add-schedule"
            >
              <Calendar className="w-4 h-4" />
              Schedule
            </Button>
            <Button
              onClick={() => { setShowLongHopForm(true); setShowForm(false); }}
              className="flex-1 h-12 rounded-2xl gap-2 bg-purple-500 hover:bg-purple-600 text-white font-bold shadow-md shadow-purple-500/20"
              data-testid="button-add-long-hop"
            >
              <RouteIcon className="w-4 h-4" />
              Long Hop
            </Button>
          </>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-center mb-4">Swipe up to see your scheduled hops</p>

      {(showForm || showLongHopForm || editingSchedule) && (
        <Card className="mb-4 border-border/50 shadow-md rounded-2xl" data-testid="card-schedule-form">
          <CardContent className="p-4">
            <p className="text-sm font-bold text-foreground mb-3">
              {editingSchedule ? "Edit Schedule" : showLongHopForm ? "New Long Hop" : "New Schedule"}
            </p>
            <ScheduleForm
              initial={editingSchedule || undefined}
              isLongHop={showLongHopForm}
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
      ) : mySchedules.length === 0 && !showForm && !showLongHopForm ? (
        <Card className="border-border/50 shadow-sm rounded-2xl" data-testid="card-empty-schedules">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-sm font-bold text-foreground mb-1">No schedules yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Add your regular trips so we can match you with people going the same way.
            </p>
            <Button onClick={() => setShowForm(true)} className="rounded-xl gap-2" data-testid="button-create-first-schedule">
              <Plus className="w-4 h-4" />
              Create Your First Schedule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {mySchedules.map((schedule) => {
            const isExpanded = expandedId === schedule.id;
            const days = (schedule.days as string[]) || [];
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
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {schedule.startLocation} → {schedule.destination}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{formatDays(days)}</span>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          <span className="text-[10px] text-muted-foreground">{schedule.timeStart}–{schedule.timeEnd}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
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
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{schedule.timeStart} – {schedule.timeEnd}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {days.map(d => (
                            <Badge key={d} variant="secondary" className="text-[10px] px-1.5 py-0">{d}</Badge>
                          ))}
                        </div>
                      </div>
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

    </div>
  );
}
