import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Navigation, Clock, Users, ChevronRight, Zap, X } from "lucide-react";

interface SmartMatch {
  scheduleId: number;
  username: string;
  corridor: string | null;
  direction: string;
  timeWindow: string;
  matchType: string;
}

interface SmartMatchResponse {
  matches: SmartMatch[];
  firstHopAssist: boolean;
  completedHops: number;
}

export function SmartMatchCard({ onRequestHop }: { onRequestHop?: (direction: string) => void }) {
  const [dismissed, setDismissed] = useState(false);
  const { data } = useQuery<SmartMatchResponse>({
    queryKey: ['/api/smart-matches'],
    refetchInterval: 30000,
    retry: 1,
    staleTime: 10000,
  });

  if (dismissed || !data || (data.matches.length === 0 && !data.firstHopAssist)) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        {data.firstHopAssist && data.matches.length === 0 && (
          <Card className="border-green-500/30 bg-green-500/5 mb-4" data-testid="card-first-hop-assist">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-400">First Hop Assist</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      We're prioritizing matches for you. Add a schedule so we can find someone heading your way!
                    </p>
                  </div>
                </div>
                <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {data.matches.length > 0 && (
          <Card className="border-orange-500/30 bg-orange-500/5 mb-4" data-testid="card-smart-matches">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-semibold text-orange-400">
                    {data.firstHopAssist ? "First Hop Assist" : "Smart Matches"}
                  </span>
                </div>
                <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {data.firstHopAssist && (
                <p className="text-xs text-muted-foreground mb-3">
                  Someone nearby is heading your way. Want to Hop together?
                </p>
              )}

              <div className="space-y-2">
                {data.matches.map((match, i) => (
                  <motion.div
                    key={match.scheduleId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-background/50 border border-border/50"
                    data-testid={`smart-match-${match.scheduleId}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-orange-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{match.username}</span>
                          {match.matchType === "first_hop_assist" && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/50 text-green-400">
                              Priority
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Navigation className="w-3 h-3" />
                          <span className="truncate">{match.direction}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{match.timeWindow}</span>
                          </div>
                          {match.corridor && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {match.corridor}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-orange-400 hover:text-orange-300"
                      onClick={() => onRequestHop?.(match.direction)}
                      data-testid={`button-hop-match-${match.scheduleId}`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
