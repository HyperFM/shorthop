import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, MapPin, Navigation, X } from "lucide-react";
import type { ShortHop } from "@shared/schema";

interface ShareRideCardProps {
  hop: ShortHop;
  username: string;
  onClose: () => void;
}

function getHopTypeLabel(hopType: string): string {
  const labels: Record<string, string> = {
    walk: "Walk",
    short_hop: "Short Hop",
    flex_hop: "Flex Hop",
    full_ride: "Full Ride",
  };
  return labels[hopType] || hopType;
}

export function ShareRideCard({ hop, username, onClose }: ShareRideCardProps) {
  const [sharing, setSharing] = useState(false);

  const shareText = `I just completed a ${getHopTypeLabel(hop.hopType)} on ShortHop! From ${hop.startLocation} to ${hop.endLocation}${hop.distanceMiles ? ` (${hop.distanceMiles} mi)` : ""}. Join the community-powered ride network!`;

  const handleShare = async () => {
    setSharing(true);
    const shareData = {
      title: "My ShortHop Ride",
      text: shareText,
      url: window.location.origin,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareText + " " + window.location.origin);
      } catch {}
    }
    setSharing(false);
  };

  return (
    <Card className="relative overflow-visible">
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2"
        onClick={onClose}
        data-testid="button-close-share-card"
      >
        <X className="w-4 h-4" />
      </Button>
      <CardContent className="pt-6 pb-4 space-y-4">
        <div className="text-center space-y-2">
          <Badge className="bg-primary/10 text-primary border-primary/20">
            {getHopTypeLabel(hop.hopType)} Completed
          </Badge>
          <p className="text-sm text-muted-foreground">
            by <span className="font-semibold text-foreground">{username}</span>
          </p>
        </div>

        <div className="space-y-2 bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="text-foreground">{hop.startLocation}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Navigation className="w-4 h-4 text-secondary shrink-0" />
            <span className="text-foreground">{hop.endLocation}</span>
          </div>
          {hop.distanceMiles && (
            <p className="text-xs text-muted-foreground pl-6">
              {hop.distanceMiles} miles
            </p>
          )}
        </div>

        <Button
          className="w-full"
          onClick={handleShare}
          disabled={sharing}
          data-testid="button-share-ride"
        >
          <Share2 className="w-4 h-4 mr-2" />
          {sharing ? "Sharing..." : "Share This Ride"}
        </Button>
      </CardContent>
    </Card>
  );
}
