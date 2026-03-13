import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, RefreshCcw, ShieldCheck, HelpCircle, ArrowLeftRight, Car, AlertTriangle, CheckCircle2, MapPin, Navigation } from "lucide-react";

export default function Support() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-display font-bold mb-2">Support & Safety</h1>
      <p className="text-muted-foreground mb-10">Everything you need to ride and drive safely on ShortHop.</p>

      <div className="grid gap-10">

        {/* AI Support */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Hop Guide — AI Customer Support</h2>
          </div>
          <p className="text-muted-foreground">ShortHop includes an in-app AI support assistant called Hop Guide. Hop Guide provides instant help for common issues related to rides, cancellations, payments, and account questions.</p>
        </section>

        {/* Refund System */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <RefreshCcw className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold">Automatic Refund System</h2>
          </div>
          <p className="text-muted-foreground">ShortHop includes an automated refund system designed to ensure that users are not charged for rides that do not occur.</p>
          <div className="bg-muted/50 p-4 rounded-2xl space-y-2 border border-border/50">
            <p className="font-semibold text-sm">Situations that trigger automatic refunds:</p>
            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
              <li>Driver cancels the ride</li>
              <li>Driver fails to arrive within the expected pickup window</li>
              <li>Ride fails to start due to technical issues</li>
              <li>System errors preventing ride initiation</li>
            </ul>
          </div>
        </section>

        {/* Road Side Awareness — main safety section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold">Road Side Awareness 👮🏽‍♂️</h2>
          </div>

          <p className="text-muted-foreground leading-relaxed">
            ShortHop automatically detects which side of the road a Hopper is on the moment a driver and hopper are matched, and immediately notifies both parties so the pickup goes smoothly. Here's how it works and what to expect.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="border-orange-200/60 dark:border-orange-700/30 bg-orange-50/50 dark:bg-orange-950/10">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-orange-500" />
                  For Hoppers (Riders)
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 text-sm text-muted-foreground space-y-2">
                <p>The moment you're matched with a driver, the app checks your position and tells you:</p>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /><span><strong className="text-foreground">Correct side</strong> — you're in position, face the road and wave.</span></li>
                  <li className="flex items-start gap-2"><ArrowLeftRight className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" /><span><strong className="text-foreground">Wrong side</strong> — cross to the other side before your driver arrives. Allow at least 5 minutes.</span></li>
                  <li className="flex items-start gap-2"><Car className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" /><span><strong className="text-foreground">One-way road</strong> — traffic only flows one direction. Stand at the edge and wave when you see your driver.</span></li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-amber-200/60 dark:border-amber-700/30 bg-amber-50/50 dark:bg-amber-950/10">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Car className="w-4 h-4 text-amber-600" />
                  For Drivers
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 text-sm text-muted-foreground space-y-2">
                <p>As soon as a hop is accepted, you'll see a position notice in your active hop card telling you:</p>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /><span>Which side of the corridor the hopper is on</span></li>
                  <li className="flex items-start gap-2"><ArrowLeftRight className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" /><span>Whether they need to cross — in that case, <strong className="text-foreground">continue your route normally</strong>. No penalties apply.</span></li>
                  <li className="flex items-start gap-2"><Navigation className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /><span>One-way roads are flagged — the hopper is positioned roadside for you to pass slowly.</span></li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Responsibility */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Who is responsible for what?
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Hopper's responsibility</p>
                <p className="text-muted-foreground">On a two-way road, the Hopper is responsible for being on the correct side — the side where traffic is heading in their direction. The app will always tell you which side that is at match time.</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Driver's responsibility</p>
                <p className="text-muted-foreground">On a one-way road, you don't need to change lanes or do anything — the Hopper knows to stand visibly. Continue your route and slow down as you approach their pickup area.</p>
              </div>
            </div>
          </div>

          {/* One-way roads */}
          <div className="rounded-2xl border border-blue-200/50 dark:border-blue-700/30 bg-blue-50/40 dark:bg-blue-950/10 p-5 space-y-3">
            <h3 className="font-bold flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <MapPin className="w-4 h-4" />
              One-Way Roads — What to Know
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              On one-way roads like Main Street downtown, traffic only flows in one direction, so there's no "wrong side." Hoppers are simply asked to stand visibly at the road's edge and wave their driver down. Drivers are notified in advance that it's a one-way road so they can slow down and look for the hopper.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Five-minute head start:</strong> The road side notice fires the moment a match is confirmed — giving everyone plenty of time to get into position before the driver arrives.
            </p>
          </div>

          {/* Safety reminder */}
          <div className="rounded-2xl border border-red-200/50 dark:border-red-800/30 bg-red-50/50 dark:bg-red-950/10 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-bold text-red-700 dark:text-red-300">Always prioritize your safety.</p>
              <p className="text-muted-foreground">Only cross a road when it is fully clear and safe to do so. Never rush into traffic — your driver will wait or circle back. ShortHop never penalizes a driver for a hopper-side positioning issue.</p>
            </div>
          </div>
        </section>

        {/* General Safety Features */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold">Additional Safety Features</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4 px-4 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Driver & Rider Ratings</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Both parties rate each trip to build community trust and accountability.</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 px-4 flex items-start gap-3">
                <Navigation className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Live Trip Tracking</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Real-time location sharing between matched driver and hopper during the ride.</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 px-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Report Unsafe Behavior</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Flag any safety concerns, harassment, or violations directly in the app from Settings.</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 px-4 flex items-start gap-3">
                <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">In-App Messaging</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Communicate with your matched driver or rider safely through the app.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Cancellation Policy */}
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
