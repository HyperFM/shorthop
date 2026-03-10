import { Link } from "wouter";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, Settings as SettingsIcon, Users } from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";
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

        <div className="flex items-center gap-3">
          {!isLoading && user ? (
            <>
              <div className="hidden sm:flex items-center gap-3 mr-2">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground">{user.username}</span>
                    {user.isFounder && user.founderBadge && (
                      <span className="text-[10px] bg-gradient-to-r from-orange-500 to-green-500 text-white px-1.5 py-0.5 rounded-full font-bold leading-none">🛞</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {user.isDriver ? 'Driver' : 'Walker'}
                    {user.tier === 'flexhop' && ' · FlexHop'}
                  </span>
                </div>
                {user.isDriver && (
                  <div className="bg-secondary/10 text-secondary-foreground px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 border border-secondary/20">
                    <span className="text-secondary">{user.credits}</span> Wheels
                  </div>
                )}
              </div>
              <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors" data-testid="link-dashboard">
                Dashboard
              </Link>
              {user.isDriver && (
                <Link href="/rewards" className="text-sm font-medium hover:text-primary transition-colors" data-testid="link-rewards">
                  Rewards
                </Link>
              )}
              <Link href="/community" className="text-sm font-medium hover:text-primary transition-colors" data-testid="link-community">
                <span className="hidden sm:inline">Community</span>
                <Users className="w-4 h-4 sm:hidden" />
              </Link>
              <NotificationCenter />
              <Link href="/settings" data-testid="link-settings">
                <SettingsIcon className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
              </Link>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="text-muted-foreground hover:text-destructive transition-colors"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : !isLoading ? (
            <div className="flex items-center gap-2">
              <Link href="/auth">
                <Button variant="ghost" className="font-medium" data-testid="button-login">Log in</Button>
              </Link>
              <Link href="/auth?tab=register">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-full px-6 shadow-md shadow-primary/20" data-testid="button-register">
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
