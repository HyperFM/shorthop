import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Users, Sparkles, Lock, MessageCircle, X, Shield, Heart, DollarSign, Crown, Star, Languages, Activity, Car, Footprints, UserPlus, UserCheck, UserX, Globe, EyeOff, Eye } from "lucide-react";
import { api } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { showFlash } from "@/components/FlashNotification";
import { NetworkProgress } from "@/components/NetworkProgress";
import { ChatBubbleActions } from "@/components/ChatBubbleActions";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { HopBuddyRating } from "@/components/HopBuddyRating";

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
  reactions?: Record<string, number> | null;
  editedAt?: string | null;
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
                <ChatBubbleActions
                  messageId={m.id}
                  chatType="vip-chat"
                  reactions={m.reactions}
                  editedAt={m.editedAt}
                  isOwnMessage={m.userId === user?.id}
                  messageText={m.message}
                  light={!isAdmin}
                  queryKey="/api/vip-chat"
                />
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
                  <ChatBubbleActions
                    messageId={m.id}
                    chatType="founder-chat"
                    reactions={m.reactions}
                    editedAt={m.editedAt}
                    isOwnMessage={isMe}
                    messageText={m.message}
                    light={isMe && !isAdmin}
                    queryKey="/api/founder-chat"
                  />
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

function CityChat({ user }: { user: any }) {
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFlexPlus = user?.subscription === "flex_hop" || user?.subscription === "power_hop";

  const { data: messages, isLoading } = useQuery<ChatMsg[]>({
    queryKey: ["/api/founder-chat"],
    refetchInterval: 10000,
    enabled: isFlexPlus,
  });

  const sorted = messages ? [...messages].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  ) : [];

  const fakeMsgs = [
    "Hey anyone heading down Nicholasville?",
    "Love the new update! So smooth",
    "Looking for a ride from campus around 3pm",
    "Just passed Keeneland, beautiful morning!",
    "Who else is at the Rupp game tonight?",
    "Traffic on New Circle is wild right now",
    "First hop today was amazing, driver was super nice",
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isFlexPlus) {
    return (
      <Card className="border-blue-200/40 dark:border-blue-800/40 overflow-hidden" data-testid="city-chat-locked">
        <CardContent className="p-4 relative">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-blue-500" />
            <p className="text-sm font-extrabold">Lexington Chat</p>
            <Badge className="text-[8px] bg-blue-100 text-blue-700 border-0 ml-auto">FlexHop+</Badge>
          </div>

          <div className="relative h-[160px] overflow-hidden rounded-xl">
            <div className="absolute inset-0 backdrop-blur-md bg-background/30 z-10 flex flex-col items-center justify-center">
              <Lock className="w-6 h-6 text-muted-foreground mb-2" />
              <p className="text-sm font-bold text-foreground">Unlock City Chat</p>
              <p className="text-[10px] text-muted-foreground mt-1 text-center px-6">
                Upgrade to FlexHop to join the Lexington chat and connect with your city.
              </p>
              <Badge variant="secondary" className="text-[10px] mt-2">
                <Sparkles className="w-3 h-3 mr-1" />
                FlexHop $10/mo
              </Badge>
            </div>
            <div className="space-y-2 animate-pulse-slow opacity-40">
              {fakeMsgs.map((m, i) => (
                <div key={i} className={`flex ${i % 3 === 0 ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${i % 3 === 0 ? "bg-blue-500/20" : "bg-muted/60"}`}>
                    <p className="text-xs blur-[3px] select-none">{m}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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

  return (
    <Card className="border-blue-200/40 dark:border-blue-800/40" data-testid="city-chat">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-4 h-4 text-blue-500" />
          <p className="text-sm font-extrabold">Lexington Chat</p>
          <Badge className="text-[8px] bg-blue-100 text-blue-700 border-0 ml-auto">City</Badge>
        </div>

        <div
          ref={scrollRef}
          className="h-[200px] overflow-y-auto space-y-2 mb-3 pr-1 scrollbar-thin"
          data-testid="city-chat-messages"
        >
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="w-8 h-8 mb-2 text-blue-300" />
              <p className="text-xs">Start a conversation with Lexington!</p>
            </div>
          )}
          {sorted.map(m => {
            const isMe = m.userId === user.id;
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                  isMe ? "bg-blue-500 text-white" : "bg-muted"
                }`}>
                  <span className={`text-[10px] font-bold ${isMe ? "text-white/80" : "text-foreground/70"}`}>
                    {m.username}
                  </span>
                  <p className={`text-xs leading-relaxed ${isMe ? "text-white" : ""}`}>{m.message}</p>
                  <p className={`text-[9px] mt-0.5 ${isMe ? "text-white/50" : "text-muted-foreground"}`}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <ChatBubbleActions
                    messageId={m.id}
                    chatType="founder-chat"
                    reactions={m.reactions}
                    editedAt={m.editedAt}
                    isOwnMessage={isMe}
                    messageText={m.message}
                    light={isMe}
                    queryKey="/api/founder-chat"
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-1.5">
          <Input
            placeholder="Chat with Lexington..."
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && msg.trim()) sendMsg.mutate(); }}
            className="text-sm h-9"
            data-testid="input-city-chat"
          />
          <Button
            size="sm"
            className="h-9 px-3 bg-blue-500 hover:bg-blue-600"
            disabled={!msg.trim() || sendMsg.isPending}
            onClick={() => sendMsg.mutate()}
            data-testid="button-send-city-chat"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type ProfileData = {
  id: number;
  username: string;
  profilePhoto: string | null;
  bio: string | null;
  interests: string | null;
  profileVisibility: string | null;
  isFounder: boolean | null;
  founderBadge: string | null;
  subscription: string | null;
  totalHops: number | null;
  friendCount: number;
};

function CommunityProfiles({ user, onOpenDM }: { user: any; onOpenDM?: (target: { id: number; username: string; profilePhoto: string | null }) => void }) {
  const canSocial = !!(user?.isFounder || user?.subscription === "power_hop" || user?.username?.toLowerCase() === "hyperfm");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { data: profiles = [], isLoading } = useQuery<ProfileData[]>({
    queryKey: ["/api/community/profiles"],
  });

  const { data: friends = [] } = useQuery<{ id: number; friendId: number; username: string }[]>({
    queryKey: ["/api/friends"],
  });

  const { data: pendingRequests = [] } = useQuery<{ id: number; requesterId: number }[]>({
    queryKey: ["/api/friends/requests"],
  });

  const friendIds = new Set(friends.map(f => f.friendId));
  const pendingReceivedIds = new Set(pendingRequests.map(r => r.requesterId));
  const [pendingSentIds, setPendingSentIds] = useState<Set<number>>(new Set());

  const sendRequest = useMutation({
    mutationFn: async (addresseeId: number) => {
      await apiRequest("POST", "/api/friends/request", { addresseeId });
      return addresseeId;
    },
    onSuccess: (addresseeId: number) => {
      setPendingSentIds(prev => new Set([...prev, addresseeId]));
      queryClient.invalidateQueries({ queryKey: ["/api/community/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      showFlash("🤝", "Friend request sent!", "success");
    },
    onError: (err: any) => {
      showFlash("❌", err.message || "Failed to send request", "error");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground font-medium" data-testid="text-no-profiles">No community members yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Be the first to make your profile public!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="list-community-profiles">
      {profiles.map((p) => {
        const isSemiPrivate = p.profileVisibility === "semi_private";
        return (
          <Card key={p.id} data-testid={`profile-card-${p.id}`} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-bold shrink-0 overflow-hidden">
                  {p.profilePhoto ? (
                    <img src={p.profilePhoto} alt={p.username} className="w-full h-full object-cover" />
                  ) : (
                    p.username[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold" data-testid={`profile-username-${p.id}`}>{p.username}</span>
                    {(p as any).idVerified && (
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0" data-testid={`badge-verified-${p.id}`} title="ID Verified">
                        <Shield className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {p.isFounder && (
                      <Badge className="text-[7px] bg-amber-100 text-amber-700 border-0 px-1 py-0" data-testid={`badge-founder-${p.id}`}>
                        <Crown className="w-2.5 h-2.5 mr-0.5" />
                        {p.founderBadge || "Founder"}
                      </Badge>
                    )}
                    {p.profileVisibility === "semi_private" && (
                      <EyeOff className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                  {!isSemiPrivate && p.bio && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2" data-testid={`profile-bio-${p.id}`}>{p.bio}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    {!isSemiPrivate && (
                      <>
                        <span className="text-[10px] text-muted-foreground">{p.totalHops || 0} hops</span>
                        <span className="text-[10px] text-muted-foreground">{p.friendCount} friends</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {(friendIds.has(p.id) || user?.username?.toLowerCase() === "hyperfm") && onOpenDM && (
                    <button
                      onClick={() => canSocial ? onOpenDM({ id: p.id, username: p.username, profilePhoto: p.profilePhoto }) : setShowUpgrade(true)}
                      className="relative p-1.5 rounded-full hover:bg-primary/10 transition-colors"
                      data-testid={`button-dm-profile-${p.id}`}
                      title={canSocial ? `Message ${p.username}` : "Upgrade to message"}
                    >
                      <MessageCircle className={`w-4.5 h-4.5 ${canSocial ? "text-primary" : "text-muted-foreground"}`} />
                      {!canSocial && <Crown className="w-2.5 h-2.5 text-amber-500 absolute -top-0.5 -right-0.5" />}
                    </button>
                  )}
                  {friendIds.has(p.id) ? (
                    <Badge variant="secondary" className="text-[9px] h-8 px-3">
                      <UserCheck className="w-3 h-3 mr-1" />
                      Friends
                    </Badge>
                  ) : !canSocial ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 px-3 border-amber-200 dark:border-amber-700/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      onClick={() => setShowUpgrade(true)}
                      data-testid={`button-upgrade-social-${p.id}`}
                    >
                      <Crown className="w-3.5 h-3.5 mr-1" />
                      Upgrade
                    </Button>
                  ) : pendingSentIds.has(p.id) ? (
                    <Badge variant="outline" className="text-[9px] h-8 px-3 text-muted-foreground">
                      Pending
                    </Badge>
                  ) : pendingReceivedIds.has(p.id) ? (
                    <Badge variant="outline" className="text-[9px] h-8 px-3 text-blue-500 border-blue-200">
                      Respond
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 px-3"
                      onClick={() => sendRequest.mutate(p.id)}
                      disabled={sendRequest.isPending}
                      data-testid={`button-add-friend-${p.id}`}
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {showUpgrade && user && (
        <SubscriptionModal
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          plan="power_hop"
          user={user}
          onSubscribed={() => {
            setShowUpgrade(false);
            queryClient.invalidateQueries({ queryKey: ["/api/me"] });
          }}
        />
      )}
    </div>
  );
}

type FriendRequestData = {
  id: number;
  requesterId: number;
  username: string;
  profilePhoto: string | null;
  createdAt: string | null;
};

function DMChat({ user, friendId, friendName, friendPhoto, onClose }: { user: any; friendId: number; friendName: string; friendPhoto: string | null; onClose: () => void }) {
  const [msg, setMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading: loadingMsgs } = useQuery<any[]>({
    queryKey: ["/api/dm", friendId],
    queryFn: async () => {
      const res = await fetch(`/api/dm/${friendId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 4000,
  });

  const sendMsg = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", `/api/dm/${friendId}`, { message: text });
      return res.json();
    },
    onSuccess: () => {
      setMsg("");
      queryClient.invalidateQueries({ queryKey: ["/api/dm", friendId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dm/unread/count"] });
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  return (
    <div className="fixed inset-0 bg-background z-[100] flex flex-col" data-testid="dm-chat-view">
      <div className="flex items-center gap-3 p-3 border-b border-border/30 bg-card shrink-0">
        <Button size="sm" variant="ghost" onClick={onClose} data-testid="button-close-dm" className="h-8 w-8 p-0">
          <X className="w-4 h-4" />
        </Button>
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
          {friendPhoto ? <img src={friendPhoto} alt={friendName} className="w-full h-full object-cover" /> : friendName[0].toUpperCase()}
        </div>
        <p className="text-sm font-bold">{friendName}</p>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {loadingMsgs ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Start a conversation with {friendName}</p>
          </div>
        ) : (
          messages.map((m: any) => {
            const isMine = m.sender_id === user.id;
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"}`} data-testid={`dm-message-${m.id}`}>
                  <p className="break-words">{m.message}</p>
                  <p className={`text-[9px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{timeAgo(m.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="p-3 border-t border-border/30 bg-card shrink-0 safe-area-bottom">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (msg.trim()) sendMsg.mutate(msg.trim()); }}>
          <Input
            ref={inputRef}
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder={`Message ${friendName}...`}
            className="flex-1 text-sm"
            data-testid="input-dm-message"
            maxLength={500}
          />
          <Button type="submit" size="sm" disabled={!msg.trim() || sendMsg.isPending} data-testid="button-send-dm" className="h-9 px-3">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function FriendRequestsTab({ user }: { user: any }) {
  const canSocial = !!(user?.isFounder || user?.subscription === "power_hop" || user?.username?.toLowerCase() === "hyperfm");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [dmTarget, setDmTarget] = useState<{ id: number; username: string; profilePhoto: string | null } | null>(null);
  const { data: requests = [], isLoading } = useQuery<FriendRequestData[]>({
    queryKey: ["/api/friends/requests"],
  });

  const { data: friends = [] } = useQuery<{ id: number; friendId: number; username: string; profilePhoto: string | null }[]>({
    queryKey: ["/api/friends"],
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/dm/unread/count"],
    queryFn: async () => {
      const res = await fetch("/api/dm/unread/count", { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    refetchInterval: 10000,
  });

  const respond = useMutation({
    mutationFn: async ({ id, accept }: { id: number; accept: boolean }) => {
      await apiRequest("POST", `/api/friends/respond/${id}`, { accept });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/profiles"] });
      showFlash(vars.accept ? "🤝" : "👋", vars.accept ? "Friend added!" : "Request declined", vars.accept ? "success" : "info");
    },
    onError: () => {
      showFlash("❌", "Failed to respond", "error");
    },
  });

  if (dmTarget) {
    return <DMChat user={user} friendId={dmTarget.id} friendName={dmTarget.username} friendPhoto={dmTarget.profilePhoto} onClose={() => setDmTarget(null)} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = user?.username?.toLowerCase() === "hyperfm";

  return (
    <div className="space-y-6">
      {!canSocial && (
        <Card className="border-amber-200/60 dark:border-amber-700/30 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20 rounded-2xl cursor-pointer hover:shadow-md transition-shadow" data-testid="card-social-gate" onClick={() => setShowUpgrade(true)}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground dark:text-white">Unlock Social Features</p>
              <p className="text-xs text-muted-foreground mt-0.5">Upgrade to PowerHop to message friends and grow your network.</p>
            </div>
            <Button size="sm" variant="outline" className="text-xs border-amber-200 dark:border-amber-700/50 text-amber-600 dark:text-amber-400 shrink-0" data-testid="button-upgrade-social">
              Upgrade
            </Button>
          </CardContent>
        </Card>
      )}
      {requests.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Pending Requests</p>
          <div className="space-y-2" data-testid="list-friend-requests">
            {requests.map((r) => (
              <Card key={r.id} data-testid={`friend-request-${r.id}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
                    {r.profilePhoto ? (
                      <img src={r.profilePhoto} alt={r.username} className="w-full h-full object-cover" />
                    ) : (
                      r.username[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold" data-testid={`request-username-${r.id}`}>{r.username}</p>
                    <p className="text-[10px] text-muted-foreground">{timeAgo(r.createdAt)}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      className="h-8 px-3 bg-green-500 hover:bg-green-600 text-white text-xs"
                      onClick={() => respond.mutate({ id: r.id, accept: true })}
                      disabled={respond.isPending}
                      data-testid={`button-accept-${r.id}`}
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs"
                      onClick={() => respond.mutate({ id: r.id, accept: false })}
                      disabled={respond.isPending}
                      data-testid={`button-decline-${r.id}`}
                    >
                      <UserX className="w-3.5 h-3.5 mr-1" />
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          My Friends ({friends.length})
        </p>
        {friends.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No friends yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Check out the Community tab to find people!</p>
          </div>
        ) : (
          <div className="space-y-2" data-testid="list-friends">
            {friends.map((f) => (
              <Card key={f.id} data-testid={`friend-${f.friendId}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
                    {f.profilePhoto ? (
                      <img src={f.profilePhoto} alt={f.username} className="w-full h-full object-cover" />
                    ) : (
                      f.username[0].toUpperCase()
                    )}
                  </div>
                  <p className="text-sm font-semibold flex-1" data-testid={`friend-username-${f.friendId}`}>{f.username}</p>
                  <button
                    onClick={() => canSocial ? setDmTarget({ id: f.friendId, username: f.username, profilePhoto: f.profilePhoto }) : setShowUpgrade(true)}
                    className="relative p-1.5 rounded-full hover:bg-primary/10 transition-colors"
                    data-testid={`button-dm-${f.friendId}`}
                    title={canSocial ? `Message ${f.username}` : "Upgrade to message"}
                  >
                    <MessageCircle className={`w-5 h-5 ${canSocial ? "text-primary" : "text-muted-foreground"}`} />
                    {!canSocial && <Crown className="w-2.5 h-2.5 text-amber-500 absolute -top-0.5 -right-0.5" />}
                  </button>
                  <Badge variant="secondary" className="text-[9px]">
                    <UserCheck className="w-3 h-3 mr-0.5" />
                    Friends
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {requests.length === 0 && friends.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No friend activity</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Visit the Community tab to discover people!</p>
        </div>
      )}
      {showUpgrade && user && (
        <SubscriptionModal
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          plan="power_hop"
          user={user}
          onSubscribed={() => {
            setShowUpgrade(false);
            queryClient.invalidateQueries({ queryKey: ["/api/me"] });
          }}
        />
      )}
    </div>
  );
}

const DONATE_AMOUNTS = [
  { label: "$0.50", cents: 50 },
  { label: "$1", cents: 100 },
  { label: "$5", cents: 500 },
];

export default function Community() {
  const { data: user, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [newPost, setNewPost] = useState("");
  const [vipOpen, setVipOpen] = useState(false);
  const [donateAmount, setDonateAmount] = useState<number | null>(null);
  const [donateMsg, setDonateMsg] = useState("");
  const [customDonate, setCustomDonate] = useState("");
  const [showCustomDonate, setShowCustomDonate] = useState(false);
  const [connectTab, setConnectTab] = useState<"feed" | "community" | "requests">("feed");
  const [globalDmTarget, setGlobalDmTarget] = useState<{ id: number; username: string; profilePhoto: string | null } | null>(null);

  const { data: pendingRating } = useQuery<{
    tripId: number; partnerId: number; partnerName: string; partnerPhoto: string | null;
    partnerRideVibe: string; partnerInterests: string[]; partnerBio: string | null;
    role: string; distanceMiles: string; priceCents: number;
  } | null>({
    queryKey: ['/api/pending-rating'],
  });
  const [ratingDismissCount, setRatingDismissCount] = useState(0);
  const [ratingFullyDismissed, setRatingFullyDismissed] = useState(false);
  const [ratingTripId, setRatingTripId] = useState<number | null>(null);

  useEffect(() => {
    if (!pendingRating) return;
    const tid = pendingRating.tripId;
    if (tid !== ratingTripId) {
      setRatingTripId(tid);
      try {
        const stored = sessionStorage.getItem(`sh_rating_dismissed_${tid}`);
        if (stored === '1') {
          setRatingFullyDismissed(true);
          setRatingDismissCount(3);
        } else {
          const cnt = parseInt(sessionStorage.getItem(`sh_rating_cnt_${tid}`) || '0', 10);
          setRatingDismissCount(cnt);
          setRatingFullyDismissed(false);
        }
      } catch {
        setRatingDismissCount(0);
        setRatingFullyDismissed(false);
      }
    }
  }, [pendingRating?.tripId, ratingTripId]);

  const handleRatingDismiss = () => {
    const next = ratingDismissCount + 1;
    setRatingDismissCount(next);
    const tid = pendingRating?.tripId;
    if (tid) {
      try { sessionStorage.setItem(`sh_rating_cnt_${tid}`, String(next)); } catch {}
    }
    if (next >= 3) {
      setRatingFullyDismissed(true);
      if (tid) {
        try { sessionStorage.setItem(`sh_rating_dismissed_${tid}`, '1'); } catch {}
        apiRequest("POST", `/api/pending-rating/${tid}/dismiss`, {}).then(() => {
          qc.invalidateQueries({ queryKey: ['/api/pending-rating'] });
        }).catch(() => {});
      }
    }
  };

  const showRatingBanner = !!pendingRating && !ratingFullyDismissed && !user?.tipRatingOptOut;

  const { data: requestCount } = useQuery<{ id: number }[]>({
    queryKey: ["/api/friends/requests"],
    select: (data: any) => data,
  });

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
      qc.invalidateQueries({ queryKey: [api.community.list.path] });
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

  const isFlexHop = user?.subscription === "flex_hop" || user?.subscription === "power_hop";
  const isFounder = !!(user as any)?.isFounder;
  const isHyperFM = user?.username === "HyperFM" || user?.isAdmin;

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
          Connect
        </h1>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        See the ShortHop network grow. Shared routes, real connections.
      </p>

      <div className="flex gap-1 mb-4 bg-muted/40 rounded-xl p-1" data-testid="connect-tabs">
        {([
          { key: "feed" as const, label: "Feed", icon: <Activity className="w-3.5 h-3.5" /> },
          { key: "community" as const, label: "Community", icon: <Globe className="w-3.5 h-3.5" /> },
          { key: "requests" as const, label: "Friends", icon: <Users className="w-3.5 h-3.5" /> },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setConnectTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all relative ${
              connectTab === t.key
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-${t.key}`}
          >
            {t.icon}
            {t.label}
            {t.key === "requests" && requestCount && Array.isArray(requestCount) && requestCount.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold">
                {requestCount.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {globalDmTarget && user && (
        <DMChat user={user} friendId={globalDmTarget.id} friendName={globalDmTarget.username} friendPhoto={globalDmTarget.profilePhoto} onClose={() => setGlobalDmTarget(null)} />
      )}

      {connectTab === "community" && user && (
        <CommunityProfiles user={user} onOpenDM={(t) => setGlobalDmTarget(t)} />
      )}

      {connectTab === "requests" && user && (
        <FriendRequestsTab user={user} />
      )}

      {connectTab !== "feed" ? null : (
      <>
      {showRatingBanner && pendingRating && (
        <div className="mb-4">
          <HopBuddyRating
            tripId={pendingRating.tripId}
            ratedUserId={pendingRating.partnerId}
            ratedUsername={pendingRating.partnerName}
            ratedPhoto={pendingRating.partnerPhoto}
            partnerRole={pendingRating.role === "hopper" ? "driver" : "hopper"}
            partnerInterests={pendingRating.partnerInterests || []}
            partnerBio={pendingRating.partnerBio || null}
            userCredits={user?.credits || 0}
            showTip={pendingRating.role === "hopper"}
            dismissCount={ratingDismissCount}
            onDismiss={handleRatingDismiss}
          />
        </div>
      )}
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

      <div className="mb-4">
        <NetworkProgress />
      </div>

      {user && (
        <div className="space-y-4 mb-6">
          <CityChat user={user} />

          {isFounder && <FoundersGroupChat user={user} />}

          {isFounder && !isHyperFM && (
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
          )}
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
        <Card className="mt-8 border-orange-200 dark:border-orange-700/50 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 overflow-hidden" data-testid="donation-section">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-md">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-foreground">Support Short Hop</p>
                <p className="text-[10px] text-foreground/60 dark:text-orange-200/70">Help keep community rides running in Lexington</p>
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
                      : "bg-white dark:bg-white/10 border border-border dark:border-orange-700/40 text-foreground hover:border-orange-300"
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
                  : "bg-white/60 dark:bg-white/10 border border-dashed border-orange-200 dark:border-orange-700/40 text-foreground/60 dark:text-orange-200/70 hover:border-orange-400"
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

      </>
      )}

      {vipOpen && user && isFounder && (
        <VipHyperChat user={user} onClose={() => setVipOpen(false)} />
      )}
    </div>
  );
}
