import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Search, X, Shield, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { showFlash } from "@/components/FlashNotification";

interface StarHopperData {
  id: number;
  starUserId: number;
  username: string;
  isDriver: boolean;
  idVerified: boolean;
  createdAt: string;
}

interface SearchResult {
  id: number;
  username: string;
  isDriver: boolean;
  idVerified: boolean;
  isStarred: boolean;
}

interface StarHoppersProps {
  userId: number;
}

export function StarHoppers({ userId }: StarHoppersProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: starHoppers = [], isLoading } = useQuery<StarHopperData[]>({
    queryKey: ['/api/star-hoppers'],
  });

  const { data: searchResults = [] } = useQuery<SearchResult[]>({
    queryKey: ['/api/star-hoppers/search', searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const res = await fetch(`/api/star-hoppers/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const addStar = useMutation({
    mutationFn: async (starUserId: number) => {
      const res = await apiRequest("POST", "/api/star-hoppers", { starUserId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/star-hoppers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/star-hoppers/search'] });
      showFlash("⭐", "Star Hopper added!", "success");
    },
  });

  const removeStar = useMutation({
    mutationFn: async (starUserId: number) => {
      await apiRequest("DELETE", `/api/star-hoppers/${starUserId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/star-hoppers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/star-hoppers/search'] });
      showFlash("✨", "Star Hopper removed", "info");
    },
  });

  return (
    <Card className="border-yellow-400/30 bg-gradient-to-br from-yellow-400/5 via-amber-300/5 to-transparent" data-testid="card-star-hoppers">
      <CardContent className="py-3 px-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-pulse" />
            </div>
            <p className="text-xs font-black text-foreground">Star Hoppers ⭐</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] font-bold gap-1 rounded-full border-yellow-400/50 px-2 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
            onClick={() => { setShowSearch(!showSearch); setSearchQuery(""); }}
            data-testid="button-search-star-hopper"
          >
            {showSearch ? <X className="w-3 h-3" /> : <Search className="w-3 h-3" />}
            {showSearch ? "Close" : "Add"}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Ride more often with your favorite people. We'll prioritize matching you with them when possible.
        </p>

        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 p-3 rounded-xl bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-300/30 dark:border-yellow-700/20"
            >
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs rounded-lg border-yellow-300/50 focus:border-yellow-400"
                autoFocus
                data-testid="input-search-star-hopper"
              />
              {searchResults.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-white/60 dark:bg-white/5 border border-border/30" data-testid={`search-result-${user.id}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] font-bold text-foreground truncate">{user.username}</p>
                          {user.idVerified && <Shield className="w-3 h-3 text-blue-500 shrink-0" />}
                          {user.isDriver && <Car className="w-3 h-3 text-green-500 shrink-0" />}
                        </div>
                      </div>
                      {user.isStarred ? (
                        <span className="text-[9px] font-bold text-yellow-600 dark:text-yellow-400 px-2">Starred ⭐</span>
                      ) : (
                        <Button
                          size="sm"
                          className="h-6 text-[9px] font-bold rounded-full bg-yellow-500 hover:bg-yellow-600 text-white px-3"
                          onClick={() => addStar.mutate(user.id)}
                          disabled={addStar.isPending}
                          data-testid={`button-add-star-${user.id}`}
                        >
                          ⭐ Star
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-1">No users found</p>
              )}
              {searchQuery.length < 2 && searchQuery.length > 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-1">Type at least 2 characters</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {starHoppers.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Your Star Hoppers</p>
            {starHoppers.map((star) => (
              <motion.div
                key={star.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-200/30 dark:border-yellow-800/20"
                data-testid={`star-hopper-${star.starUserId}`}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400/20 to-amber-400/20 flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] font-bold text-foreground truncate">{star.username}</p>
                    {star.idVerified && <Shield className="w-3 h-3 text-blue-500 shrink-0" />}
                    {star.isDriver && <Car className="w-3 h-3 text-green-500 shrink-0" />}
                  </div>
                  <p className="text-[9px] text-muted-foreground">Priority matching enabled ✨</p>
                </div>
                <button
                  onClick={() => removeStar.mutate(star.starUserId)}
                  className="w-6 h-6 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20 flex items-center justify-center shrink-0"
                  data-testid={`button-remove-star-${star.starUserId}`}
                >
                  <X className="w-3 h-3 text-muted-foreground hover:text-red-500" />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {starHoppers.length === 0 && !showSearch && !isLoading && (
          <div className="text-center py-2">
            <p className="text-[10px] text-muted-foreground">No Star Hoppers yet. Add your favorites for priority matching! ✨</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
