import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, RefreshCcw, ShieldCheck, HelpCircle } from "lucide-react";

export default function Support() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-display font-bold mb-8">Support & Safety</h1>
      
      <div className="grid gap-8">
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Hop Guide — AI Customer Support</h2>
          </div>
          <p className="text-muted-foreground">Short Hop includes an in-app AI support assistant called Hop Guide. Hop Guide provides instant help for common issues related to rides, cancellations, payments, and account questions.</p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <RefreshCcw className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Automatic Refund System</h2>
          </div>
          <p className="text-muted-foreground">Short Hop includes an automated refund system designed to ensure that users are not charged for rides that do not occur. If a ride is canceled before pickup occurs, the rider automatically receives a refund.</p>
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="font-semibold">Situations for automatic refunds:</p>
            <ul className="list-disc pl-6 text-sm space-y-1">
              <li>Driver cancels the ride</li>
              <li>Driver fails to arrive within the expected pickup window</li>
              <li>Ride fails to start due to technical issues</li>
              <li>System errors preventing ride initiation</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Safety Features</h2>
          </div>
          <p className="text-muted-foreground">Short Hop includes safety tools designed to protect both riders and drivers.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card><CardContent className="pt-6">Driver and rider ratings</CardContent></Card>
            <Card><CardContent className="pt-6">Live trip tracking</CardContent></Card>
            <Card><CardContent className="pt-6">Report unsafe behavior</CardContent></Card>
            <Card><CardContent className="pt-6">Emergency contact options</CardContent></Card>
          </div>
        </section>

        <section className="space-y-4 bg-primary/5 p-6 rounded-2xl border border-primary/10">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Cancellation Policy</h2>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="font-bold">Rider Cancellation</h3>
              <p className="text-sm text-muted-foreground">Full refund if canceled before the driver begins traveling. A small service fee may apply if travel has already started.</p>
            </div>
            <div>
              <h3 className="font-bold">Driver Cancellation</h3>
              <p className="text-sm text-muted-foreground">If a driver cancels after accepting, the rider automatically receives a full refund.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
