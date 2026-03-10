import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Flame, Car, MessageCircle, Trophy, Medal, Award } from "lucide-react";
import { api } from "@shared/routes";

type LeaderboardData = {
  mostHops: { username: string; totalHops: number; isDriver: boolean | null }[];
  topDrivers: { username: string; credits: number }[];
  communityHoppers: { username: string; postCount: number }[];
};

type TabKey = "mostHops" | "topDrivers" | "communityHoppers";

const tabs: { key: TabKey; label: string; icon: typeof Flame }[] = [
  { key: "mostHops", label: "Most Hops", icon: Flame },
  { key: "topDrivers", label: "Top Drivers", icon: Car },
  { key: "communityHoppers", label: "Community", icon: MessageCircle },
];

function getRankIcon(index: number) {
  if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
  if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
  if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
  return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{index + 1}</span>;
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
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-12" />
        </div>
      ));
    }

    const list = data[activeTab];

    if (!list || list.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No data yet. Be the first on the board!
        </div>
      );
    }

    return list.map((entry, index) => {
      const isCurrentUser = user && entry.username === user.username;
      return (
        <div
          key={entry.username}
          data-testid={`row-leaderboard-${index}`}
          className={`flex items-center gap-3 p-3 rounded-md ${isCurrentUser ? "bg-primary/5 border border-primary/20" : ""}`}
        >
          <div className="flex-shrink-0">{getRankIcon(index)}</div>
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm truncate block" data-testid={`text-username-${index}`}>
              {entry.username}
            </span>
            {activeTab === "mostHops" && "isDriver" in entry && (
              <span className="text-xs text-muted-foreground">
                {(entry as LeaderboardData["mostHops"][0]).isDriver ? "Driver" : "Walker"}
              </span>
            )}
          </div>
          <Badge variant="secondary" data-testid={`text-score-${index}`}>
            {activeTab === "mostHops" && `${(entry as LeaderboardData["mostHops"][0]).totalHops} hops`}
            {activeTab === "topDrivers" && `${(entry as LeaderboardData["topDrivers"][0]).credits} wheels`}
            {activeTab === "communityHoppers" && `${(entry as LeaderboardData["communityHoppers"][0]).postCount} posts`}
          </Badge>
        </div>
      );
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Leaderboard</h1>
        <p className="text-muted-foreground text-sm mt-1">See who's leading the Short Hop community</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap" data-testid="tabs-leaderboard">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              data-testid={`tab-${tab.key}`}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors toggle-elevate ${isActive ? "bg-primary text-primary-foreground toggle-elevated" : "text-muted-foreground"}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base">
            {tabs.find((t) => t.key === activeTab)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="divide-y" data-testid="list-leaderboard">
            {renderList()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
