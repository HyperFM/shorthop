import { ArrowLeft, Phone, RefreshCcw, ShieldCheck, Star, MessageSquare, AlertTriangle, HelpCircle, MapPin } from "lucide-react";
import { useLocation } from "wouter";

export default function Support() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="page-support">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <button
            onClick={() => navigate("/")}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            data-testid="button-back-from-support"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground" data-testid="text-support-title">Support & Safety</h1>
            <p className="text-xs text-foreground/50 dark:text-foreground/60">Everything you need to ride and drive safely on ShortHop.</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">

        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Getting Help</h2>
          </div>
          <p className="text-sm text-foreground/70 dark:text-foreground/60 leading-relaxed pl-[52px]">
            If you need assistance, our Customer Support team is available directly in the app. You can also use the in-app chat for quick help.
          </p>
        </section>

        <hr className="border-border/40" />

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <RefreshCcw className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Automatic Refunds</h2>
          </div>
          <p className="text-sm text-foreground/70 dark:text-foreground/60 leading-relaxed pl-[52px]">
            ShortHop uses GPS verification to ensure fair outcomes for every ride. Here's how it works:
          </p>
          <ul className="space-y-2 pl-[52px]">
            <li className="flex items-start gap-2.5 text-sm text-foreground/70 dark:text-foreground/60">
              <span className="text-blue-500 mt-0.5 shrink-0">-</span>
              Unmatched ride requests are automatically refunded
            </li>
            <li className="flex items-start gap-2.5 text-sm text-foreground/70 dark:text-foreground/60">
              <span className="text-blue-500 mt-0.5 shrink-0">-</span>
              For completed rides, you can submit a refund request through in-app support
            </li>
            <li className="flex items-start gap-2.5 text-sm text-foreground/70 dark:text-foreground/60">
              <span className="text-blue-500 mt-0.5 shrink-0">-</span>
              Our team reviews GPS trip data and responds within 48–72 hours
            </li>
            <li className="flex items-start gap-2.5 text-sm text-foreground/70 dark:text-foreground/60">
              <span className="text-blue-500 mt-0.5 shrink-0">-</span>
              Keep GPS enabled during rides to ensure trip verification
            </li>
          </ul>
        </section>

        <hr className="border-border/40" />

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Community Safety Features</h2>
          </div>
          <div className="space-y-3 pl-[52px]">
            <div className="flex items-start gap-3">
              <Star className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Driver & Rider Ratings</p>
                <p className="text-xs text-foreground/60 dark:text-foreground/50 mt-0.5">Both parties rate each ride to build trust and accountability.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Live Trip Tracking</p>
                <p className="text-xs text-foreground/60 dark:text-foreground/50 mt-0.5">Real-time location sharing between matched Driver and Hopper during the ride.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Report Unsafe Behavior</p>
                <p className="text-xs text-foreground/60 dark:text-foreground/50 mt-0.5">Flag safety concerns, harassment, or violations directly in the app.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">In-App Messaging</p>
                <p className="text-xs text-foreground/60 dark:text-foreground/50 mt-0.5">Communicate safely with your matched Driver or Hopper.</p>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-border/40" />

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Cancellation Policy</h2>
          </div>
          <div className="space-y-3 pl-[52px]">
            <div>
              <p className="text-sm font-semibold text-foreground">Rider Cancellation</p>
              <p className="text-xs text-foreground/60 dark:text-foreground/50 mt-0.5">Full refund if canceled before the Driver begins traveling. Small service fee may apply if travel has started.</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Driver Cancellation</p>
              <p className="text-xs text-foreground/60 dark:text-foreground/50 mt-0.5">Full refund automatically issued to the Rider if the Driver cancels after accepting.</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
