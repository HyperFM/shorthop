import { useState } from "react";
import { Star, AlertTriangle, ThumbsUp, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

const RATINGS = [
  { value: "great_hop", label: "Great Hop", icon: "⭐", color: "text-yellow-500" },
  { value: "good_ride", label: "Good Ride", icon: "⭐", color: "text-yellow-400" },
  { value: "neutral", label: "Neutral", icon: "⭐", color: "text-muted-foreground" },
  { value: "issue", label: "Issue", icon: "⚠", color: "text-destructive" },
] as const;

interface HopBuddyRatingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: number;
  ratedUserId: number;
  ratedUsername?: string;
  userTier?: string | null;
}

export function HopBuddyRating({
  open,
  onOpenChange,
  tripId,
  ratedUserId,
  ratedUsername,
  userTier,
}: HopBuddyRatingProps) {
  const [selectedRating, setSelectedRating] = useState<string | null>(null);
  const [wantRideAgain, setWantRideAgain] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitRating = useMutation({
    mutationFn: async () => {
      if (!selectedRating) return;
      await apiRequest(api.ratings.create.method, api.ratings.create.path, {
        tripId,
        ratedUserId,
        rating: selectedRating,
        wantRideAgain,
      });
    },
    onSuccess: () => {
      toast({ title: "Thanks for the feedback!", description: "Your rating helps build a trusted community." });
      queryClient.invalidateQueries({ queryKey: [api.hops.list.path] });
      onOpenChange(false);
      setSelectedRating(null);
      setWantRideAgain(false);
    },
  });

  const followUser = useMutation({
    mutationFn: async () => {
      const url = buildUrl(api.follows.follow.path, { id: ratedUserId });
      await apiRequest(api.follows.follow.method, url);
    },
    onSuccess: () => {
      toast({ title: "Following!", description: `You're now following ${ratedUsername || "this user"}.` });
      queryClient.invalidateQueries({ queryKey: [api.follows.list.path] });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl" data-testid="text-rating-title">
            How was your Hop Buddy?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-3">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                type="button"
                data-testid={`rating-${r.value}`}
                onClick={() => setSelectedRating(r.value)}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  selectedRating === r.value
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <span className={`text-2xl ${r.color}`}>{r.icon}</span>
                <p className="text-sm font-medium mt-1">{r.label}</p>
              </button>
            ))}
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ride-again"
                data-testid="checkbox-ride-again"
                checked={wantRideAgain}
                onCheckedChange={(checked) => setWantRideAgain(!!checked)}
              />
              <Label htmlFor="ride-again" className="text-sm cursor-pointer flex items-center gap-1.5">
                <ThumbsUp className="w-3.5 h-3.5" />
                Ride again with this person
              </Label>
            </div>

            {userTier === "flexhop" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                data-testid="button-follow-buddy"
                onClick={() => followUser.mutate()}
                disabled={followUser.isPending}
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                Follow Hop Buddy
              </Button>
            )}
          </div>

          <Button
            className="w-full"
            data-testid="button-submit-rating"
            disabled={!selectedRating || submitRating.isPending}
            onClick={() => submitRating.mutate()}
          >
            {submitRating.isPending ? "Submitting..." : "Submit Rating"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
