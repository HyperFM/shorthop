import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Flame, Car, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@shared/routes";

type LeaderboardData = {
  mostHops: { username: string; totalHops: number; isDriver: boolean | null }[];
  topDrivers: { username: string; credits: number }[];
  communityHoppers: { username: string; postCount: number }[];
};

type TabKey = "mostHops" | "topDrivers" | "communityHoppers";

const tabs: { key: TabKey; label: string; icon: typeof Flame; emoji: string }[] = [
  { key: "mostHops", label: "Most Hops", icon: Flame, emoji: "🔥" },
  { key: "topDrivers", label: "Top Drivers", icon: Car, emoji: "🚗" },
  { key: "communityHoppers", label: "Community", icon: MessageCircle, emoji: "💬" },
];

function getRankDisplay(index: number) {
  if (index === 0) return { emoji: "🥇", bg: "bg-gradient-to-r from-yellow-400/20 to-yellow-500/10 border-yellow-400/30" };
  if (index === 1) return { emoji: "🥈", bg: "bg-gradient-to-r from-gray-300/20 to-gray-400/10 border-gray-400/30" };
  if (index === 2) return { emoji: "🥉", bg: "bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-amber-600/30" };
  return { emoji: `${index + 1}`, bg: "" };
}

export default function Leaderboard() {
  const { data: user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("mostHops");

  const { data, isLoading } = useQuery<LeaderboardData>({
    queryKey: [api.leaderboard.get.path],
  });

  const renderList = () => {
    if (isLoading || !data) {
      return Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ));
    }

    const list = data[activeTab];

    if (!list || list.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 space-y-3"
        >
          <motion.span
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-5xl block"
          >
            🏆
          </motion.span>
          <p className="text-muted-foreground font-medium">No champions yet!</p>
          <p className="text-sm text-muted-foreground">Be the first on the board!</p>
        </motion.div>
      );
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {list.map((entry, index) => {
            const isCurrentUser = user && entry.username === user.username;
            const rank = getRankDisplay(index);
            return (
              <motion.div
                key={entry.username}
                data-testid={`row-leaderboard-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-xl mb-2 transition-all hover:scale-[1.01] ${
                  isCurrentUser 
                    ? "bg-primary/10 border-2 border-primary/30 shadow-md" 
                    : rank.bg ? `${rank.bg} border` : "hover:bg-muted/50"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xl font-black flex-shrink-0">
                  {rank.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm truncate block" data-testid={`text-username-${index}`}>
                    {entry.username}
                    {isCurrentUser && <span className="text-primary ml-1">(you!)</span>}
                  </span>
                  {activeTab === "mostHops" && "isDriver" in entry && (
                    <span className="text-xs text-muted-foreground">
                      {(entry as LeaderboardData["mostHops"][0]).isDriver ? "🚗 Driver" : "🏃 Walker"}
                    </span>
                  )}
                </div>
                <Badge className="bg-gradient-to-r from-primary/10 to-accent/10 text-foreground border-primary/20 font-bold" data-testid={`text-score-${index}`}>
                  {activeTab === "mostHops" && `${(entry as LeaderboardData["mostHops"][0]).totalHops} hops`}
                  {activeTab === "topDrivers" && `${((entry as LeaderboardData["topDrivers"][0]).credits || 0).toFixed(2)} 🛞`}
                  {activeTab === "communityHoppers" && `${(entry as LeaderboardData["communityHoppers"][0]).postCount} posts`}
                </Badge>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 text-center"
      >
        <motion.span
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-4xl inline-block mb-2"
        >
          🏆
        </motion.span>
        <h1 className="text-2xl font-black" data-testid="text-page-title">Leaderboard</h1>
        <p className="text-muted-foreground text-sm mt-1">See who's leading the Short Hop community</p>
      </motion.div>

      <div className="flex gap-2 mb-4 flex-wrap justify-center" data-testid="tabs-leaderboard">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <motion.button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              data-testid={`tab-${tab.key}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold transition-all ${
                isActive 
                  ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/30" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </motion.button>
          );
        })}
      </div>

      <Card className="game-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {tabs.find((t) => t.key === activeTab)?.emoji}
            {tabs.find((t) => t.key === activeTab)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div data-testid="list-leaderboard">
            {renderList()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
