import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, Bell } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import type { User } from "@shared/routes";

interface WelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export function WelcomeModal({ open, onOpenChange, user }: WelcomeModalProps) {
  const queryClient = useQueryClient();

  const dismiss = useMutation({
    mutationFn: async () => {
      await apiRequest(api.profile.dismissWelcome.method, api.profile.dismissWelcome.path);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      onOpenChange(false);
    },
  });

  const handleInvite = async () => {
    const shareData = {
      title: "Join ShortHop",
      text: "Join me on ShortHop — a new way for people in Lexington to share rides along their routes. Shared routes. Real connections.",
      url: window.location.origin,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      await navigator.clipboard.writeText(
        `${shareData.text} ${shareData.url}`
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss.mutate(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 p-8">
          <div className="text-center space-y-6">
            <div className="text-5xl">🛞</div>
            <h2 className="text-2xl font-display font-bold text-foreground" data-testid="text-welcome-title">
              Welcome to ShortHop
            </h2>

            {user.isFounder && user.founderBadge && (
              <Badge className="bg-gradient-to-r from-orange-500 to-green-500 text-white border-0 px-4 py-1.5 text-sm font-bold" data-testid="badge-founder">
                🛞 {user.founderBadge}
              </Badge>
            )}

            <div className="text-left space-y-4 text-sm text-muted-foreground leading-relaxed bg-background/60 rounded-xl p-6 backdrop-blur-sm">
              <p>
                <strong className="text-foreground">Hey {user.isDriver ? "Driver" : "Hopper"}!</strong>
              </p>
              <p>
                You're one of the early people helping bring something new to life in Lexington.
              </p>
              <p>
                Apps that connect people — like Uber or Airbnb — didn't grow overnight. They started with small communities of people who believed in the idea.
              </p>
              <p>
                ShortHop is starting right here in Lexington, and together we're building a new way to move around the city.
              </p>
              <p>
                Right now rides may not appear instantly yet — but every new Hopper and Driver brings us closer to that moment where a ride is just minutes away.
              </p>
              <p className="font-medium text-foreground">
                And the best part? You're part of the beginning.
              </p>
              <p>
                Invite friends, tell family, and help grow the network. Every new user helps the city move a little more together.
              </p>
              <p>
                We'll keep you updated as our community grows.
              </p>
              <p className="italic text-primary font-medium">
                Shared routes. Real connections.
              </p>
              <p className="font-bold text-foreground">– SHORT HOP</p>
            </div>

            {user.isFounder && (
              <Card className="border-secondary/30 bg-secondary/5">
                <CardContent className="p-4 text-center">
                  <p className="text-sm font-semibold text-foreground">
                    🎉 You earned {user.founderBadge} status!
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lifetime FlexHop access and early supporter recognition.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                data-testid="button-invite-friends"
                className="flex-1"
                onClick={handleInvite}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Invite Friends
              </Button>
              <Button
                data-testid="button-dismiss-welcome"
                variant="outline"
                className="flex-1"
                onClick={() => dismiss.mutate()}
                disabled={dismiss.isPending}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
