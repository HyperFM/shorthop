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
                  <Card className="hover:border-border transition-colors cursor-default">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                          <Footprints className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground">Walk</h4>
                          <p className="text-xs text-muted-foreground">Best if you've got time. 15 mins.</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-foreground">$0</div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Option 2: Short Hop */}
                  <Card className="border-primary ring-2 ring-primary/20 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-bl-lg">RECOMMENDED</div>
                    <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <CarFront className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground">Short Hop</h4>
                          <p className="text-xs text-muted-foreground">Best if you're a little behind. 3 mins.</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                        <div className="text-left sm:text-right">
                          <div className="font-bold text-foreground">$10/mo</div>
                          <div className="text-[10px] text-muted-foreground">Subscription</div>
                        </div>
                        <Button 
                          onClick={handleRequestHop}
                          disabled={requestHop.isPending}
                          className="rounded-full shadow-md shadow-primary/20"
                        >
                          Request Hop
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Option 3: Full Ride */}
                  <Card className="opacity-75 hover:opacity-100 transition-opacity">
                    <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                          <CarFront className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground">Full Ride (Uber/Lyft)</h4>
                          <p className="text-xs text-muted-foreground">Expensive backup plan. 3 mins.</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                        <div className="text-left sm:text-right">
                          <div className="font-bold text-foreground">~$12</div>
                          <div className="text-[10px] text-muted-foreground">Estimated</div>
                        </div>
                        <Button variant="outline" className="rounded-full" onClick={() => window.open('https://uber.com', '_blank')}>
                          Open App
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
