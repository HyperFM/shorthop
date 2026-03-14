import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Users, Car, Shield, Activity, Send, CheckCircle, XCircle, Ban, Eye, Mail, AlertTriangle, Trash2, MessageSquare, UserCog, Crown, Star, ArrowLeft, Gift, DollarSign, Building2, CreditCard, Search, Languages, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { showFlash } from "@/components/FlashNotification";
import { FounderChat } from "@/components/FounderChat";

function AdminTranslateButton({ text, light }: { text: string; light?: boolean }) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const doTranslate = async () => {
    if (translated) { setTranslated(null); return; }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/translate", { text, from: "auto", to: "en" });
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
        data-testid="button-admin-translate"
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

type AdminStats = {
  totalUsers: number;
  totalDrivers: number;
  activeDrivers: number;
  verifiedDrivers: number;
  pendingApplications: number;
  activeHopRequests: number;
  recentRides: number;
};

type AdminUser = {
  id: number;
  username: string;
  isDriver: boolean;
  isActive: boolean;
  driverVerified: boolean;
  isDisabled: boolean;
  isAdmin: boolean;
  isFounder: boolean;
  credits: number;
  totalHops: number;
  phone: string | null;
  notificationsEnabled: boolean;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  licensePlate: string | null;
  createdAt: string;
};

type DriverApp = {
  id: number;
  userId: number;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  username: string;
};

type RideLog = {
  id: number;
  walkerId: number;
  driverId: number | null;
  startLocation: string;
  endLocation: string;
  hopType: string;
  status: string;
  createdAt: string;
};

type ContactMsg = {
  id: number;
  userId: number;
  username: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  adminReply: string | null;
  createdAt: string;
};

type ReportItem = {
  id: number;
  userId: number;
  username: string;
  reportedUserId: number | null;
  reportedUsername?: string;
  category: string;
  description: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
};

type TabKey = "overview" | "users" | "applications" | "drivers" | "inbox" | "reports" | "logs" | "notify" | "founders" | "dms" | "payments";

export default function Admin() {
  const { data: user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("overview");
  const [notifyMsg, setNotifyMsg] = useState("");
  const [notifyAllTitle, setNotifyAllTitle] = useState("");
  const [notifyAllMsg, setNotifyAllMsg] = useState("");
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [resolveText, setResolveText] = useState<Record<number, string>>({});
  const [grantWheels, setGrantWheels] = useState<Record<number, string>>({});
  const [userSearch, setUserSearch] = useState("");
  const [confirmApp, setConfirmApp] = useState<{ appId: number; status: "approved" | "rejected"; username: string } | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  const { data: stats } = useQuery<AdminStats>({ queryKey: ["/api/admin/stats"] });
  const { data: allUsers } = useQuery<AdminUser[]>({ queryKey: ["/api/admin/users"], enabled: tab === "users" });
  const { data: applications } = useQuery<DriverApp[]>({ queryKey: ["/api/admin/applications"], enabled: tab === "applications" || tab === "overview" });
  const { data: activeDrivers } = useQuery<AdminUser[]>({ queryKey: ["/api/admin/drivers"], enabled: tab === "drivers" });
  const { data: logs } = useQuery<RideLog[]>({ queryKey: ["/api/admin/logs"], enabled: tab === "logs" });
  const { data: inbox } = useQuery<ContactMsg[]>({ queryKey: ["/api/admin/inbox"], enabled: tab === "inbox" || tab === "overview" });
  const { data: reportsList } = useQuery<ReportItem[]>({ queryKey: ["/api/admin/reports"], enabled: tab === "reports" || tab === "overview" });
  const { data: vipConvos } = useQuery<{ userId: number; username: string; lastMessage: string; lastAt: string; unread: number }[]>({
    queryKey: ["/api/admin/vip-conversations"],
    enabled: tab === "dms" || tab === "overview",
  });

  const [dmUserId, setDmUserId] = useState<number | null>(null);
  const [dmReply, setDmReply] = useState("");
  const { data: dmMessages } = useQuery<{ id: number; userId: number; username: string; message: string; isAdminReply: boolean; createdAt: string }[]>({
    queryKey: ["/api/admin/vip-chat", dmUserId],
    enabled: !!dmUserId,
    refetchInterval: 8000,
  });

  const sendDmReply = useMutation({
    mutationFn: async () => {
      if (!dmUserId) return;
      await apiRequest("POST", `/api/admin/vip-chat/${dmUserId}`, { message: dmReply });
    },
    onSuccess: () => {
      setDmReply("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vip-chat", dmUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vip-conversations"] });
      showFlash("✅", "Reply sent", "success");
    },
    onError: () => {
      showFlash("❌", "Failed to send", "error");
    },
  });

  const reviewApp = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      await apiRequest("POST", `/api/admin/applications/${id}/review`, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      showFlash("✅", "Application reviewed", "success");
    },
  });

  const toggleDisable = useMutation({
    mutationFn: async ({ id, disabled }: { id: number; disabled: boolean }) => {
      await apiRequest("POST", `/api/admin/users/${id}/disable`, { disabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      showFlash("✅", "User updated", "success");
    },
  });

  const deleteUserMut = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/users/${id}/delete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      showFlash("🗑️", "User deleted", "success");
    },
  });

  const sendNotify = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/notify-drivers", { message: notifyMsg });
      return res.json();
    },
    onSuccess: (data: { sent: number }) => {
      setNotifyMsg("");
      showFlash("📢", `Sent to ${data.sent} drivers`, "success");
    },
  });

  const notifyAll = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/notify-all", { title: notifyAllTitle, message: notifyAllMsg });
      return res.json();
    },
    onSuccess: (data: { sent: number }) => {
      setNotifyAllTitle("");
      setNotifyAllMsg("");
      showFlash("📢", `Sent to ${data.sent} users`, "success");
    },
    onError: () => {
      showFlash("❌", "Failed to notify users", "error");
    },
  });

  const blockUser = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      await apiRequest("POST", `/api/admin/users/${id}/block`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      showFlash("🚫", "User blocked", "success");
    },
    onError: () => {
      showFlash("❌", "Failed to block user", "error");
    },
  });

  const replyToMsg = useMutation({
    mutationFn: async ({ id, reply }: { id: number; reply: string }) => {
      await apiRequest("POST", `/api/admin/inbox/${id}/reply`, { reply });
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inbox"] });
      setReplyText(prev => ({ ...prev, [vars.id]: "" }));
      showFlash("✅", "Reply sent", "success");
    },
  });

  const grantWheelsMut = useMutation({
    mutationFn: async ({ id, amount }: { id: number; amount: number }) => {
      const res = await apiRequest("POST", `/api/admin/users/${id}/grant-wheels`, { amount });
      return res.json();
    },
    onSuccess: (data: { message: string }, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setGrantWheels(prev => ({ ...prev, [vars.id]: "" }));
      showFlash("🛞", data.message, "success");
    },
    onError: () => {
      showFlash("❌", "Failed to grant Wheels", "error");
    },
  });

  const resolveReport = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      await apiRequest("POST", `/api/admin/reports/${id}/resolve`, { notes });
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      setResolveText(prev => ({ ...prev, [vars.id]: "" }));
      showFlash("✅", "Report resolved", "success");
    },
  });

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user?.isAdmin) {
    setLocation("/dashboard");
    return null;
  }

  const unreadInbox = inbox?.filter(m => m.status === "unread").length || 0;
  const openReports = reportsList?.filter(r => r.status === "open").length || 0;

  const tabs: { key: TabKey; label: string; icon: typeof Activity; badge?: number }[] = [
    { key: "overview", label: "Overview", icon: Activity },
    { key: "inbox", label: "Inbox", icon: Mail, badge: unreadInbox },
    { key: "reports", label: "Reports", icon: AlertTriangle, badge: openReports },
    { key: "users", label: "Users", icon: Users },
    { key: "applications", label: "Apps", icon: Shield },
    { key: "drivers", label: "Active", icon: Car },
    { key: "logs", label: "Logs", icon: Eye },
    { key: "notify", label: "Notify", icon: Send },
    { key: "founders", label: "Founders", icon: Crown },
    { key: "dms", label: "DMs", icon: Star, badge: vipConvos?.reduce((sum, c) => sum + c.unread, 0) || 0 },
    { key: "payments", label: "Payments", icon: DollarSign },
  ];

  return (
    <div className="px-4 pt-4 pb-20 max-w-lg mx-auto">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">ShortHop Super Admin</p>
          <h1 className="text-lg font-display font-bold" data-testid="text-admin-title">Control Center</h1>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="text-[10px] h-6 px-2 rounded-full"
            onClick={() => setLocation("/dashboard")}
            data-testid="button-switch-driver"
          >
            <UserCog className="w-3 h-3 mr-0.5" /> Dashboard
          </Button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors relative ${
              tab === t.key ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            }`}
            data-testid={`admin-tab-${t.key}`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
            {t.badge && t.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && stats && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Total Users", value: stats.totalUsers },
              { label: "Total Drivers", value: stats.totalDrivers },
              { label: "Active Now", value: stats.activeDrivers },
              { label: "Verified", value: stats.verifiedDrivers },
              { label: "Pending Apps", value: stats.pendingApplications },
              { label: "Active Hops", value: stats.activeHopRequests },
            ].map(s => (
              <Card key={s.label} className="border-border/50">
                <CardContent className="p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className="text-2xl font-display font-bold" data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, '-')}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {unreadInbox > 0 && (
            <Card className="border-blue-200 bg-blue-50/50 cursor-pointer" onClick={() => setTab("inbox")}>
              <CardContent className="p-3 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-bold text-blue-700">{unreadInbox} new message{unreadInbox > 1 ? 's' : ''} in inbox</p>
              </CardContent>
            </Card>
          )}

          {openReports > 0 && (
            <Card className="border-red-200 bg-red-50/50 cursor-pointer" onClick={() => setTab("reports")}>
              <CardContent className="p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-sm font-bold text-red-700">{openReports} open report{openReports > 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
          )}

          {applications && applications.filter(a => a.status === "pending").length > 0 && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="p-3">
                <p className="text-sm font-bold text-orange-700">
                  {applications.filter(a => a.status === "pending").length} pending driver application(s)
                </p>
                <Button size="sm" className="mt-2 text-xs" onClick={() => setTab("applications")} data-testid="button-view-applications">
                  Review Applications
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "inbox" && (
        <div className="space-y-2">
          {inbox?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
          )}
          {inbox?.map(msg => (
            <Card key={msg.id} className={`border-border/50 ${msg.status === "unread" ? "border-blue-200 bg-blue-50/20" : ""}`}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{msg.username}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(msg.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className={`text-[9px] border-0 ${msg.category === "bug" ? "bg-red-100 text-red-700" : msg.category === "safety" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                      {msg.category}
                    </Badge>
                    {msg.status === "unread" && <Badge className="text-[9px] bg-blue-500 text-white border-0">New</Badge>}
                  </div>
                </div>
                <p className="text-xs font-bold">{msg.subject}</p>
                <p className="text-xs text-muted-foreground">{msg.message}</p>
                <AdminTranslateButton text={msg.message} />
                {msg.adminReply && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                    <p className="text-[10px] font-bold text-green-700">Your reply:</p>
                    <p className="text-xs text-green-800">{msg.adminReply}</p>
                  </div>
                )}
                {msg.status !== "replied" && (
                  <div className="flex gap-1">
                    <Input
                      placeholder="Reply..."
                      value={replyText[msg.id] || ""}
                      onChange={e => setReplyText(prev => ({ ...prev, [msg.id]: e.target.value }))}
                      className="text-xs h-7"
                      data-testid={`input-reply-${msg.id}`}
                    />
                    <Button
                      size="sm"
                      className="h-7 text-xs px-2"
                      disabled={!replyText[msg.id]?.trim() || replyToMsg.isPending}
                      onClick={() => replyToMsg.mutate({ id: msg.id, reply: replyText[msg.id] })}
                      data-testid={`button-reply-${msg.id}`}
                    >
                      <MessageSquare className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-2">
          {reportsList?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No reports yet</p>
          )}
          {reportsList?.map(r => (
            <Card key={r.id} className={`border-border/50 ${r.status === "open" ? "border-red-200" : ""}`}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">From: {r.username}</p>
                    {r.reportedUsername && <p className="text-[10px] text-red-600">Reported: {r.reportedUsername}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className={`text-[9px] border-0 ${
                      r.category === "unsafe_driver" ? "bg-red-100 text-red-700" :
                      r.category === "harassment" ? "bg-red-100 text-red-700" :
                      r.category === "bug" ? "bg-yellow-100 text-yellow-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {r.category.replace(/_/g, " ")}
                    </Badge>
                    <Badge className={`text-[9px] border-0 ${r.status === "open" ? "bg-red-500 text-white" : "bg-green-100 text-green-700"}`}>
                      {r.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{r.description}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</p>
                {r.adminNotes && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                    <p className="text-[10px] font-bold text-green-700">Resolution:</p>
                    <p className="text-xs text-green-800">{r.adminNotes}</p>
                  </div>
                )}
                {r.status === "open" && (
                  <div className="flex gap-1">
                    <Input
                      placeholder="Resolution notes..."
                      value={resolveText[r.id] || ""}
                      onChange={e => setResolveText(prev => ({ ...prev, [r.id]: e.target.value }))}
                      className="text-xs h-7"
                      data-testid={`input-resolve-${r.id}`}
                    />
                    <Button
                      size="sm"
                      className="h-7 text-xs px-2 bg-green-500"
                      onClick={() => resolveReport.mutate({ id: r.id, notes: resolveText[r.id] || "Resolved" })}
                      disabled={resolveReport.isPending}
                      data-testid={`button-resolve-${r.id}`}
                    >
                      <CheckCircle className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-full bg-muted/50 border-border/50"
              data-testid="input-user-search"
            />
          </div>
          {allUsers?.filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase())).length === 0 && userSearch && (
            <p className="text-xs text-muted-foreground text-center py-4" data-testid="text-no-users-found">No users matching "{userSearch}"</p>
          )}
          {allUsers?.filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
            <Card key={u.id} className="border-border/50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold">{u.username}</p>
                      {(u as any).signupNumber && (
                        <span className="text-[9px] text-muted-foreground font-mono">#{(u as any).signupNumber}</span>
                      )}
                      {(u as any).isRoutePioneer && <span className="text-sm" title="Route Pioneer">👑</span>}
                    </div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {(u as any).isRoutePioneer && <Badge className="text-[9px] bg-amber-100 text-amber-700 border-0">👑 Route Pioneer – Early Rider #{(u as any).signupNumber}</Badge>}
                      {u.isDriver && <Badge className="text-[9px] bg-green-100 text-green-700 border-0">Driver</Badge>}
                      {u.isActive && <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-0">Active</Badge>}
                      {u.driverVerified && <Badge className="text-[9px] bg-blue-100 text-blue-700 border-0">Verified</Badge>}
                      {u.isFounder && <Badge className="text-[9px] bg-orange-100 text-orange-700 border-0">Founder</Badge>}
                      {u.isAdmin && <Badge className="text-[9px] bg-purple-100 text-purple-700 border-0">Super Admin</Badge>}
                      {u.isDisabled && <Badge className="text-[9px] bg-red-100 text-red-700 border-0">Disabled</Badge>}
                    </div>
                    {u.phone && (
                      <p className="text-[10px] text-foreground mt-1 flex items-center gap-1">
                        📱 {u.phone}
                        {u.notificationsEnabled && <Badge className="text-[8px] bg-green-100 text-green-700 border-0 ml-1">Notifs ON</Badge>}
                      </p>
                    )}
                    {u.vehicleMake && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {u.vehicleColor} {u.vehicleMake} {u.vehicleModel} · {u.licensePlate}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Joined {new Date(u.createdAt).toLocaleDateString()} · {u.credits} Wheels · {u.totalHops} hops
                    </p>
                  </div>
                  {!u.isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" data-testid={`button-actions-${u.id}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => toggleDisable.mutate({ id: u.id, disabled: !u.isDisabled })}
                          data-testid={`button-toggle-disable-${u.id}`}
                        >
                          <Ban className="w-3.5 h-3.5 mr-2" />
                          {u.isDisabled ? "Enable User" : "Suspend User"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const reason = prompt(`Block "${u.username}" — reason (optional):`);
                            if (reason !== null) blockUser.mutate({ id: u.id, reason: reason || "Blocked by admin" });
                          }}
                          className="text-orange-600"
                          data-testid={`button-block-${u.id}`}
                        >
                          <Shield className="w-3.5 h-3.5 mr-2" />
                          Block User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            if (confirm(`Delete user "${u.username}" permanently?`)) {
                              deleteUserMut.mutate(u.id);
                            }
                          }}
                          className="text-red-600"
                          data-testid={`button-delete-${u.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Delete Account
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/30">
                  <div className="flex items-center gap-1 text-[10px] text-secondary font-bold">
                    <span>🛞</span> Grant Wheels
                  </div>
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    placeholder="Amount"
                    value={grantWheels[u.id] || ""}
                    onChange={e => setGrantWheels(prev => ({ ...prev, [u.id]: e.target.value }))}
                    className="h-6 text-xs w-20"
                    data-testid={`input-grant-wheels-${u.id}`}
                  />
                  <Button
                    size="sm"
                    className="h-6 text-[10px] px-2 bg-secondary hover:bg-secondary/90 text-white"
                    disabled={!grantWheels[u.id] || Number(grantWheels[u.id]) < 1 || grantWheelsMut.isPending}
                    onClick={() => grantWheelsMut.mutate({ id: u.id, amount: Number(grantWheels[u.id]) })}
                    data-testid={`button-grant-wheels-${u.id}`}
                  >
                    Give
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "applications" && (
        <div className="space-y-2">
          {applications?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No applications yet</p>
          )}
          {applications?.map(app => {
            const appUser = allUsers?.find(u => u.id === app.userId);
            return (
              <Card key={app.id} className={`border-border/50 ${app.status === "pending" ? "border-orange-200" : ""}`}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">{app.username}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Submitted {new Date(app.submittedAt).toLocaleDateString()}
                      </p>
                      {appUser?.vehicleMake && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {appUser.vehicleColor} {appUser.vehicleMake} {appUser.vehicleModel} · {appUser.licensePlate}
                        </p>
                      )}
                      <Badge className={`text-[9px] mt-1 border-0 ${
                        app.status === "pending" ? "bg-orange-100 text-orange-700" :
                        app.status === "approved" ? "bg-green-100 text-green-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {app.status}
                      </Badge>
                    </div>
                  </div>

                  {app.status === "pending" && appUser?.driverLicenseUrl && (
                    <div className="flex gap-2 pt-1">
                      {appUser.driverLicenseUrl && (
                        <div className="flex-1 rounded-lg overflow-hidden border border-border/50 bg-muted/30">
                          <img src={appUser.driverLicenseUrl} alt="Driver License" className="w-full h-20 object-cover" />
                          <p className="text-[9px] text-muted-foreground text-center py-1">License</p>
                        </div>
                      )}
                      {appUser.selfieUrl && (
                        <div className="flex-1 rounded-lg overflow-hidden border border-border/50 bg-muted/30">
                          <img src={appUser.selfieUrl} alt="Selfie" className="w-full h-20 object-cover" />
                          <p className="text-[9px] text-muted-foreground text-center py-1">Selfie</p>
                        </div>
                      )}
                    </div>
                  )}

                  {app.status === "pending" && (
                    <div className="flex gap-1 pt-1">
                      <Button
                        size="sm"
                        className="text-xs h-7 flex-1 bg-green-500 hover:bg-green-600"
                        onClick={() => setConfirmApp({ appId: app.id, status: "approved", username: app.username })}
                        disabled={reviewApp.isPending}
                        data-testid={`button-approve-${app.id}`}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-xs h-7 flex-1"
                        onClick={() => setConfirmApp({ appId: app.id, status: "rejected", username: app.username })}
                        disabled={reviewApp.isPending}
                        data-testid={`button-reject-${app.id}`}
                      >
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!confirmApp} onOpenChange={() => setConfirmApp(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmApp?.status === "approved" ? "Approve Driver?" : "Reject Driver?"}
            </DialogTitle>
            <DialogDescription>
              {confirmApp?.status === "approved"
                ? `Approve ${confirmApp?.username} to become a verified driver?`
                : `Reject ${confirmApp?.username}'s driver application?`}
            </DialogDescription>
          </DialogHeader>

          {confirmApp?.status === "rejected" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Rejection notes (optional):</label>
              <Textarea
                placeholder="Explain why the application was rejected..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                className="text-sm h-24"
              />
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setConfirmApp(null)}>
              Cancel
            </Button>
            <Button
              className={confirmApp?.status === "approved" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}
              onClick={() => {
                if (confirmApp) {
                  reviewApp.mutate({
                    id: confirmApp.appId,
                    status: confirmApp.status,
                    notes: rejectNotes || undefined,
                  });
                  setConfirmApp(null);
                  setRejectNotes("");
                }
              }}
              disabled={reviewApp.isPending}
            >
              {confirmApp?.status === "approved" ? "✓ Approve" : "✗ Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {tab === "drivers" && (
        <div className="space-y-2">
          {activeDrivers?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No active drivers right now</p>
          )}
          {activeDrivers?.map(d => (
            <Card key={d.id} className="border-green-200 bg-green-50/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <div>
                    <p className="text-sm font-bold">{d.username}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {d.vehicleColor} {d.vehicleMake} {d.vehicleModel} · {d.licensePlate}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "logs" && (
        <div className="space-y-2">
          {logs?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No ride logs yet</p>
          )}
          {logs?.map(log => (
            <Card key={log.id} className="border-border/50">
              <CardContent className="p-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">{log.startLocation} → {log.endLocation}</p>
                    <p className="text-[10px] text-muted-foreground">{log.hopType} · {new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                  <Badge className={`text-[9px] border-0 ${
                    log.status === "completed" ? "bg-green-100 text-green-700" :
                    log.status === "matched" ? "bg-blue-100 text-blue-700" :
                    log.status === "requested" ? "bg-orange-100 text-orange-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {log.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "notify" && (
        <div className="space-y-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Notify All Users</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Send a notification to every user on the platform.
              </p>
              <Input
                placeholder="Notification title..."
                value={notifyAllTitle}
                onChange={e => setNotifyAllTitle(e.target.value)}
                className="text-sm"
                data-testid="input-notify-all-title"
              />
              <Textarea
                placeholder="Notification message..."
                value={notifyAllMsg}
                onChange={e => setNotifyAllMsg(e.target.value)}
                className="text-sm"
                rows={3}
                data-testid="input-notify-all-message"
              />
              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-red-500"
                onClick={() => notifyAll.mutate()}
                disabled={!notifyAllTitle.trim() || !notifyAllMsg.trim() || notifyAll.isPending}
                data-testid="button-send-notify-all"
              >
                <Send className="w-4 h-4 mr-1" /> Send to All Users
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Broadcast to Drivers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Send a notification to all active drivers (or all drivers if none are active).
              </p>
              <Textarea
                placeholder="HOP REQUEST NEAR YOU — A rider needs a pickup at..."
                value={notifyMsg}
                onChange={e => setNotifyMsg(e.target.value)}
                className="text-sm"
                rows={3}
                data-testid="input-notify-message"
              />
              <Button
                className="w-full bg-gradient-to-r from-primary to-accent"
                onClick={() => sendNotify.mutate()}
                disabled={!notifyMsg.trim() || sendNotify.isPending}
                data-testid="button-send-notify"
              >
                <Send className="w-4 h-4 mr-1" /> Send to Drivers
              </Button>
            </CardContent>
          </Card>
        </div>
      )}


      {tab === "founders" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Group chat with founding members. Messages from founders create notifications in your inbox.
          </p>
          <FounderChat isAdminView />
        </div>
      )}

      {tab === "dms" && (
        <div className="space-y-3">
          {!dmUserId ? (
            <>
              <p className="text-xs text-muted-foreground">
                Private VIP messages from founding members. Only they can see their own conversation with you.
              </p>
              {(!vipConvos || vipConvos.length === 0) ? (
                <div className="text-center py-12">
                  <Star className="w-10 h-10 text-amber-200 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">No VIP messages yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">When founders DM you, they'll appear here.</p>
                </div>
              ) : (
                vipConvos.map(c => (
                  <Card
                    key={c.userId}
                    className="cursor-pointer hover:shadow-md transition-all border-amber-200/50 dark:border-amber-800/50"
                    onClick={() => setDmUserId(c.userId)}
                    data-testid={`dm-convo-${c.userId}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold shrink-0">
                          {c.username[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold">{c.username}</p>
                            {c.unread > 0 && (
                              <Badge className="text-[9px] bg-amber-500 text-white border-0 px-1.5">
                                {c.unread} new
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                          <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                            {new Date(c.lastAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          ) : (
            <div className="space-y-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setDmUserId(null); setDmReply(""); }}
                className="text-xs h-7 px-2 -ml-2"
                data-testid="button-back-dms"
              >
                <ArrowLeft className="w-3 h-3 mr-1" /> Back to conversations
              </Button>
              <Card className="border-amber-200/50 dark:border-amber-800/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-amber-500" />
                    <p className="text-sm font-bold">
                      VIP Chat — {vipConvos?.find(c => c.userId === dmUserId)?.username || "User"}
                    </p>
                    <Badge className="text-[8px] bg-amber-100 text-amber-700 border-0 ml-auto">Private</Badge>
                  </div>
                  <div className="h-[320px] overflow-y-auto space-y-2 mb-3 pr-1 scrollbar-thin" data-testid="dm-messages">
                    {dmMessages && [...dmMessages].sort((a, b) =>
                      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    ).map(m => (
                      <div key={m.id} className={`flex ${m.isAdminReply ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                          m.isAdminReply
                            ? "bg-amber-500 text-white"
                            : "bg-muted"
                        }`}>
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className={`text-[10px] font-bold ${
                              m.isAdminReply ? "text-white/80" : "text-foreground/70"
                            }`}>
                              {m.isAdminReply ? "You (Hyper)" : m.username}
                            </span>
                          </div>
                          <p className={`text-xs leading-relaxed ${m.isAdminReply ? "text-white" : ""}`}>{m.message}</p>
                          <div className="flex items-center justify-between">
                            <p className={`text-[9px] mt-0.5 ${m.isAdminReply ? "text-white/50" : "text-muted-foreground"}`}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                            <AdminTranslateButton text={m.message} light={m.isAdminReply} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="Reply as Hyper..."
                      value={dmReply}
                      onChange={e => setDmReply(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && dmReply.trim()) sendDmReply.mutate(); }}
                      className="text-sm h-9"
                      data-testid="input-dm-reply"
                    />
                    <Button
                      size="sm"
                      className="h-9 px-3 bg-amber-500 hover:bg-amber-600"
                      disabled={!dmReply.trim() || sendDmReply.isPending}
                      onClick={() => sendDmReply.mutate()}
                      data-testid="button-send-dm-reply"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
      {tab === "payments" && (
        <PaymentsTab />
      )}
    </div>
  );
}

function PaymentsTab() {
  const { data: balance } = useQuery<{ available: { amount: number; currency: string }[]; pending: { amount: number; currency: string }[] }>({
    queryKey: ["/api/stripe/balance"],
  });
  const { data: account } = useQuery<{ id: string; payoutsEnabled: boolean; chargesEnabled: boolean; externalAccounts: { id: string; type: string; last4: string; bank_name?: string; brand?: string }[] }>({
    queryKey: ["/api/stripe/account"],
  });

  const availableUsd = balance?.available?.find(b => b.currency === "usd")?.amount || 0;
  const pendingUsd = balance?.pending?.find(b => b.currency === "usd")?.amount || 0;

  return (
    <div className="space-y-4">
      <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent">
        <CardContent className="p-4">
          <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-3">Stripe Balance</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground">Available</p>
              <p className="text-2xl font-black text-green-600" data-testid="text-stripe-available">${(availableUsd / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Pending</p>
              <p className="text-2xl font-black text-foreground" data-testid="text-stripe-pending">${(pendingUsd / 100).toFixed(2)}</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            This is your platform earnings from hop payments. Stripe automatically deposits to your linked bank account.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <p className="text-xs font-bold text-foreground mb-3">Linked Bank Account</p>
          {account?.externalAccounts && account.externalAccounts.length > 0 ? (
            <div className="space-y-2">
              {account.externalAccounts.map(ea => (
                <div key={ea.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
                    {ea.type === "bank_account" ? <Building2 className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{ea.bank_name || ea.brand || "Account"}</p>
                    <p className="text-xs text-muted-foreground">····{ea.last4}</p>
                  </div>
                  <Badge className="text-[9px] bg-green-100 text-green-700 border-0">Active</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No bank account linked yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Add one through your Stripe Dashboard to receive payouts.</p>
              <Button
                className="mt-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                onClick={() => window.open("https://dashboard.stripe.com/settings/payouts", "_blank")}
                data-testid="button-stripe-dashboard"
              >
                Open Stripe Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <p className="text-xs font-bold text-foreground mb-2">How Payments Work</p>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">1.</span>
              <p>Hopper requests a ride → pays $2.50/mile via Stripe</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">2.</span>
              <p>Driver earns 1 Wheel/mile ($1 value) → cashes out to their payment method</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">3.</span>
              <p>ShortHop keeps $1.50/mile → deposited to your bank automatically</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {account && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-foreground mb-2">Account Status</p>
            <div className="flex gap-2">
              <Badge className={`text-[9px] border-0 ${account.chargesEnabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {account.chargesEnabled ? "Charges Enabled" : "Charges Disabled"}
              </Badge>
              <Badge className={`text-[9px] border-0 ${account.payoutsEnabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {account.payoutsEnabled ? "Payouts Enabled" : "Payouts Disabled"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
