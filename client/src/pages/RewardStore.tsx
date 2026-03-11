import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Wallet, DollarSign, CreditCard, Building2, Smartphone, Check, Loader2, ChevronRight, Clock, CircleDollarSign, ExternalLink, Zap } from "lucide-react";
import { showFlash } from "@/components/FlashNotification";

const PAYMENT_METHODS = [
  { id: "stripe", label: "Stripe", placeholder: "Direct bank deposit via Stripe", icon: CreditCard, color: "from-indigo-500 to-purple-600", isStripe: true },
  { id: "cashapp", label: "Cash App", placeholder: "$cashtag", icon: CircleDollarSign, color: "from-green-500 to-green-600" },
  { id: "venmo", label: "Venmo", placeholder: "@username", icon: Smartphone, color: "from-blue-500 to-blue-600" },
  { id: "paypal", label: "PayPal", placeholder: "email@example.com", icon: DollarSign, color: "from-blue-600 to-indigo-600" },
  { id: "debit_card", label: "Debit Card", placeholder: "Name on card (linked in-app)", icon: CreditCard, color: "from-orange-500 to-red-500" },
  { id: "bank_account", label: "Bank Account", placeholder: "Account nickname (linked in-app)", icon: Building2, color: "from-purple-500 to-violet-600" },
];

type CashoutItem = {
  id: number;
  amount: number;
  paymentMethod: string;
  paymentHandle: string;
  status: string;
  createdAt: string;
  processedAt: string | null;
};

export default function RewardStore() {
  const { data: user, isLoading: authLoading } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [handle, setHandle] = useState("");
  const [cashoutAmount, setCashoutAmount] = useState("");
  const [showPaymentSetup, setShowPaymentSetup] = useState(false);

  const { data: cashouts = [] } = useQuery<CashoutItem[]>({
    queryKey: ["/api/cashouts"],
  });

  const { data: stripeStatus } = useQuery<{ connected: boolean; payoutsEnabled: boolean; accountId?: string }>({
    queryKey: ["/api/stripe/connect-status"],
  });

  const stripeOnboard = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/connect-onboard");
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onError: () => {
      showFlash("❌", "Failed to start Stripe setup", "error");
    },
  });

  const stripeCashout = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/driver-cashout", { amount: Number(cashoutAmount) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashouts"] });
      setCashoutAmount("");
      showFlash("💰", `$${cashoutAmount} sent to your bank via Stripe!`, "success");
    },
    onError: (e: any) => {
      showFlash("❌", e.message || "Stripe cashout failed", "error");
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeParam = params.get("stripe");
    if (stripeParam === "success") {
      queryClient.invalidateQueries({ queryKey: ["/api/stripe/connect-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      showFlash("✅", "Stripe account connected!", "success");
      window.history.replaceState({}, "", "/rewards");
    } else if (stripeParam === "refresh") {
      showFlash("⚠️", "Stripe setup needs to be completed", "info");
      window.history.replaceState({}, "", "/rewards");
    }
  }, []);

  const savePayment = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/payment-method", {
        paymentMethod: selectedMethod,
        paymentHandle: handle,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      setShowPaymentSetup(false);
      showFlash("✅", "Payment method saved", "success");
    },
    onError: () => {
      showFlash("❌", "Failed to save", "error");
    },
  });

  const requestCashout = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cashout", { amount: Number(cashoutAmount) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashouts"] });
      setCashoutAmount("");
      showFlash("💰", `$${cashoutAmount} cashout requested!`, "success");
    },
    onError: (e: any) => {
      showFlash("❌", e.message || "Cashout failed", "error");
    },
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasPayment = !!(user as any).paymentMethod && !!(user as any).paymentHandle;
  const currentMethod = PAYMENT_METHODS.find(m => m.id === (user as any).paymentMethod);
  const canCashout = hasPayment && user.credits >= 5 && Number(cashoutAmount) >= 5 && Number(cashoutAmount) <= user.credits;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, type: "spring", stiffness: 120 }}
      className="px-4 pt-4 pb-24 max-w-lg mx-auto"
    >
      <div className="flex items-center gap-2 mb-6">
        <Wallet className="w-5 h-5 text-secondary" />
        <h1 className="text-xl font-display font-bold text-foreground" data-testid="text-wheels-title">
          Wheels
        </h1>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 150 }}
        className="mb-6"
      >
        <Card className="border-2 border-secondary/30 bg-gradient-to-br from-secondary/10 via-orange-500/5 to-transparent overflow-hidden relative" data-testid="card-wheels-balance">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-secondary/5 -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-orange-500/5 translate-y-6 -translate-x-6" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-center mb-3">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-secondary to-orange-600 flex items-center justify-center shadow-xl shadow-secondary/40"
              >
                <span className="text-4xl">🛞</span>
              </motion.div>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Your Balance</p>
              <motion.p
                key={user.credits}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-5xl font-black text-foreground leading-none"
                data-testid="text-wheels-balance"
              >
                {user.credits || 0}
              </motion.p>
              <p className="text-lg font-bold text-secondary mt-1">${(user.credits || 0).toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed max-w-[240px] mx-auto">
                1 Wheel = $1. Cash out anytime with a 5 Wheel minimum.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <Card className="border-border/50" data-testid="card-payment-method">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-foreground">Payment Method</p>
              {hasPayment && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] h-6 px-2"
                  onClick={() => { setShowPaymentSetup(true); setSelectedMethod((user as any).paymentMethod); setHandle((user as any).paymentHandle || ""); }}
                  data-testid="button-change-payment"
                >
                  Change
                </Button>
              )}
            </div>

            {hasPayment && !showPaymentSetup ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                {currentMethod && (
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentMethod.color} flex items-center justify-center text-white shadow-md shrink-0`}>
                    <currentMethod.icon className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-bold">{currentMethod?.label || (user as any).paymentMethod}</p>
                  <p className="text-xs text-muted-foreground">{(user as any).paymentHandle}</p>
                </div>
                <Check className="w-4 h-4 text-green-500" />
              </div>
            ) : (
              <div className="space-y-3">
                {!showPaymentSetup && !hasPayment && (
                  <p className="text-xs text-muted-foreground mb-2">Add a payment method to cash out your Wheels.</p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedMethod(m.id); setHandle(""); setShowPaymentSetup(true); }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-left transition-all ${
                        selectedMethod === m.id
                          ? "bg-secondary/10 border-2 border-secondary shadow-sm"
                          : "bg-muted/30 border-2 border-transparent hover:border-border"
                      }`}
                      data-testid={`payment-method-${m.id}`}
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center text-white shrink-0`}>
                        <m.icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold">{m.label}</span>
                    </button>
                  ))}
                </div>

                {selectedMethod && showPaymentSetup && selectedMethod === "stripe" && (
                  <div className="space-y-2 pt-2">
                    {stripeStatus?.connected && stripeStatus?.payoutsEnabled ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                        <Check className="w-5 h-5 text-green-500" />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-green-700">Stripe Connected</p>
                          <p className="text-[10px] text-muted-foreground">Your bank account is linked and ready for payouts.</p>
                        </div>
                      </div>
                    ) : stripeStatus?.connected ? (
                      <div className="space-y-2">
                        <p className="text-xs text-amber-600 font-medium">Stripe setup incomplete. Finish connecting your bank account.</p>
                        <Button
                          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold"
                          disabled={stripeOnboard.isPending}
                          onClick={() => stripeOnboard.mutate()}
                          data-testid="button-stripe-continue"
                        >
                          {stripeOnboard.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                            <><ExternalLink className="w-4 h-4 mr-2" /> Continue Stripe Setup</>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Connect your bank account through Stripe for direct deposits. Fast, secure, and automatic.</p>
                        <Button
                          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold"
                          disabled={stripeOnboard.isPending}
                          onClick={() => stripeOnboard.mutate()}
                          data-testid="button-stripe-connect"
                        >
                          {stripeOnboard.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                            <><Zap className="w-4 h-4 mr-2" /> Connect with Stripe</>
                          )}
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-secondary hover:bg-secondary/90 text-white font-bold"
                        disabled={!stripeStatus?.payoutsEnabled || savePayment.isPending}
                        onClick={() => { setHandle("Stripe Direct Deposit"); savePayment.mutate(); }}
                        data-testid="button-save-stripe"
                      >
                        {savePayment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : stripeStatus?.payoutsEnabled ? "Use Stripe for Cashouts" : "Complete Setup First"}
                      </Button>
                      {hasPayment && (
                        <Button variant="outline" onClick={() => setShowPaymentSetup(false)} data-testid="button-cancel-payment">
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {selectedMethod && showPaymentSetup && selectedMethod !== "stripe" && (
                  <div className="space-y-2 pt-2">
                    <Input
                      placeholder={PAYMENT_METHODS.find(m => m.id === selectedMethod)?.placeholder || "Enter details"}
                      value={handle}
                      onChange={e => setHandle(e.target.value)}
                      className="text-sm"
                      data-testid="input-payment-handle"
                    />
                    {selectedMethod === "bank_account" && (
                      <p className="text-[10px] text-muted-foreground">Give your account a nickname. Secure bank linking coming soon.</p>
                    )}
                    {selectedMethod === "debit_card" && (
                      <p className="text-[10px] text-muted-foreground">Enter the name on your card. Secure card linking coming soon.</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-secondary hover:bg-secondary/90 text-white font-bold"
                        disabled={!handle.trim() || savePayment.isPending}
                        onClick={() => savePayment.mutate()}
                        data-testid="button-save-payment"
                      >
                        {savePayment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                      </Button>
                      {hasPayment && (
                        <Button variant="outline" onClick={() => setShowPaymentSetup(false)} data-testid="button-cancel-payment">
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <Card className={`border-2 ${hasPayment && user.credits >= 5 ? "border-green-500/30" : "border-border/30"}`} data-testid="card-cashout">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-green-500" />
              <p className="text-sm font-bold">Cash Out</p>
              {user.credits < 5 && (
                <Badge className="text-[8px] bg-muted text-muted-foreground border-0 ml-auto">
                  Need {5 - (user.credits || 0)} more Wheels
                </Badge>
              )}
            </div>

            {!hasPayment ? (
              <p className="text-xs text-muted-foreground">Add a payment method above to cash out your Wheels.</p>
            ) : user.credits < 5 ? (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">You need at least 5 Wheels to cash out.</p>
                <div className="w-full bg-muted rounded-full h-2 mt-3">
                  <div
                    className="bg-gradient-to-r from-secondary to-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((user.credits || 0) / 5) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{user.credits || 0}/5 Wheels</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min="5"
                      max={user.credits}
                      placeholder="Amount"
                      value={cashoutAmount}
                      onChange={e => setCashoutAmount(e.target.value)}
                      className="pl-8 text-lg font-bold"
                      data-testid="input-cashout-amount"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-bold h-10 px-3"
                    onClick={() => setCashoutAmount(String(user.credits))}
                    data-testid="button-cashout-max"
                  >
                    Max
                  </Button>
                </div>
                {(user as any).paymentMethod === "stripe" ? (
                  <>
                    <Button
                      className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-base"
                      disabled={!canCashout || stripeCashout.isPending}
                      onClick={() => stripeCashout.mutate()}
                      data-testid="button-stripe-cashout"
                    >
                      {stripeCashout.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Zap className="w-5 h-5 mr-1" />
                          Stripe Cashout {cashoutAmount ? `$${Number(cashoutAmount).toFixed(2)}` : ""}
                        </>
                      )}
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground">
                      Sent directly to your bank via Stripe. Usually arrives in 1-2 business days.
                    </p>
                  </>
                ) : (
                  <>
                    <Button
                      className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-base"
                      disabled={!canCashout || requestCashout.isPending}
                      onClick={() => requestCashout.mutate()}
                      data-testid="button-cashout"
                    >
                      {requestCashout.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <DollarSign className="w-5 h-5 mr-1" />
                          Cash Out {cashoutAmount ? `$${Number(cashoutAmount).toFixed(2)}` : ""}
                        </>
                      )}
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground">
                      Sent to your {currentMethod?.label || "payment method"}. Processing may take 1-3 business days.
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {cashouts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-3 h-3" /> Cashout History
          </p>
          <div className="space-y-2">
            {cashouts.map(c => (
              <Card key={c.id} className="border-border/30" data-testid={`cashout-${c.id}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                    c.status === "completed" ? "bg-green-500" : c.status === "pending" ? "bg-amber-500" : "bg-red-500"
                  }`}>
                    {c.status === "completed" ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">${c.amount}.00</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })} — {c.paymentMethod}
                    </p>
                  </div>
                  <Badge className={`text-[9px] border-0 ${
                    c.status === "completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {c.status === "completed" ? "Sent" : "Processing"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 text-center"
      >
        <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
          Earn Wheels by giving hops. Every completed ride puts Wheels in your balance. Cash out whenever you're ready.
        </p>
      </motion.div>
    </motion.div>
  );
}
