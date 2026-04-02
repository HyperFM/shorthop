import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

export const ALL_INTERESTS = [
  { id: "anime", label: "Anime", emoji: "🎌" },
  { id: "kpop", label: "K-Pop", emoji: "🎤" },
  { id: "gaming", label: "Gaming", emoji: "🎮" },
  { id: "manga", label: "Manga", emoji: "📚" },
  { id: "cosplay", label: "Cosplay", emoji: "🎭" },
  { id: "basketball", label: "Basketball", emoji: "🏀" },
  { id: "football", label: "Football", emoji: "🏈" },
  { id: "soccer", label: "Soccer", emoji: "⚽" },
  { id: "running", label: "Running", emoji: "🏃" },
  { id: "gym", label: "Gym", emoji: "💪" },
  { id: "yoga", label: "Yoga", emoji: "🧘" },
  { id: "hiking", label: "Hiking", emoji: "🥾" },
  { id: "skateboarding", label: "Skateboarding", emoji: "🛹" },
  { id: "hip_hop", label: "Hip Hop", emoji: "🎧" },
  { id: "r_and_b", label: "R&B", emoji: "🎵" },
  { id: "country", label: "Country", emoji: "🤠" },
  { id: "rock", label: "Rock", emoji: "🎸" },
  { id: "edm", label: "EDM", emoji: "🎛️" },
  { id: "jazz", label: "Jazz", emoji: "🎷" },
  { id: "podcasts", label: "Podcasts", emoji: "🎙️" },
  { id: "true_crime", label: "True Crime", emoji: "🔍" },
  { id: "horror", label: "Horror", emoji: "👻" },
  { id: "sci_fi", label: "Sci-Fi", emoji: "🚀" },
  { id: "marvel", label: "Marvel", emoji: "🦸" },
  { id: "dc", label: "DC", emoji: "🦇" },
  { id: "star_wars", label: "Star Wars", emoji: "⭐" },
  { id: "harry_potter", label: "Harry Potter", emoji: "⚡" },
  { id: "cooking", label: "Cooking", emoji: "👨‍🍳" },
  { id: "baking", label: "Baking", emoji: "🧁" },
  { id: "coffee", label: "Coffee", emoji: "☕" },
  { id: "thrifting", label: "Thrifting", emoji: "🛍️" },
  { id: "photography", label: "Photography", emoji: "📸" },
  { id: "art", label: "Art", emoji: "🎨" },
  { id: "music_production", label: "Music Production", emoji: "🎹" },
  { id: "streaming", label: "Streaming", emoji: "📺" },
  { id: "tiktok", label: "TikTok", emoji: "📱" },
  { id: "cats", label: "Cats", emoji: "🐱" },
  { id: "dogs", label: "Dogs", emoji: "🐕" },
  { id: "plants", label: "Plants", emoji: "🪴" },
  { id: "cars", label: "Cars", emoji: "🏎️" },
  { id: "sneakers", label: "Sneakers", emoji: "👟" },
  { id: "fashion", label: "Fashion", emoji: "👗" },
  { id: "tattoos", label: "Tattoos", emoji: "🖋️" },
  { id: "spirituality", label: "Spirituality", emoji: "🙏" },
  { id: "astrology", label: "Astrology", emoji: "♈" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "camping", label: "Camping", emoji: "⛺" },
  { id: "fishing", label: "Fishing", emoji: "🎣" },
  { id: "board_games", label: "Board Games", emoji: "🎲" },
  { id: "crypto", label: "Crypto", emoji: "🪙" },
  { id: "tech", label: "Tech", emoji: "💻" },
  { id: "startups", label: "Startups", emoji: "🚀" },
  { id: "reading", label: "Reading", emoji: "📖" },
  { id: "writing", label: "Writing", emoji: "✍️" },
  { id: "comedy", label: "Comedy", emoji: "😂" },
  { id: "reality_tv", label: "Reality TV", emoji: "📺" },
  { id: "wrestling", label: "Wrestling", emoji: "🤼" },
  { id: "mma", label: "MMA", emoji: "🥊" },
  { id: "uk_wildcats", label: "UK Wildcats", emoji: "🐾" },
  { id: "vinyl", label: "Vinyl", emoji: "🎶" },
  { id: "diy", label: "DIY", emoji: "🔧" },
  { id: "hyper_fm", label: "HyperFM", emoji: "1️⃣🎸👩🏽‍🎤1️⃣" },
  { id: "pole_dancing", label: "Pole Dancing", emoji: "🪩" },
  { id: "sewing", label: "Sewing", emoji: "🧶" },
  { id: "gardening", label: "Gardening", emoji: "🌻" },
  { id: "dancing", label: "Dancing", emoji: "💃" },
  { id: "swimming", label: "Swimming", emoji: "🏊" },
  { id: "boxing", label: "Boxing", emoji: "🥊" },
  { id: "painting", label: "Painting", emoji: "🖌️" },
  { id: "karaoke", label: "Karaoke", emoji: "🎤" },
  { id: "movies", label: "Movies", emoji: "🎬" },
  { id: "volleyball", label: "Volleyball", emoji: "🏐" },
  { id: "tennis", label: "Tennis", emoji: "🎾" },
  { id: "cycling", label: "Cycling", emoji: "🚴" },
  { id: "meditation", label: "Meditation", emoji: "🧘‍♂️" },
  { id: "woodworking", label: "Woodworking", emoji: "🪵" },
  { id: "nail_art", label: "Nail Art", emoji: "💅" },
  { id: "makeup", label: "Makeup", emoji: "💄" },
];

interface InterestBubblesProps {
  selected: string[];
  onChange: (interests: string[]) => void;
  maxSelections?: number;
  readOnly?: boolean;
}

export function InterestBubbles({ selected, onChange, maxSelections = 12, readOnly = false }: InterestBubblesProps) {
  const toggle = (id: string) => {
    if (readOnly) return;
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else if (selected.length < maxSelections) {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5" data-testid="interest-bubbles">
      {ALL_INTERESTS.map((interest) => {
        const isSelected = selected.includes(interest.id);
        return (
          <motion.button
            key={interest.id}
            whileTap={readOnly ? {} : { scale: 0.92 }}
            onClick={() => toggle(interest.id)}
            className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-1 transition-all ${
              isSelected
                ? "bg-green-500 text-white shadow-sm shadow-green-500/30"
                : readOnly
                  ? "bg-muted/50 text-muted-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted active:bg-green-100 dark:hover:bg-muted/80"
            } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
            data-testid={`interest-${interest.id}`}
          >
            <span>{interest.emoji}</span>
            <span>{interest.label}</span>
            {isSelected && !readOnly && <Check className="w-3 h-3 ml-0.5" />}
          </motion.button>
        );
      })}
    </div>
  );
}

export function InterestTags({ interests, highlight }: { interests: string[]; highlight?: string[] }) {
  const interestMap = new Map(ALL_INTERESTS.map(i => [i.id, i]));
  return (
    <div className="flex flex-wrap gap-1" data-testid="interest-tags">
      {interests.map(id => {
        const interest = interestMap.get(id);
        if (!interest) return null;
        const isShared = highlight?.includes(id);
        return (
          <span
            key={id}
            className={`inline-flex items-center gap-0.5 text-[10px] rounded-full px-2 py-0.5 ${
              isShared
                ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-bold ring-1 ring-orange-300 dark:ring-orange-700"
                : "bg-muted/60 text-muted-foreground"
            }`}
            data-testid={`tag-${id}${isShared ? '-shared' : ''}`}
          >
            <span>{interest.emoji}</span>
            <span>{interest.label}</span>
          </span>
        );
      })}
    </div>
  );
}

export function SharedInterestsBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 text-[10px] font-bold bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/30 text-orange-700 dark:text-orange-300 rounded-full px-2.5 py-1 shadow-sm"
      data-testid="shared-interests-badge"
    >
      <span>🤝</span>
      <span>{count} thing{count !== 1 ? 's' : ''} in common!</span>
    </motion.div>
  );
}
