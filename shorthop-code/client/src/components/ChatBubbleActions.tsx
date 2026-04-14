import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { showFlash } from "@/components/FlashNotification";
import { Pencil, X, Check } from "lucide-react";

const REACTION_EMOJIS = ["👍", "❤️", "😢", "😮", "😡"] as const;

type Reactions = Record<string, number>;

export function ChatBubbleActions({
  messageId,
  chatType,
  reactions,
  editedAt,
  isOwnMessage,
  messageText,
  light = false,
  queryKey,
}: {
  messageId: number;
  chatType: "founder-chat" | "vip-chat";
  reactions?: Reactions | null;
  editedAt?: string | null;
  isOwnMessage: boolean;
  messageText: string;
  light?: boolean;
  queryKey: string;
}) {
  const queryClient = useQueryClient();
  const [showReactions, setShowReactions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(messageText);

  const reactMutation = useMutation({
    mutationFn: async (emoji: string) => {
      await apiRequest("POST", `/api/${chatType}/${messageId}/react`, { emoji });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      setShowReactions(false);
    },
    onError: () => showFlash("❌", "Reaction failed", "error"),
  });

  const editMutation = useMutation({
    mutationFn: async (message: string) => {
      await apiRequest("PATCH", `/api/${chatType}/${messageId}`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      setEditing(false);
      showFlash("✅", "Message edited", "success");
    },
    onError: () => showFlash("❌", "Edit failed", "error"),
  });

  const textColor = light ? "text-white/60 hover:text-white/90" : "text-muted-foreground hover:text-foreground";
  const reactionBg = light ? "bg-white/10" : "bg-muted/60";

  return (
    <div className="mt-1">
      {reactions && Object.keys(reactions).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {Object.entries(reactions).map(([emoji, count]) => (
            <span
              key={emoji}
              className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${reactionBg}`}
              data-testid={`reaction-${emoji}-${messageId}`}
            >
              {emoji} <span className="font-bold">{count as number}</span>
            </span>
          ))}
        </div>
      )}

      {editedAt && (
        <p className={`text-[8px] ${light ? "text-white/40" : "text-muted-foreground/60"}`}>(edited)</p>
      )}

      {editing ? (
        <div className="flex items-center gap-1 mt-1">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="flex-1 text-[11px] px-2 py-1 rounded-md bg-background/90 text-foreground border border-border/50"
            data-testid={`input-edit-message-${messageId}`}
            autoFocus
          />
          <button
            onClick={() => editMutation.mutate(editText)}
            disabled={!editText.trim() || editText === messageText}
            className="p-0.5"
            data-testid={`button-save-edit-${messageId}`}
          >
            <Check className="w-3 h-3 text-green-500" />
          </button>
          <button onClick={() => { setEditing(false); setEditText(messageText); }} className="p-0.5" data-testid={`button-cancel-edit-${messageId}`}>
            <X className="w-3 h-3 text-red-400" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className={`text-[9px] ${textColor} transition-colors`}
            data-testid={`button-toggle-reactions-${messageId}`}
          >
            {showReactions ? "×" : "😊"}
          </button>
          {isOwnMessage && (
            <button
              onClick={() => setEditing(true)}
              className={`${textColor} transition-colors`}
              data-testid={`button-edit-message-${messageId}`}
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      )}

      {showReactions && !editing && (
        <div className={`flex gap-1 mt-1 px-1 py-0.5 rounded-full ${reactionBg} w-fit`}>
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => reactMutation.mutate(emoji)}
              disabled={reactMutation.isPending}
              className="text-sm hover:scale-125 transition-transform p-0.5"
              data-testid={`button-react-${emoji}-${messageId}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
