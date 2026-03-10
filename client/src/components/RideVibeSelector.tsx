import { Volume2, MessageCircle, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const VIBES = [
  {
    value: "quiet",
    label: "Quiet Ride",
    description: "Minimal conversation",
    icon: Volume2,
    emoji: "🤫",
  },
  {
    value: "friendly_chat",
    label: "Friendly Chat",
    description: "Open to small talk",
    icon: MessageCircle,
    emoji: "😊",
  },
  {
    value: "community",
    label: "Community Mode",
    description: "Happy to connect",
    icon: Users,
    emoji: "🤝",
  },
] as const;

interface RideVibeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function RideVibeSelector({ value, onChange, disabled }: RideVibeSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {VIBES.map((vibe) => {
        const isSelected = value === vibe.value;
        return (
          <button
            key={vibe.value}
            type="button"
            disabled={disabled}
            data-testid={`vibe-${vibe.value}`}
            className="text-left focus:outline-none"
            onClick={() => onChange(vibe.value)}
          >
            <Card className={`transition-all cursor-pointer ${
              isSelected
                ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                : "hover:border-muted-foreground/30"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <span className="text-2xl" aria-hidden="true">{vibe.emoji}</span>
                <span className="font-semibold text-sm text-foreground">{vibe.label}</span>
                <span className="text-xs text-muted-foreground">{vibe.description}</span>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
