import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, LogOut, Trash2, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { showFlash } from "@/components/FlashNotification";

interface CircleData {
  id: number;
  name: string;
  description: string | null;
  corridor: string | null;
  creatorId: number;
  memberCount: number;
  isMember: boolean;
  isCreator: boolean;
  createdAt: string;
}

interface CommuteCirclesProps {
  userId: number;
}

export function CommuteCircles({ userId }: CommuteCirclesProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: circles = [], isLoading } = useQuery<CircleData[]>({
    queryKey: ['/api/commute-circles'],
  });

  const createCircle = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/commute-circles", { name, description: description || null });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commute-circles'] });
      setName("");
      setDescription("");
      setShowCreate(false);
      showFlash("👥", "Circle created!", "success");
    },
  });

  const joinCircle = useMutation({
    mutationFn: async (circleId: number) => {
      const res = await apiRequest("POST", `/api/commute-circles/${circleId}/join`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commute-circles'] });
      showFlash("✅", "Joined circle!", "success");
    },
  });

  const leaveCircle = useMutation({
    mutationFn: async (circleId: number) => {
      await apiRequest("POST", `/api/commute-circles/${circleId}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commute-circles'] });
      showFlash("👋", "Left circle", "info");
    },
  });

  const deleteCircle = useMutation({
    mutationFn: async (circleId: number) => {
      await apiRequest("DELETE", `/api/commute-circles/${circleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commute-circles'] });
      showFlash("🗑️", "Circle deleted", "info");
    },
  });

  const myCircles = circles.filter(c => c.isMember);
  const otherCircles = circles.filter(c => !c.isMember);

  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent" data-testid="card-commute-circles">
      <CardContent className="py-3 px-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-500" />
            <p className="text-xs font-black text-foreground">Commute Circles</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] font-bold gap-1 rounded-full border-purple-300/50 px-2"
            onClick={() => setShowCreate(!showCreate)}
            data-testid="button-create-circle"
          >
            <Plus className="w-3 h-3" />
            Create
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground">Join or create route-based groups for priority matching with familiar faces.</p>

        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/50"
            >
              <Input
                placeholder="Circle name (e.g. Morning Work Run)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs rounded-lg"
                data-testid="input-circle-name"
              />
              <Input
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-8 text-xs rounded-lg"
                data-testid="input-circle-description"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-[10px] font-bold flex-1 bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
                  disabled={!name.trim() || createCircle.isPending}
                  onClick={() => createCircle.mutate()}
                  data-testid="button-save-circle"
                >
                  {createCircle.isPending ? "Creating..." : "Create Circle"}
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {myCircles.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Your Circles</p>
            {myCircles.map((circle) => (
              <div key={circle.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200/30 dark:border-purple-800/20" data-testid={`circle-${circle.id}`}>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-foreground truncate">{circle.name}</p>
                  <p className="text-[9px] text-muted-foreground">{circle.memberCount} member{circle.memberCount !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {circle.isCreator ? (
                    <button
                      onClick={() => deleteCircle.mutate(circle.id)}
                      className="w-6 h-6 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20 flex items-center justify-center"
                      data-testid={`button-delete-circle-${circle.id}`}
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  ) : (
                    <button
                      onClick={() => leaveCircle.mutate(circle.id)}
                      className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center"
                      data-testid={`button-leave-circle-${circle.id}`}
                    >
                      <LogOut className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {otherCircles.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Available Circles</p>
            {otherCircles.map((circle) => (
              <div key={circle.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/30 border border-border/30" data-testid={`circle-available-${circle.id}`}>
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-foreground truncate">{circle.name}</p>
                  <p className="text-[9px] text-muted-foreground">{circle.memberCount} member{circle.memberCount !== 1 ? "s" : ""}{circle.description ? ` · ${circle.description}` : ""}</p>
                </div>
                <Button
                  size="sm"
                  className="h-6 text-[9px] font-bold rounded-full bg-purple-500 hover:bg-purple-600 text-white px-3"
                  onClick={() => joinCircle.mutate(circle.id)}
                  disabled={joinCircle.isPending}
                  data-testid={`button-join-circle-${circle.id}`}
                >
                  Join
                </Button>
              </div>
            ))}
          </div>
        )}

        {circles.length === 0 && !showCreate && !isLoading && (
          <div className="text-center py-2">
            <p className="text-[10px] text-muted-foreground">No circles yet. Create one to match with regulars!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
