import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Users, Sparkles, Lock } from "lucide-react";
import { api } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function timeAgo(date: string | null): string {
  if (!date) return "";
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function Community() {
  const { data: user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState("");

  const { data: posts = [], isLoading } = useQuery<
    { id: number; userId: number; content: string; createdAt: string | null; username: string }[]
  >({
    queryKey: [api.community.list.path],
    queryFn: async () => {
      const res = await fetch(api.community.list.path);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createPost = useMutation({
    mutationFn: async () => {
      await apiRequest(api.community.create.method, api.community.create.path, {
        content: newPost.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.community.list.path] });
      setNewPost("");
      toast({ title: "Posted!", description: "Your story is now in the community feed." });
    },
    onError: () => {
      toast({ title: "Could not post", description: "FlexHop membership is required to post.", variant: "destructive" });
    },
  });

  const isFlexHop = user?.tier === "flexhop";

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-5 h-5 text-primary" />
        <h1 data-testid="text-community-title" className="text-xl font-display font-bold">
          Community
        </h1>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Shared routes. Real connections. See what Hoppers are up to.
      </p>

      {user && isFlexHop ? (
        <Card className="mb-8 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0 mt-1">
                {user.username[0].toUpperCase()}
              </div>
              <div className="flex-1 space-y-3">
                <Textarea
                  data-testid="input-community-post"
                  placeholder="Share your hop story..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className="resize-none min-h-[80px]"
                  maxLength={500}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{newPost.length}/500</span>
                  <Button
                    data-testid="button-submit-post"
                    size="sm"
                    disabled={!newPost.trim() || createPost.isPending}
                    onClick={() => createPost.mutate()}
                  >
                    <Send className="w-4 h-4 mr-1.5" />
                    {createPost.isPending ? "Posting..." : "Post"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : user ? (
        <Card className="mb-8 bg-muted/30 border-dashed">
          <CardContent className="p-6 text-center">
            <Lock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground" data-testid="text-flexhop-upsell">
              Upgrade to FlexHop to share your stories
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              FlexHop members can post, comment, and connect with the community.
            </p>
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              FlexHop Community Tier
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4" data-testid="list-community-posts">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium" data-testid="text-no-posts">No stories yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Be the first to share your hop experience!
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <Card key={post.id} data-testid={`post-${post.id}`} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-bold shrink-0">
                    {post.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" data-testid={`post-username-${post.id}`}>
                        {post.username}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(post.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mt-1 whitespace-pre-wrap" data-testid={`post-content-${post.id}`}>
                      {post.content}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
