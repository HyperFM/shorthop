import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, buildUrl } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Share2, Check, Eye, UserPlus, MessageCircle, X } from "lucide-react";
import { FlyersModal } from "@/components/FlyersModal";
import { showFlash } from "@/components/FlashNotification";
import type { User } from "@shared/routes";
import driverIconUrl from "@assets/Untitled_design_1773938700510.png";
import hopperIconUrl from "@assets/Untitled_design_1773938781771.png";
import driverWithHopperIconUrl from "@assets/Untitled_design_1773938803778.png";

interface NetworkStats {
  totalUsers: number;
  totalDrivers: number;
  totalHoppers: number;
  nextMilestone: number;
  foundingHoppersRemaining: number;
  foundingDriversRemaining: number;
}

interface PendingRatingData {
  tripId: number;
  partnerId: number;
  partnerName: string;
  partnerPhoto: string | null;
  partnerInterests: string[];
  partnerBio: string | null;
  role: string;
}

export function NetworkProgress() {
  const [copied, setCopied] = useState(false);
  const [flyersOpen, setFlyersOpen] = useState(false);
  const queryClient = useQueryClient();

  const [networkBuddy, setNetworkBuddy] = useState<PendingRatingData | null>(() => {
    try {
      const raw = sessionStorage.getItem("sh_network_buddy");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const { data: user } = useQuery<User>({
    queryKey: [api.auth.me.path],
  });

  const followUser = useMutation({
    mutationFn: async (userId: number) => {
      const url = buildUrl(api.follows.follow.path, { id: userId });
      await apiRequest(api.follows.follow.method, url);
    },
    onSuccess: () => {
      showFlash("👥", `Added ${networkBuddy?.partnerName || "user"} as a friend!`, "success");
      queryClient.invalidateQueries({ queryKey: [api.follows.list.path] });
    },
  });

  const handleNetworkRatingDismiss = () => {
    try { sessionStorage.removeItem("sh_network_buddy"); } catch {}
    setNetworkBuddy(null);
  };

  const showNetworkRating = !!networkBuddy;

  const { data: stats, isLoading } = useQuery<NetworkStats>({
    queryKey: [api.network.stats.path],
    queryFn: async () => {
      const res = await fetch(api.network.stats.path);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 60000,
  });

  if (isLoading || !stats) return null;

  const progress = Math.min(100, (stats.totalUsers / stats.nextMilestone) * 100);

  const shareReferral = async () => {
    if (!user?.referralCode) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join ShortHop!",
          text: `Use my referral code "${user.referralCode}" to join ShortHop — you're already moving… you might as well get paid, or ride for as low as $1 per half mile.`,
        });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(user.referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card data-testid="card-network-progress" className="game-card border-primary/20 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full pointer-events-none" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-xl"
            >
              🎯
            </motion.span>
            Lexington ShortHop Network
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showNetworkRating && networkBuddy && (
            <div className="rounded-xl border border-orange-200 dark:border-orange-800/40 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-3 space-y-2.5" data-testid="network-hop-buddy">
              <div className="flex items-center gap-3">
                {networkBuddy.partnerPhoto ? (
                  <img src={networkBuddy.partnerPhoto} className="w-11 h-11 rounded-full border-2 border-orange-400 object-cover flex-shrink-0" alt="" />
                ) : (
                  <img src={networkBuddy.role === "driver" ? driverIconUrl : hopperIconUrl} className="w-11 h-11 rounded-full border-2 border-orange-400 object-contain flex-shrink-0 bg-white dark:bg-gray-800" alt="" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground dark:text-white truncate">
                    <span className="text-orange-500">{networkBuddy.partnerName}</span>
                  </p>
                  {networkBuddy.partnerBio && (
                    <p className="text-[10px] text-muted-foreground dark:text-gray-400 truncate">{networkBuddy.partnerBio}</p>
                  )}
                </div>
                <button type="button" onClick={handleNetworkRatingDismiss} className="p-1 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/40 flex-shrink-0" data-testid="button-dismiss-network-rating">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              {networkBuddy.partnerInterests && networkBuddy.partnerInterests.length > 0 && user?.interests && (user.interests as string[]).length > 0 && (
                (() => {
                  const common = (networkBuddy.partnerInterests as string[]).filter(i => (user.interests as string[]).includes(i));
                  if (common.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-1">
                      {common.map(interest => (
                        <span key={interest} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200/50 dark:border-orange-700/30">
                          ✨ {interest}
                        </span>
                      ))}
                    </div>
                  );
                })()
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-[10px] font-bold gap-1 rounded-lg border-orange-200 dark:border-orange-700/40 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  onClick={() => followUser.mutate(networkBuddy.partnerId)}
                  disabled={followUser.isPending}
                  data-testid="button-add-friend-network"
                >
                  <UserPlus className="w-3 h-3" />
                  Add Friend
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-[10px] font-bold gap-1 rounded-lg border-blue-200 dark:border-blue-700/40 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  onClick={() => {
                    handleNetworkRatingDismiss();
                    window.dispatchEvent(new CustomEvent("sh-open-chat", { detail: { userId: networkBuddy.partnerId, username: networkBuddy.partnerName } }));
                  }}
                  data-testid="button-chat-network"
                >
                  <MessageCircle className="w-3 h-3" />
                  Chat
                </Button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center p-3 rounded-2xl bg-gradient-to-b from-secondary/10 to-secondary/5 border border-secondary/20"
            >
              <img src={driverIconUrl} alt="Driver" style={{ width: '46.2px', height: '46.2px' }} className="mx-auto mb-1 object-contain" />
              <p className="text-2xl font-black text-foreground" data-testid="text-driver-count">{stats.totalDrivers}</p>
              <p className="text-[11px] text-muted-foreground font-bold uppercase">Drivers</p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center p-3 rounded-2xl bg-gradient-to-b from-primary/10 to-primary/5 border border-primary/20"
            >
              <img src={hopperIconUrl} alt="Hopper" className="w-8 h-8 mx-auto mb-1 object-contain" />
              <p className="text-2xl font-black text-foreground" data-testid="text-hopper-count">{stats.totalHoppers}</p>
              <p className="text-[11px] text-muted-foreground font-bold uppercase">Hoppers</p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center p-3 rounded-2xl bg-gradient-to-b from-accent/10 to-accent/5 border border-accent/20"
            >
              <img src={driverWithHopperIconUrl} alt="Total" style={{ width: '46.2px', height: '46.2px' }} className="mx-auto mb-1 object-contain" />
              <p className="text-2xl font-black text-foreground" data-testid="text-total-count">{stats.totalUsers}</p>
              <p className="text-[11px] text-muted-foreground font-bold uppercase">Total</p>
            </motion.div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Level Progress</span>
              <span className="font-bold text-foreground flex items-center gap-1">
                🎮 Next: {stats.nextMilestone.toLocaleString()} users
              </span>
            </div>
            <div className="xp-bar">
              <motion.div 
                className="xp-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
              />
            </div>
          </div>

          {stats.foundingHoppersRemaining > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              <motion.div whileHover={{ scale: 1.05 }}>
                <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 gap-1" data-testid="badge-founding-spots">
                  🛞 {stats.foundingHoppersRemaining} Founding Member spots left!
                </Badge>
              </motion.div>
            </div>
          )}

          {user?.referralCode && (
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] font-bold gap-1.5 rounded-full border-secondary/30 bg-secondary/5 hover:bg-secondary/10"
                onClick={shareReferral}
                data-testid="button-goal-referral"
              >
                {copied ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                {copied ? "Copied!" : "Invite friends to help grow!"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] font-bold gap-1.5 rounded-full border-amber-300/30 bg-amber-50/5 hover:bg-amber-50/10 dark:border-amber-700/30 dark:bg-amber-950/5 dark:hover:bg-amber-950/10"
                onClick={() => setFlyersOpen(true)}
                data-testid="button-flyers"
              >
                📑
                Flyers
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] font-bold gap-1.5 rounded-full border-primary/30 bg-primary/5 hover:bg-primary/10"
                onClick={() => window.open("https://beacons.ai/hyperfm", "_blank")}
                data-testid="button-connect-beacons"
              >
                <Eye className="w-3 h-3" />
                Connect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <FlyersModal isOpen={flyersOpen} onClose={() => setFlyersOpen(false)} />
    </motion.div>
  );
}
