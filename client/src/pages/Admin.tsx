import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Users, Car, Shield, Activity, Send, CheckCircle, XCircle, Ban, Eye } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { showFlash } from "@/components/FlashNotification";

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

export default function Admin() {
  const { data: user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"overview" | "users" | "applications" | "drivers" | "logs" | "notify">("overview");
  const [notifyMsg, setNotifyMsg] = useState("");

  const { data: stats } = useQuery<AdminStats>({ queryKey: ["/api/admin/stats"] });
  const { data: allUsers } = useQuery<AdminUser[]>({ queryKey: ["/api/admin/users"], enabled: tab === "users" });
  const { data: applications } = useQuery<DriverApp[]>({ queryKey: ["/api/admin/applications"], enabled: tab === "applications" || tab === "overview" });
  const { data: activeDrivers } = useQuery<AdminUser[]>({ queryKey: ["/api/admin/drivers"], enabled: tab === "drivers" });
  const { data: logs } = useQuery<RideLog[]>({ queryKey: ["/api/admin/logs"], enabled: tab === "logs" });

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

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user?.isAdmin) {
    setLocation("/dashboard");
    return null;
  }

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: Activity },
    { key: "users" as const, label: "Users", icon: Users },
    { key: "applications" as const, label: "Applications", icon: Shield },
    { key: "drivers" as const, label: "Active", icon: Car },
    { key: "logs" as const, label: "Logs", icon: Eye },
    { key: "notify" as const, label: "Notify", icon: Send },
  ];

  return (
    <div className="px-4 pt-4 pb-20 max-w-lg mx-auto">
      <div className="mb-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">ShortHop Admin</p>
        <h1 className="text-lg font-display font-bold" data-testid="text-admin-title">Admin Panel</h1>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            }`}
            data-testid={`admin-tab-${t.key}`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && stats && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Total Users", value: stats.totalUsers, color: "blue" },
              { label: "Total Drivers", value: stats.totalDrivers, color: "green" },
              { label: "Active Now", value: stats.activeDrivers, color: "emerald" },
              { label: "Verified", value: stats.verifiedDrivers, color: "teal" },
              { label: "Pending Apps", value: stats.pendingApplications, color: "orange" },
              { label: "Active Hops", value: stats.activeHopRequests, color: "purple" },
            ].map(s => (
              <Card key={s.label} className="border-border/50">
                <CardContent className="p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className="text-2xl font-display font-bold" data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, '-')}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

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

      {tab === "users" && (
        <div className="space-y-2">
          {allUsers?.map(u => (
            <Card key={u.id} className="border-border/50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{u.username}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {u.isDriver && <Badge className="text-[9px] bg-green-100 text-green-700 border-0">Driver</Badge>}
                      {u.isActive && <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-0">Active</Badge>}
                      {u.driverVerified && <Badge className="text-[9px] bg-blue-100 text-blue-700 border-0">Verified</Badge>}
                      {u.isFounder && <Badge className="text-[9px] bg-orange-100 text-orange-700 border-0">Founder</Badge>}
                      {u.isAdmin && <Badge className="text-[9px] bg-purple-100 text-purple-700 border-0">Admin</Badge>}
                      {u.isDisabled && <Badge className="text-[9px] bg-red-100 text-red-700 border-0">Disabled</Badge>}
                    </div>
                    {u.vehicleMake && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {u.vehicleColor} {u.vehicleMake} {u.vehicleModel} · {u.licensePlate}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={u.isDisabled ? "outline" : "destructive"}
                    className="text-xs h-7"
                    onClick={() => toggleDisable.mutate({ id: u.id, disabled: !u.isDisabled })}
                    data-testid={`button-toggle-disable-${u.id}`}
                  >
                    {u.isDisabled ? "Enable" : <><Ban className="w-3 h-3 mr-1" /> Disable</>}
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
          {applications?.map(app => (
            <Card key={app.id} className={`border-border/50 ${app.status === "pending" ? "border-orange-200" : ""}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{app.username}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Submitted {new Date(app.submittedAt).toLocaleDateString()}
                    </p>
                    <Badge className={`text-[9px] mt-1 border-0 ${
                      app.status === "pending" ? "bg-orange-100 text-orange-700" :
                      app.status === "approved" ? "bg-green-100 text-green-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {app.status}
                    </Badge>
                  </div>
                  {app.status === "pending" && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="text-xs h-7 bg-green-500 hover:bg-green-600"
                        onClick={() => reviewApp.mutate({ id: app.id, status: "approved" })}
                        disabled={reviewApp.isPending}
                        data-testid={`button-approve-${app.id}`}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-xs h-7"
                        onClick={() => reviewApp.mutate({ id: app.id, status: "rejected", notes: "Does not meet requirements" })}
                        disabled={reviewApp.isPending}
                        data-testid={`button-reject-${app.id}`}
                      >
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Manual Driver Notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Send a notification to all active drivers (or all drivers if none are active).
              Use this as a backup when automated matching isn't reaching drivers.
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
      )}
    </div>
  );
}
