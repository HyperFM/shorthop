import { Link, useLocation } from "wouter";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Map, LogOut, User } from "lucide-react";
import logoImg from '@assets/13690F00-BEA8-489A-BC31-6EBB418D4545_1772922571220.png';

export function NavBar() {
  const { data: user, isLoading } = useAuth();
  const logout = useLogout();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src={logoImg} alt="Short Hop Logo" className="w-8 h-8 object-contain" />
          <span className="font-display font-bold text-xl text-primary tracking-tight">Short Hop</span>
        </Link>

        <div className="flex items-center gap-4">
          {!isLoading && user ? (
            <>
              <div className="hidden sm:flex items-center gap-3 mr-4">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold text-foreground">{user.username}</span>
                  <span className="text-xs text-muted-foreground">{user.isDriver ? 'Driver' : 'Walker'}</span>
                </div>
                {user.isDriver && (
                  <div className="bg-secondary/10 text-secondary-foreground px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 border border-secondary/20">
                    <span className="text-secondary">{user.credits}</span> Credits
                  </div>
                )}
              </div>
              <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                Dashboard
              </Link>
              {user.isDriver && (
                <Link href="/rewards" className="text-sm font-medium hover:text-primary transition-colors">
                  Rewards
                </Link>
              )}
              <Link href="/support" className="text-sm font-medium hover:text-primary transition-colors">
                Support
              </Link>
              <Link href="/privacy" className="text-sm font-medium hover:text-primary transition-colors">
                Privacy
              </Link>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </>
          ) : !isLoading ? (
            <div className="flex items-center gap-2">
              <Link href="/auth">
                <Button variant="ghost" className="font-medium">Log in</Button>
              </Link>
              <Link href="/auth?tab=register">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-full px-6 shadow-md shadow-primary/20">
                  Get Started
                </Button>
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
