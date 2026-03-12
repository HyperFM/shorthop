import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Users, Sparkles, Lock, MessageCircle, X, Shield, Heart, DollarSign, Crown, Star, Languages, Activity, Car, Footprints, UserPlus } from "lucide-react";
import { api } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { showFlash } from "@/components/FlashNotification";

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

type ChatMsg = {
  id: number;
  userId: number;
  username: string;
  message: string;
  isAdminReply: boolean;
  createdAt: string;
};

function TranslateButton({ text, light }: { text: string; light?: boolean }) {
  const { data: user } = useAuth();
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const userLang = (user as any)?.language || "en";

  if (userLang === "en" && !text.match(/[^\u0000-\u007F]/)) return null;

  const doTranslate = async () => {
    if (translated) { setTranslated(null); return; }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/translate", { text, from: "auto", to: userLang === "en" ? "en" : userLang });
      const data = await res.json();
      setTranslated(data.translated);
    } catch {
      showFlash("❌", "Translation failed", "error");
    }
    setLoading(false);
  };

  return (
    <div>
      <button
        onClick={doTranslate}
        className={`flex items-center gap-0.5 text-[9px] mt-1 ${light ? "text-white/60 hover:text-white/90" : "text-muted-foreground hover:text-foreground"} transition-colors`}
        data-testid="button-translate"
      >
        <Languages className="w-2.5 h-2.5" />
        {loading ? "..." : translated ? "Show original" : "Translate"}
      </button>
      {translated && (
        <p className={`text-xs mt-1 italic ${light ? "text-white/80" : "text-muted-foreground"}`}>
          {translated}
        </p>
      )}
    </div>
  );
}

function LiveActivityItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg bg-muted/30">
      {icon}
      <p className="text-xs text-foreground">{text}</p>
    </div>
  );
}

function VipHyperChat({ user, onClose }: { user: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery<ChatMsg[]>({
    queryKey: ["/api/vip-chat"],
    refetchInterval: 8000,
  });

  const sendMsg = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/vip-chat", { message: msg });
    },
    onSuccess: () => {
      setMsg("");
      queryClient.invalidateQueries({ queryKey: ["/api/vip-chat"] });
    },
    onError: () => {
      showFlash("❌", "Failed to send", "error");
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sorted = messages ? [...messages].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  ) : [];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background" data-testid="vip-chat-panel">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
            <Star className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-extrabold">VIP Hyper Line</p>
              <Badge className="text-[8px] bg-amber-100 text-amber-700 border-0 px-1.5 py-0">VIP</Badge>
            </div>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">First 50 Founders Direct Message</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0" data-testid="button-close-vip-chat">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-3">
              <Star className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-sm font-bold">VIP Hyper Line</p>
            <p className="text-xs text-muted-foreground mt-1">
              As one of the first 50 founders, you have a direct private line to Hyper. Send feedback, ideas, or just say hey.
            </p>
          </div>
        )}

        {sorted.map(m => {
          const isAdmin = m.isAdminReply;
          return (
            <div key={m.id} className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                isAdmin
                  ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200 dark:border-amber-800"
                  : "bg-primary text-white"
              }`}>
                {isAdmin && (
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">Hyper</span>
                    <Shield className="w-2.5 h-2.5 text-amber-600" />
                  </div>
                )}
                <p className={`text-sm leading-relaxed ${!isAdmin ? "text-white" : ""}`}>{m.message}</p>
                <div className="flex items-center justify-between">
                  <p className={`text-[9px] mt-1 ${!isAdmin ? "text-white/50" : "text-muted-foreground"}`}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <TranslateButton text={m.message} light={!isAdmin} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-border/50 bg-background/95 backdrop-blur-lg safe-area-bottom">
        <div className="flex gap-2">
          <Input
            placeholder="Message Hyper directly..."
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && msg.trim()) sendMsg.mutate(); }}
            className="text-sm"
            data-testid="input-vip-chat"
          />
          <Button
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 px-3"
            disabled={!msg.trim() || sendMsg.isPending}
            onClick={() => sendMsg.mutate()}
            data-testid="button-send-vip-chat"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function FoundersGroupChat({ user }: { user: any }) {
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery<ChatMsg[]>({
    queryKey: ["/api/founder-chat"],
    refetchInterval: 10000,
  });

  const sendMsg = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/founder-chat", { message: msg });
    },
    onSuccess: () => {
      setMsg("");
      queryClient.invalidateQueries({ queryKey: ["/api/founder-chat"] });
    },
    onError: () => {
      showFlash("❌", "Failed to send", "error");
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sorted = messages ? [...messages].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  ) : [];

  return (
    <Card className="border-orange-200/50 dark:border-orange-800/50 bg-gradient-to-br from-orange-50/30 to-amber-50/30 dark:from-orange-950/10 dark:to-amber-950/10" data-testid="founders-group-chat">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-4 h-4 text-orange-500" />
          <p className="text-sm font-extrabold">Founders Lounge</p>
          <Badge className="text-[8px] bg-orange-100 text-orange-700 border-0 ml-auto">First 50</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">
          Exclusive group chat for founding members. @ mention each other, share ideas, and shape ShortHop together.
        </p>

        <div
          ref={scrollRef}
          className="h-[240px] overflow-y-auto space-y-2 mb-3 pr-1 scrollbar-thin"
          data-testid="founders-chat-messages"
        >
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Crown className="w-8 h-8 mb-2 text-orange-300" />
              <p className="text-xs">No messages yet. Say hello to the team!</p>
            </div>
          )}
          {sorted.map(m => {
            const isMe = m.userId === user.id;
            const isAdmin = m.isAdminReply;
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                  isAdmin
                    ? "bg-purple-100 dark:bg-purple-900/30 border border-purple-200"
                    : isMe
                    ? "bg-orange-500 text-white"
                    : "bg-muted"
                }`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className={`text-[10px] font-bold ${
                      isAdmin ? "text-purple-700 dark:text-purple-300" : isMe ? "text-white/80" : "text-foreground/70"
                    }`}>
                      {m.username}
                    </span>
                    {isAdmin && <Shield className="w-2.5 h-2.5 text-purple-500" />}
                  </div>
                  <p className={`text-xs leading-relaxed ${isMe && !isAdmin ? "text-white" : ""}`}>{m.message}</p>
                  <div className="flex items-center justify-between">
                    <p className={`text-[9px] mt-0.5 ${isMe && !isAdmin ? "text-white/50" : "text-muted-foreground"}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <TranslateButton text={m.message} light={isMe && !isAdmin} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-1.5">
          <Input
            placeholder="Message founders..."
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && msg.trim()) sendMsg.mutate(); }}
            className="text-sm h-9"
            data-testid="input-founders-group-chat"
          />
          <Button
            size="sm"
            className="h-9 px-3 bg-orange-500 hover:bg-orange-600"
            disabled={!msg.trim() || sendMsg.isPending}
            onClick={() => sendMsg.mutate()}
            data-testid="button-send-founders-group"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const DONATE_AMOUNTS = [
  { label: "$0.50", cents: 50 },
  { label: "$1", cents: 100 },
  { label: "$5", cents: 500 },
];

export default function Community() {
  const { data: user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState("");
  const [vipOpen, setVipOpen] = useState(false);
  const [donateAmount, setDonateAmount] = useState<number | null>(null);
  const [donateMsg, setDonateMsg] = useState("");
  const [customDonate, setCustomDonate] = useState("");
  const [showCustomDonate, setShowCustomDonate] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("donation") === "success") {
      showFlash("💚", "Donation received — thank you!", "success");
      window.history.replaceState({}, "", "/community");
    } else if (params.get("donation") === "cancelled") {
      showFlash("ℹ️", "Donation cancelled", "info");
      window.history.replaceState({}, "", "/community");
    }
  }, []);

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
      showFlash("📝", "Posted!", "success");
    },
    onError: () => {
      showFlash("🔒", "FlexHop required to post", "error");
    },
  });

  const submitDonation = useMutation({
    mutationFn: async () => {
      const finalCents = showCustomDonate ? Math.round(parseFloat(customDonate) * 100) : donateAmount;
      if (!finalCents || finalCents < 50) throw new Error("Minimum $0.50");
      const res = await apiRequest("POST", "/api/donate", {
        amountCents: finalCents,
        message: donateMsg.trim() || null,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.checkoutRequired && data.url) {
        window.location.href = data.url;
      } else {
        const finalCents = showCustomDonate ? Math.round(parseFloat(customDonate) * 100) : donateAmount;
        showFlash("💚", `$${((finalCents || 0) / 100).toFixed(2)} donated — thank you!`, "success");
        setDonateAmount(null);
        setDonateMsg("");
        setCustomDonate("");
        setShowCustomDonate(false);
      }
    },
    onError: () => {
      showFlash("❌", "Failed to process donation", "error");
    },
  });

  const isFlexHop = user?.tier === "flexhop";
  const isFounder = !!(user as any)?.isFounder;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-24 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Activity className="w-5 h-5 text-primary" />
        <h1 data-testid="text-community-title" className="text-xl font-display font-bold">
          Network
        </h1>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        See the ShortHop network grow. Shared routes, real connections.
      </p>

      <Card className="mb-4 border-border/50 shadow-sm rounded-2xl" data-testid="card-live-activity">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Live Activity</p>
          </div>
          <div className="space-y-2">
            <LiveActivityItem icon={<Car className="w-3.5 h-3.5 text-green-500" />} text={`${Math.max(1, Math.floor(Math.random() * 4) + 1)} driver${Math.random() > 0.5 ? 's' : ''} heading toward downtown`} />
            <LiveActivityItem icon={<Footprints className="w-3.5 h-3.5 text-blue-500" />} text={`${Math.floor(Math.random() * 3) + 1} riders traveling Richmond Rd this morning`} />
            <LiveActivityItem icon={<UserPlus className="w-3.5 h-3.5 text-orange-500" />} text={`${Math.floor(Math.random() * 5) + 1} new members joined today`} />
          </div>
        </CardContent>
      </Card>

      {isFounder && user && (
        <div className="space-y-4 mb-6">
          <FoundersGroupChat user={user} />

          <button
            onClick={() => setVipOpen(true)}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 hover:shadow-md transition-all"
            data-testid="button-open-vip-chat"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md shrink-0">
              <Star className="w-5 h-5" />
            </div>
            <div className="text-left flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-extrabold">VIP Hyper Line</p>
                <Badge className="text-[7px] bg-amber-100 text-amber-700 border-0 px-1 py-0">FOUNDER DM</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">Private direct message to Hyper — founders only</p>
            </div>
            <MessageCircle className="w-5 h-5 text-amber-500 shrink-0" />
          </button>
        </div>
      )}

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

      {user && (
        <Card className="mt-8 border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 overflow-hidden" data-testid="donation-section">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-md">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-foreground">Support Short Hop</p>
                <p className="text-[10px] text-muted-foreground">Help keep community rides running in Lexington</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {DONATE_AMOUNTS.map(a => (
                <button
                  key={a.cents}
                  type="button"
                  onClick={() => { setDonateAmount(a.cents); setShowCustomDonate(false); }}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                    donateAmount === a.cents && !showCustomDonate
                      ? "bg-orange-500 text-white shadow-md scale-[1.03]"
                      : "bg-white dark:bg-background border border-border hover:border-orange-300"
                  }`}
                  data-testid={`donate-${a.cents}`}
                >
                  {a.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => { setShowCustomDonate(true); setDonateAmount(null); }}
              className={`w-full py-2 rounded-lg text-xs font-bold transition-all mb-3 ${
                showCustomDonate
                  ? "bg-orange-500 text-white"
                  : "bg-white/60 dark:bg-background/60 border border-dashed border-orange-200 text-muted-foreground hover:border-orange-400"
              }`}
              data-testid="donate-custom-toggle"
            >
              Custom Amount
            </button>

            {showCustomDonate && (
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-orange-500" />
                <Input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="Enter amount"
                  value={customDonate}
                  onChange={e => setCustomDonate(e.target.value)}
                  className="h-9 text-sm"
                  data-testid="input-custom-donate"
                />
              </div>
            )}

            <Textarea
              placeholder="Leave a message (optional)"
              value={donateMsg}
              onChange={e => setDonateMsg(e.target.value)}
              className="resize-none min-h-[60px] mb-3 text-sm"
              maxLength={200}
              data-testid="input-donate-message"
            />

            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold"
              disabled={
                submitDonation.isPending ||
                (!donateAmount && !showCustomDonate) ||
                (showCustomDonate && (!customDonate || parseFloat(customDonate) < 0.5))
              }
              onClick={() => submitDonation.mutate()}
              data-testid="button-submit-donate"
            >
              <Heart className="w-4 h-4 mr-2" />
              {submitDonation.isPending
                ? "Processing..."
                : (donateAmount || (showCustomDonate && customDonate))
                ? `Donate $${((showCustomDonate ? Math.round(parseFloat(customDonate || "0") * 100) : donateAmount || 0) / 100).toFixed(2)}`
                : "Select an amount"}
            </Button>

            <p className="text-[10px] text-center text-muted-foreground mt-2">
              Donations support app development, driver gas assistance, and community events.
            </p>
          </CardContent>
        </Card>
      )}

      {vipOpen && user && isFounder && (
        <VipHyperChat user={user} onClose={() => setVipOpen(false)} />
      )}
    </div>
  );
}
