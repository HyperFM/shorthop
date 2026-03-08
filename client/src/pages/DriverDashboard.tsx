import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Map, Clock, Calendar, Check, X, Plus, Play, Route as RouteIcon, MapPin, CarFront } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useRoutes, useCreateRoute, useDeleteRoute } from "@/hooks/use-routes";
import { useHops, useAcceptHop, useCompleteHop } from "@/hooks/use-hops";
import type { User } from "@shared/routes";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const routeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startLocation: z.string().min(1, "Start location is required"),
  endLocation: z.string().min(1, "End location is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  days: z.array(z.string()).min(1, "Select at least one day"),
});

export default function DriverDashboard({ user }: { user: User }) {
  const { data: routes } = useRoutes();
  const { data: hops } = useHops();
  const createRoute = useCreateRoute();
  const deleteRoute = useDeleteRoute();
  const acceptHop = useAcceptHop();
  const completeHop = useCompleteHop();
  
  const [isRouteOpen, setIsRouteOpen] = useState(false);
  const [completeHopId, setCompleteHopId] = useState<number | null>(null);
  const [distance, setDistance] = useState("1.0");

  const form = useForm<z.infer<typeof routeSchema>>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      name: "", startLocation: "", endLocation: "", startTime: "", endTime: "", days: []
    }
  });

  const onSubmitRoute = (data: z.infer<typeof routeSchema>) => {
    createRoute.mutate(data, {
      onSuccess: () => {
        setIsRouteOpen(false);
        form.reset();
      }
    });
  };

  const handleComplete = () => {
    if (completeHopId) {
      completeHop.mutate({ id: completeHopId, data: { distanceMiles: distance } }, {
        onSuccess: () => setCompleteHopId(null)
      });
    }
  };

  const availableHops = hops?.filter(h => h.status === 'requested') || [];
  const activeHops = hops?.filter(h => h.status === 'matched') || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-12">
      
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Driver Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your routes and accept short hops along the way.</p>
        </div>
        <Card className="bg-gradient-to-r from-secondary/10 to-transparent border-secondary/20 shadow-md">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">
              <span className="font-bold text-xl">{user.credits || 0}</span>
            </div>
            <div>
              <div className="text-sm font-bold text-foreground uppercase tracking-wider">Total Wheels</div>
              <div className="text-xs text-muted-foreground">Redeem for rewards and perks.</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Col: Routes */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <RouteIcon className="w-5 h-5 text-primary" />
              My Routine Routes
            </h2>
            <Dialog open={isRouteOpen} onOpenChange={setIsRouteOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="rounded-full shadow-sm"><Plus className="w-4 h-4 mr-1"/> Add</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Routine Route</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmitRoute)} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Route Name</Label>
                    <Input placeholder="e.g. Morning Commute" {...form.register("name")} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Location</Label>
                      <Input placeholder="Home" {...form.register("startLocation")} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Location</Label>
                      <Input placeholder="Office" {...form.register("endLocation")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input type="time" {...form.register("startTime")} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input type="time" {...form.register("endTime")} />
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    <Label>Days Active</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map((day) => (
                        <div key={day} className="flex items-center space-x-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
                          <Checkbox 
                            id={`day-${day}`} 
                            checked={form.watch("days").includes(day)}
                            onCheckedChange={(checked) => {
                              const current = form.watch("days");
                              const updated = checked 
                                ? [...current, day] 
                                : current.filter(d => d !== day);
                              form.setValue("days", updated);
                            }}
                          />
                          <Label htmlFor={`day-${day}`} className="cursor-pointer text-sm">{day}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" className="w-full mt-4" disabled={createRoute.isPending}>
                    Save Route
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {routes?.length === 0 ? (
              <div className="text-center p-8 bg-muted/30 border border-dashed rounded-xl">
                <p className="text-sm text-muted-foreground">No routes registered yet.</p>
              </div>
            ) : (
              routes?.map(route => (
                <Card key={route.id} className="relative overflow-hidden group hover:border-primary/50 transition-colors">
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-primary" />
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-foreground">{route.name}</h3>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteRoute.mutate(route.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2"><MapPin className="w-3 h-3"/> {route.startLocation} &rarr; {route.endLocation}</div>
                      <div className="flex items-center gap-2"><Clock className="w-3 h-3"/> {route.startTime} - {route.endTime}</div>
                      <div className="flex items-center gap-2"><Calendar className="w-3 h-3"/> {Array.isArray(route.days) ? route.days.join(", ") : ''}</div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Middle Col: Flex Hop Settings */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CarFront className="w-5 h-5 text-accent" />
            Flex Hop Settings
          </h2>
          
          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">Enable Flex Hops</p>
                  <p className="text-xs text-muted-foreground">Allow small detours beyond your route</p>
                </div>
                <Checkbox 
                  checked={user.isFlexibleDriver || false}
                  disabled
                />
              </div>

              {user.isFlexibleDriver && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="text-sm">Max Detour Distance (miles)</Label>
                    <Input 
                      type="number" 
                      step="0.1" 
                      defaultValue={user.maxDetourDistance || "1.0"}
                      disabled
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Max Detour Time (minutes)</Label>
                    <Input 
                      type="number" 
                      defaultValue={user.maxDetourTime || 15}
                      disabled
                      className="text-sm"
                    />
                  </div>
                </div>
              )}
              
              <Button disabled className="w-full mt-2 text-xs">
                {user.isFlexibleDriver ? "Update Settings" : "Enable Flex Hops"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Active & Available Hops */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Hops */}
          {activeHops.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
                <Play className="w-5 h-5" />
                Active Hops
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {activeHops.map(hop => (
                  <Card key={hop.id} className="border-primary bg-primary/5 shadow-md">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold">Passenger waiting at:</div>
                          <div className="text-lg font-bold text-foreground">{hop.startLocation}</div>
                        </div>
                        <div className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">MATCHED</div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Going to: <strong className="text-foreground">{hop.endLocation}</strong>
                      </div>
                      
                      <Dialog open={completeHopId === hop.id} onOpenChange={(open) => !open && setCompleteHopId(null)}>
                        <DialogTrigger asChild>
                          <Button className="w-full" onClick={() => setCompleteHopId(hop.id)}>Complete Hop</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Complete Hop</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Distance Driven (miles)</Label>
                              <Input 
                                type="number" 
                                step="0.1" 
                                value={distance} 
                                onChange={(e) => setDistance(e.target.value)} 
                              />
                            </div>
                            <Button onClick={handleComplete} className="w-full" disabled={completeHop.isPending}>
                              Confirm & Earn Credits
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Available Matches */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Map className="w-5 h-5 text-secondary" />
              Available Matches Along Routes
            </h2>
            
            {availableHops.length === 0 ? (
              <Card className="bg-muted/20 border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No match requests currently align with your routes.
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {availableHops.map(hop => (
                  <Card key={hop.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-muted-foreground uppercase">Pick up</div>
                          <div className="font-bold text-foreground">{hop.startLocation}</div>
                        </div>
                        <div className="space-y-1 text-right">
                          <div className="text-xs font-bold text-muted-foreground uppercase">Drop off</div>
                          <div className="font-bold text-foreground">{hop.endLocation}</div>
                        </div>
                      </div>
                      
                      <Button 
                        variant="secondary" 
                        className="w-full" 
                        onClick={() => acceptHop.mutate(hop.id)}
                        disabled={acceptHop.isPending}
                      >
                        {acceptHop.isPending ? "Accepting..." : "Accept Request"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
