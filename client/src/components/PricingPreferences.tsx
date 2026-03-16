import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { showFlash } from "@/components/FlashNotification";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign, MapPin, Calendar, Clock, Send, Loader2 } from "lucide-react";

interface PlannedRideProps {
  user: any;
  activeTab: "hopper" | "driver";
}

export function PricingPreferences({ user, activeTab }: PlannedRideProps) {
  const queryClient = useQueryClient();
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const submitPlannedRide = useMutation({
    mutationFn: async (data: { startLocation: string; destination: string; timeStart: string; timeEnd: string; days: string[] }) => {
      const res = await apiRequest("POST", "/api/schedules", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setPickup("");
      setDestination("");
      setDate("");
      setTime("");
      showFlash("✅", "Planned ride submitted!", "success");
    },
    onError: () => {
      showFlash("❌", "Failed to submit planned ride", "error");
    },
  });

  const handleSubmit = () => {
    if (!pickup.trim() || !destination.trim() || !date || !time) {
      showFlash("⚠️", "Please fill in all fields", "error");
      return;
    }
    const dayAbbrevs = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayName = dayAbbrevs[new Date(date).getDay()];
    submitPlannedRide.mutate({
      startLocation: pickup.trim(),
      destination: destination.trim(),
      timeStart: time,
      timeEnd: time,
      days: [dayName],
    });
  };

  return (
    <div className="space-y-3">
      {activeTab === "driver" && (
        <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent" data-testid="card-driver-earnings">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2.5 mb-2">
              <DollarSign className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-xs font-black text-foreground">Driver Earnings</p>
            </div>
            <p className="text-sm text-foreground font-semibold" data-testid="text-driver-earnings-rate">
              Drivers earn $0.50 per 0.5 mile on routes they already drive.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/40" data-testid="card-planned-ride">
        <CardContent className="py-3 px-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
            <p className="text-xs font-black text-foreground">Plan a Ride</p>
          </div>
          <p className="text-[10px] text-muted-foreground">Schedule a future ride. Planned rides are prepaid before submission.</p>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-green-500 shrink-0" />
              <Input
                placeholder="Pickup location"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                className="text-xs h-8"
                data-testid="input-planned-pickup"
              />
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <Input
                placeholder="Destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="text-xs h-8"
                data-testid="input-planned-destination"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 flex-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-xs h-8"
                  data-testid="input-planned-date"
                />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="text-xs h-8"
                  data-testid="input-planned-time"
                />
              </div>
            </div>
          </div>

          <Button
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-9"
            onClick={handleSubmit}
            disabled={submitPlannedRide.isPending}
            data-testid="button-submit-planned-ride"
          >
            {submitPlannedRide.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit Planned Ride
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
