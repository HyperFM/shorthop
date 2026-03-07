import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type LoginRequest, type RegisterRequest } from "@shared/routes";
import { useLogin, useRegister, useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import circleImg from '@assets/CF1B7305-B114-452D-A723-927238626E41_1772922571220.png';

export default function Auth() {
  const [location] = useLocation();
  const { data: user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  const defaultTab = new URLSearchParams(window.location.search).get("tab") === "register" ? "register" : "login";
  const [activeTab, setActiveTab] = useState(defaultTab);

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  useEffect(() => {
    if (!authLoading && user) {
      setLocation("/dashboard");
    }
  }, [user, authLoading, setLocation]);

  const loginForm = useForm<LoginRequest>({
    resolver: zodResolver(insertUserSchema.omit({ isDriver: true, credits: true })),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<RegisterRequest>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { username: "", password: "", isDriver: false },
  });

  const onLogin = (data: LoginRequest) => loginMutation.mutate(data);
  const onRegister = (data: RegisterRequest) => registerMutation.mutate(data);

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
            <CardTitle className="text-3xl font-display font-bold">Welcome back</CardTitle>
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
                      {...loginForm.register("password")} 
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full rounded-xl py-6 text-base font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform" 
                    disabled={loginMutation.isPending}
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
                      {...registerForm.register("password")} 
                    />
                  </div>
                  <div className="flex items-center space-x-3 p-4 rounded-xl border border-border bg-muted/30 mt-4">
                    <Switch 
                      id="is-driver" 
                      checked={registerForm.watch("isDriver") || false}
                      onCheckedChange={(val) => registerForm.setValue("isDriver", val)}
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
                  >
                    {registerMutation.isPending ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
