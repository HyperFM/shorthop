import { useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/use-notifications";
import type { Notification } from "@shared/schema";

function getNotificationIcon(type: string) {
  switch (type) {
    case "hop_nearby":
      return "🐇";
    case "ride_match":
      return "🚗";
    case "route_alert":
      return "📍";
    case "community":
      return "👥";
    default:
      return "📢";
  }
}

function timeAgo(date: Date | string | null): string {
  if (!date) return "";
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: number) => void;
}) {
  return (
    <button
      data-testid={`notification-item-${notification.id}`}
      className={`w-full text-left p-3 flex items-start gap-3 transition-colors hover-elevate ${
        notification.isRead
          ? "opacity-60"
          : "bg-accent/30"
      }`}
      onClick={() => {
        if (!notification.isRead) {
          onMarkRead(notification.id);
        }
      }}
    >
      <span className="text-lg flex-shrink-0 mt-0.5" aria-hidden="true">
        {getNotificationIcon(notification.type)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1" data-testid={`notification-time-${notification.id}`}>
          {timeAgo(notification.createdAt)}
        </p>
      </div>
      {!notification.isRead && (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
      )}
    </button>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] px-1 no-default-hover-elevate no-default-active-elevate"
              data-testid="badge-notification-count"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between gap-2 p-3">
          <h3 className="font-semibold text-sm" data-testid="text-notifications-title">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground" data-testid="text-notifications-loading">
                Loading...
              </p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground" data-testid="text-notifications-empty">
                No notifications yet
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Hop Hop! We'll let you know when something happens.
              </p>
            </div>
          ) : (
            <div data-testid="list-notifications">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onMarkRead={(id) => markRead.mutate(id)}
                  />
                  {index < notifications.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
