import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema, type LoginRequest, type RegisterRequest } from "@shared/routes";
import { useLogin, useRegister, useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { MapPin, Bell, Loader2, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import circleImg from '@assets/CF1B7305-B114-452D-A723-927238626E41_1772922571220.png';

const WELCOME_PHRASES = [
  { text: "Welcome, New Hopper!", lang: "English" },
  { text: "¡Bienvenido, Nuevo Hopper!", lang: "Español" },
  { text: "Bienvenue, Nouveau Hopper!", lang: "Français" },
  { text: "欢迎，新 Hopper！", lang: "中文" },
  { text: "مرحبًا، هوبر جديد!", lang: "العربية" },
  { text: "स्वागत है, नए Hopper!", lang: "हिन्दी" },
  { text: "Bem-vindo, Novo Hopper!", lang: "Português" },
  { text: "ようこそ、新しい Hopper！", lang: "日本語" },
  { text: "환영합니다, 새 Hopper!", lang: "한국어" },
  { text: "Willkommen, Neuer Hopper!", lang: "Deutsch" },
  { text: "Karibu, Hopper Mpya!", lang: "Kiswahili" },
  { text: "Maligayang Pagdating, Bagong Hopper!", lang: "Tagalog" },
  { text: "Chào mừng, Hopper mới!", lang: "Tiếng Việt" },
  { text: "Добро пожаловать, новый Hopper!", lang: "Русский" },
];

export default function Auth() {
  const [location] = useLocation();
  const { data: user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  const defaultTab = new URLSearchParams(window.location.search).get("tab") === "register" ? "register" : "login";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showExpansion, setShowExpansion] = useState(false);
  const [pendingCity, setPendingCity] = useState("");
  const [pendingRegistration, setPendingRegistration] = useState<RegisterRequest | null>(null);
  const [waitlistPhone, setWaitlistPhone] = useState("");
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const [welcomeIndex, setWelcomeIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setWelcomeIndex(i => (i + 1) % WELCOME_PHRASES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      setLocation("/instahop");
    }
  }, [user, authLoading, setLocation]);

  const loginForm = useForm<LoginRequest & { rememberMe?: boolean }>({
    resolver: zodResolver(insertUserSchema.omit({ isDriver: true, credits: true }).extend({ rememberMe: z.boolean().optional() })),
    defaultValues: { username: "", password: "", rememberMe: false },
  });

  const registerForm = useForm<RegisterRequest & { city: string; phone: string; notificationsEnabled: boolean }>({
    resolver: zodResolver(insertUserSchema.extend({ city: insertUserSchema.shape.username, phone: z.string().min(1, "Phone number is required"), notificationsEnabled: z.boolean().optional() })),
    defaultValues: { username: "", password: "", isDriver: false, city: "", referredBy: "", phone: "", notificationsEnabled: true },
  });

  const waitlistMutation = useMutation({
    mutationFn: async (data: { username: string; city: string; phone: string }) => {
      const res = await apiRequest(api.expansion.joinWaitlist.method, api.expansion.joinWaitlist.path, data);
      return res.json();
    },
    onSuccess: () => {
      setWaitlistSuccess(true);
    },
  });

  const onLogin = (data: LoginRequest & { rememberMe?: boolean }) => {
    if (data.rememberMe) {
      localStorage.setItem("sh_remember_credentials", JSON.stringify({ username: data.username }));
    } else {
      localStorage.removeItem("sh_remember_credentials");
    }
    loginMutation.mutate({ username: data.username, password: data.password, rememberMe: data.rememberMe } as any);
  };

  useEffect(() => {
    const saved = localStorage.getItem("sh_remember_credentials");
    if (saved && activeTab === "login") {
      try {
        const { username } = JSON.parse(saved);
        loginForm.setValue("username", username);
        loginForm.setValue("rememberMe", true);
      } catch {}
    }
  }, [activeTab, loginForm]);

  const onRegister = (data: RegisterRequest & { city: string; phone: string; notificationsEnabled: boolean }) => {
    const cityLower = data.city.trim().toLowerCase();
    const isLexington = cityLower.includes("lexington");

    if (!isLexington) {
      setPendingCity(data.city.trim());
      setPendingRegistration(data);
      setShowExpansion(true);
      return;
    }

    registerMutation.mutate({ ...data, city: data.city.trim(), phone: data.phone.trim(), notificationsEnabled: data.notificationsEnabled, referredBy: data.referredBy?.trim() || undefined } as any);
  };

  const handleWaitlistSubmit = () => {
    if (!pendingRegistration || !waitlistPhone.trim()) return;
    waitlistMutation.mutate({
      username: pendingRegistration.username,
      city: pendingCity,
      phone: waitlistPhone.trim(),
    });
  };

  if (authLoading) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-[1000px] grid lg:grid-cols-2 gap-8 items-center">
        
        <div className="hidden lg:flex flex-col items-center justify-center p-8 text-center space-y-6">
          <img src={circleImg} alt="Decorative" className="w-64 h-64 object-cover rounded-full shadow-2xl border-4 border-background" />
          <h2 className="text-3xl font-display font-bold text-foreground">Join the Short Hop Network</h2>
          <p className="text-muted-foreground max-w-md">Whether you are offering a spare seat on your routine commute or looking for a quick lift, you belong here.</p>
        </div>

        <Card className="w-full max-w-md mx-auto shadow-xl border-border/50">
          <CardHeader className="space-y-1 text-center pb-6">
            <div className="h-14 relative overflow-hidden" data-testid="welcome-rotating">
              <AnimatePresence mode="wait">
                <motion.div
                  key={welcomeIndex}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -30, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 flex flex-col items-center justify-center"
                >
                  <CardTitle className="text-2xl font-display font-bold text-primary">{WELCOME_PHRASES[welcomeIndex].text}</CardTitle>
                </motion.div>
              </AnimatePresence>
            </div>
            <CardDescription className="text-base">Login or create an account to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-muted rounded-xl">
                <TabsTrigger value="login" className="rounded-lg data-[state=active]:shadow-sm">Login</TabsTrigger>
                <TabsTrigger value="register" className="rounded-lg data-[state=active]:shadow-sm">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Username</Label>
                    <Input 
                      id="login-username" 
                      placeholder="Enter your username" 
                      className="rounded-xl px-4 py-6 bg-background border-border"
                      data-testid="input-username"
                      {...loginForm.register("username")} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input 
                      id="login-password" 
                      type="password" 
                      placeholder="Enter your password" 
                      className="rounded-xl px-4 py-6 bg-background border-border"
                      data-testid="input-password"
                      {...loginForm.register("password")} 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="remember-me"
                      {...loginForm.register("rememberMe")} 
                    />
                    <Label htmlFor="remember-me" className="text-sm cursor-pointer">Keep me logged in</Label>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full rounded-xl py-6 text-base font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform" 
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-username">Username</Label>
                    <Input 
                      id="reg-username" 
                      placeholder="Choose a username" 
                      className="rounded-xl px-4 py-6 bg-background border-border"
                      data-testid="input-reg-username"
                      {...registerForm.register("username")} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input 
                      id="reg-password" 
                      type="password" 
                      placeholder="Choose a password" 
                      className="rounded-xl px-4 py-6 bg-background border-border"
                      data-testid="input-reg-password"
                      {...registerForm.register("password")} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-city">What city are you in?</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="reg-city" 
                        placeholder="e.g. Lexington, Kentucky" 
                        className="rounded-xl px-4 py-6 bg-background border-border pl-10"
                        data-testid="input-reg-city"
                        {...registerForm.register("city")} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="reg-phone" 
                        type="tel"
                        placeholder="(555) 123-4567" 
                        className="rounded-xl px-4 py-6 bg-background border-border pl-10"
                        data-testid="input-reg-phone"
                        {...registerForm.register("phone")} 
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-4 rounded-xl border border-border bg-muted/30">
                    <Switch 
                      id="notifications-toggle" 
                      checked={registerForm.watch("notificationsEnabled") || false}
                      onCheckedChange={(val) => registerForm.setValue("notificationsEnabled", val)}
                      data-testid="switch-notifications"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="notifications-toggle" className="text-base font-semibold cursor-pointer flex items-center gap-2">
                        <Bell className="w-4 h-4 text-secondary" /> Enable Notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">Get updates about hops, community news, and more.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-referral">Referral Code (optional)</Label>
                    <Input 
                      id="reg-referral" 
                      placeholder="Enter a friend's referral code" 
                      className="rounded-xl px-4 py-6 bg-background border-border"
                      data-testid="input-reg-referral"
                      {...registerForm.register("referredBy")} 
                    />
                  </div>
                  <div className="flex items-center space-x-3 p-4 rounded-xl border border-border bg-muted/30 mt-4">
                    <Switch 
                      id="is-driver" 
                      checked={registerForm.watch("isDriver") || false}
                      onCheckedChange={(val) => registerForm.setValue("isDriver", val)}
                      data-testid="switch-is-driver"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="is-driver" className="text-base font-semibold cursor-pointer">I want to be a Driver</Label>
                      <p className="text-xs text-muted-foreground">You can register your routine routes to offer hops.</p>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full rounded-xl py-6 text-base font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform mt-6" 
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showExpansion} onOpenChange={setShowExpansion}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 p-8">
            <div className="text-center space-y-6">
              <div className="text-5xl">🛞</div>
              <h2 className="text-2xl font-display font-bold text-foreground" data-testid="text-expansion-title">
                ShortHop is starting in Lexington
              </h2>

              <div className="text-left space-y-4 text-sm text-muted-foreground leading-relaxed bg-background/60 rounded-xl p-6 backdrop-blur-sm">
                <p>
                  <strong className="text-foreground">Hey Hopper!</strong>
                </p>
                <p>
                  We're launching the ShortHop network city by city, starting in <strong className="text-foreground">Lexington, Kentucky</strong>.
                </p>
                <p>
                  Apps that connect people take time to grow, so we're building a strong community in one city first before expanding.
                </p>
                <p>
                  But don't worry — we'd love to bring ShortHop to <strong className="text-foreground">{pendingCity}</strong> next.
                </p>
                <p>
                  Tap the button below and we'll notify you as soon as ShortHop launches where you are.
                </p>
                <p className="italic text-primary font-medium">
                  Shared routes. Real connections.
                </p>
              </div>

              {!waitlistSuccess ? (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2 text-left">
                    <Label htmlFor="waitlist-phone" className="text-sm font-medium">Phone Number</Label>
                    <Input
                      id="waitlist-phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={waitlistPhone}
                      onChange={(e) => setWaitlistPhone(e.target.value)}
                      className="rounded-xl px-4 py-6 bg-background border-border"
                      data-testid="input-waitlist-phone"
                    />
                  </div>
                  <div className="text-left text-xs text-muted-foreground p-3 rounded-lg bg-muted/50">
                    <p><strong>City:</strong> {pendingCity}</p>
                    <p><strong>Username:</strong> {pendingRegistration?.username}</p>
                  </div>
                  <Button
                    className="w-full rounded-xl py-6 text-base font-bold shadow-lg shadow-primary/20"
                    onClick={handleWaitlistSubmit}
                    disabled={waitlistMutation.isPending || !waitlistPhone.trim()}
                    data-testid="button-notify-me"
                  >
                    {waitlistMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Joining...</>
                    ) : (
                      <><Bell className="w-4 h-4 mr-2" /> Notify Me When ShortHop Comes To My City</>
                    )}
                  </Button>

                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/60" /></div>
                    <div className="relative flex justify-center"><span className="bg-background/60 px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">or</span></div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full rounded-xl py-5 text-sm font-bold border-primary/40 hover:bg-primary/5"
                    onClick={() => {
                      if (!pendingRegistration) return;
                      const data = pendingRegistration;
                      setShowExpansion(false);
                      registerMutation.mutate({
                        ...data,
                        city: data.city.trim(),
                        phone: data.phone.trim(),
                        notificationsEnabled: data.notificationsEnabled,
                        referredBy: data.referredBy?.trim() || undefined,
                        bypassCityCheck: true,
                      } as any);
                    }}
                    disabled={registerMutation.isPending}
                    data-testid="button-signup-anyway"
                  >
                    {registerMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account...</>
                    ) : (
                      <>Sign Up Anyway →</>
                    )}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center leading-tight px-2">
                    Heads up: matches will be limited until ShortHop launches in {pendingCity}. You can still set up your profile and explore.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4 text-center">
                      <p className="text-lg font-semibold text-foreground">🎉 You're on the list!</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        We'll notify you as soon as ShortHop launches in {pendingCity}. Stay tuned!
                      </p>
                    </CardContent>
                  </Card>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => {
                      setShowExpansion(false);
                      setWaitlistSuccess(false);
                      setWaitlistPhone("");
                      setPendingRegistration(null);
                    }}
                    data-testid="button-close-expansion"
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
