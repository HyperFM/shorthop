import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, CarFront, Footprints, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useHops, useRequestHop } from "@/hooks/use-hops";
import type { User } from "@shared/routes";

const searchSchema = z.object({
  startLocation: z.string().min(2, "Required"),
  endLocation: z.string().min(2, "Required"),
});

export default function WalkerDashboard({ user }: { user: User }) {
  const { data: hops } = useHops();
  const requestHop = useRequestHop();
  const [showOptions, setShowOptions] = useState(false);
  const [locations, setLocations] = useState({ startLocation: "", endLocation: "" });

  const activeHop = hops?.find(h => h.status !== "completed" && h.status !== "cancelled");

  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: { startLocation: "", endLocation: "" }
  });

  const onSearch = (data: z.infer<typeof searchSchema>) => {
    setLocations(data);
    setShowOptions(true);
  };

  const handleRequestHop = () => {
    requestHop.mutate(locations, {
      onSuccess: () => setShowOptions(false)
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Where to?</h1>
        <p className="text-muted-foreground mt-1">Find the best way to get there.</p>
      </div>

      {activeHop ? (
        <Card className="border-primary/20 shadow-xl bg-gradient-to-br from-primary/5 to-transparent mb-8">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-2">
              {activeHop.status === 'requested' ? <Clock className="w-8 h-8 animate-pulse" /> : <CheckCircle2 className="w-8 h-8" />}
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {activeHop.status === 'requested' ? 'Looking for a Driver...' : 'Driver Matched!'}
            </h2>
            <p className="text-muted-foreground max-w-md">
              From <strong className="text-foreground">{activeHop.startLocation}</strong> to <strong className="text-foreground">{activeHop.endLocation}</strong>
            </p>
            {activeHop.status === 'requested' && (
              <p className="text-sm text-primary font-medium mt-4">We are checking routine routes along your path.</p>
            )}
            {activeHop.status === 'matched' && (
              <p className="text-sm text-primary font-medium mt-4">A driver is heading your way! Wait at the start location.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-5 space-y-6">
            {/* Momentum Suggestions */}
            <Card className="bg-accent/5 border-accent/20 shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Suggested Trips</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="text-sm">
                      <p className="font-semibold text-foreground">Home → Work</p>
                      <p className="text-xs text-muted-foreground">12 minute walk</p>
                      <p className="text-xs text-primary mt-1">Short Hop available in 3 minutes</p>
                    </div>
                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      Catch a Hop
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-border/50">
              <CardContent className="p-6">
                <form onSubmit={form.handleSubmit(onSearch)} className="space-y-6">
                  <div className="space-y-4 relative">
                    <div className="absolute left-[15px] top-[30px] bottom-[30px] w-0.5 bg-border z-0" />
                    
                    <div className="relative z-10 space-y-2">
                      <Label htmlFor="startLocation" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-8">Current Location</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                        <Input 
                          id="startLocation" 
                          placeholder="e.g. 4th & Main" 
                          className="pl-10 rounded-xl py-6 bg-muted/30 border-transparent focus:bg-background"
                          {...form.register("startLocation")} 
                        />
                      </div>
                    </div>
                    
                    <div className="relative z-10 space-y-2">
                      <Label htmlFor="endLocation" className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-8">Destination</Label>
                      <div className="relative">
                        <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                        <Input 
                          id="endLocation" 
                          placeholder="e.g. Central Station" 
                          className="pl-10 rounded-xl py-6 bg-muted/30 border-transparent focus:bg-background"
                          {...form.register("endLocation")} 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full rounded-xl py-6 text-base font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5"
                  >
                    Find Options
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-7">
            <AnimatePresence mode="wait">
              {showOptions && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-bold mb-4">Available Options</h3>
                  
                  {/* Option 1: Walk */}
                  <Card className="hover:border-primary/30 transition-all cursor-default group">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <Footprints className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-foreground text-lg">Walk</h4>
                          <p className="text-sm text-muted-foreground leading-snug max-w-[280px]">Encourages healthy movement. Shows transit routes.</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-foreground text-xl">$0</div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Option 2: Short Hop */}
                  <Card className="border-primary ring-2 ring-primary/20 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1.5 rounded-bl-lg uppercase tracking-wider">RECOMMENDED</div>
                    <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                          <CarFront className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-foreground text-lg">Short Hop</h4>
                          <p className="text-sm text-muted-foreground leading-snug max-w-[280px]">Advance along a driver's route. Free membership.</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between w-full sm:w-auto gap-8">
                        <div className="text-left sm:text-right">
                          <div className="font-bold text-foreground text-xl">$1–3</div>
                          <div className="text-[11px] text-muted-foreground uppercase font-semibold">Per ride</div>
                        </div>
                        <Button 
                          onClick={() => requestHop.mutate({ ...locations, hopType: "short_hop" }, { onSuccess: () => setShowOptions(false) })}
                          disabled={requestHop.isPending}
                          className="rounded-full shadow-lg shadow-primary/25 h-12 px-8 font-bold text-base"
                        >
                          Request
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Option 3: Flex Hop */}
                  <Card className="border-secondary/30 hover:border-secondary transition-all group">
                    <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary group-hover:bg-secondary/20 transition-colors">
                          <CarFront className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-foreground text-lg">Flex Hop</h4>
                          <p className="text-sm text-muted-foreground leading-snug max-w-[280px]">Allows small driver detours. Dynamic pricing.</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between w-full sm:w-auto gap-8">
                        <div className="text-left sm:text-right">
                          <div className="font-bold text-foreground text-xl">$2–5</div>
                          <div className="text-[11px] text-muted-foreground uppercase font-semibold">Per ride • $5/mo</div>
                        </div>
                        <Button 
                          variant="secondary"
                          onClick={() => requestHop.mutate({ ...locations, hopType: "flex_hop" }, { onSuccess: () => setShowOptions(false) })}
                          disabled={requestHop.isPending}
                          className="rounded-full h-12 px-8 font-bold text-base"
                        >
                          Request
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Option 4: Power Hop */}
                  <Card className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all border-2 border-transparent group"
                    style={{
                      background: "linear-gradient(135deg, rgba(249,115,22,0.05) 0%, rgba(34,197,94,0.05) 100%)",
                      borderImage: "linear-gradient(135deg, #f97316 0%, #22c55e 100%) 1",
                      boxShadow: "0 10px 30px -10px rgba(249, 115, 22, 0.2), 0 20px 40px -15px rgba(34, 197, 94, 0.15)"
                    }}>
                    <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-green-500 flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:scale-105 transition-transform">
                          ✨
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-foreground text-xl">Power Hop</h4>
                          <p className="text-sm text-muted-foreground leading-snug max-w-[300px]">Complete mobility freedom. Anywhere to anywhere.</p>
                          <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-2 uppercase tracking-widest">Reach for the Sky</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between w-full sm:w-auto gap-8">
                        <div className="text-left sm:text-right">
                          <div className="font-bold text-foreground text-2xl">$15/mo</div>
                          <div className="text-[11px] text-muted-foreground uppercase font-bold tracking-tight">Unlimited access</div>
                        </div>
                        <Button 
                          onClick={() => requestHop.mutate({ ...locations, hopType: "full_ride" }, { onSuccess: () => setShowOptions(false) })}
                          disabled={requestHop.isPending}
                          className="rounded-full bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600 text-white shadow-xl shadow-orange-500/40 h-14 px-10 font-black text-lg"
                        >
                          Reach
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                </motion.div>
              )}
            </AnimatePresence>
            {!showOptions && (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-50 p-12 text-center border-2 border-dashed border-border rounded-2xl">
                <MapPin className="w-12 h-12" />
                <p>Enter your locations to see travel options.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
