import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Crown, Send, Shield, Loader2, Languages } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { showFlash } from "@/components/FlashNotification";

function ChatTranslateButton({ text, light }: { text: string; light?: boolean }) {
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

type ChatMessage = {
  id: number;
  userId: number;
  username: string;
  message: string;
  isAdminReply: boolean;
  createdAt: string;
};

export function FounderChat({ isAdminView = false }: { isAdminView?: boolean }) {
  const { data: user } = useAuth();
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery<ChatMessage[]>({
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
      showFlash("✅", "Message sent", "success");
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
    <Card className={isAdminView ? "border-border/50" : "border-orange-200/50 bg-orange-50/5"}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Crown className="w-4 h-4 text-orange-500" />
          {isAdminView ? "Founder Direct Line" : "Founder Chat"}
          <Badge className="text-[8px] bg-orange-100 text-orange-700 border-0 ml-auto">
            {isAdminView ? "Admin View" : "Founders Only"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={scrollRef}
          className="h-[280px] overflow-y-auto space-y-2 mb-3 pr-1 scrollbar-thin"
          data-testid="founder-chat-messages"
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
            const isMe = m.userId === user?.id;
            const isAdmin = m.isAdminReply;
            return (
              <div
                key={m.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
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
                  <p className={`text-xs leading-relaxed ${
                    isMe && !isAdmin ? "text-white" : ""
                  }`}>{m.message}</p>
                  <div className="flex items-center justify-between">
                    <p className={`text-[9px] mt-0.5 ${
                      isMe && !isAdmin ? "text-white/50" : "text-muted-foreground"
                    }`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <ChatTranslateButton text={m.message} light={isMe && !isAdmin} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-1.5">
          <Input
            placeholder={isAdminView ? "Reply as admin..." : "Message the team..."}
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && msg.trim()) sendMsg.mutate(); }}
            className="text-sm h-9"
            data-testid="input-founder-chat"
          />
          <Button
            size="sm"
            className="h-9 px-3 bg-orange-500 hover:bg-orange-600"
            disabled={!msg.trim() || sendMsg.isPending}
            onClick={() => sendMsg.mutate()}
            data-testid="button-send-founder-chat"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
