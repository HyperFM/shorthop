import { Link } from "wouter";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import logoImg from '@assets/shorthop_logo_nobg.png';

export function NavBar() {
  const { data: user, isLoading } = useAuth();
  const logout = useLogout();

  if (!isLoading && user) return null;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between max-w-lg">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <motion.img
            src={logoImg}
            alt="Short Hop Logo"
            className="w-8 h-8 object-contain rounded-lg"
            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
            transition={{ duration: 0.4 }}
          />
          <span className="font-display font-bold text-lg text-primary tracking-tight">ShortHop</span>
        </Link>

        {!isLoading && !user && (
          <div className="flex items-center gap-2">
            <Link href="/auth">
              <Button variant="ghost" size="sm" className="font-medium text-sm" data-testid="button-login">Log in</Button>
            </Link>
            <Link href="/auth?tab=register">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="sm" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-bold rounded-full px-5 shadow-lg shadow-primary/25" data-testid="button-register">
                  Get Started
                </Button>
              </motion.div>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
