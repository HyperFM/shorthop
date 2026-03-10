import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Leaf, ShieldCheck, MapPin, Zap, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import heroImg from '@assets/660BFE19-0B0D-4EAF-80FF-0BDCB97F3624_1772922571220.png';
import featureImg from '@assets/75C22BDF-5452-40CB-AA2E-053855BC7702_1772922571220.png';

const floatingEmojis = ["🚗", "🏃", "🛞", "⚡", "🌿", "✨"];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative pt-16 pb-28 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <img src={heroImg} alt="Background" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background" />
        </div>

        {floatingEmojis.map((emoji, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl sm:text-3xl pointer-events-none select-none z-0 opacity-20"
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -15, 0],
              rotate: [0, i % 2 === 0 ? 10 : -10, 0],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          >
            {emoji}
          </motion.div>
        ))}
        
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm mb-4 border border-primary/20"
            >
              <Sparkles className="w-4 h-4 mr-2 animate-wiggle" />
              Shared routes. Real connections.
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-7xl font-extrabold text-foreground tracking-tight leading-tight"
            >
              Jump, Skip, and a{" "}
              <motion.span 
                className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary inline-block"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                Hop.
              </motion.span>
            </motion.h1>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-lg text-muted-foreground leading-relaxed space-y-4"
            >
              <p>Walking is the best option for your physical and financial health.</p>
              <p className="font-semibold text-foreground flex items-center justify-center gap-2">
                <Zap className="w-5 h-5 text-secondary" />
                A Hop moves you affordably forward.
              </p>
              <p>ShortHop turns a driver's everyday route into an opportunity — helping others along the way, meeting new people, and earning rewards, all from the comfort of their car.</p>
              <div className="pt-8 border-t border-border/30 space-y-6">
                <p className="text-foreground font-medium">Instead of high prices and pressure, ShortHop is built on convenience, opportunity, and connection.</p>
                <div className="space-y-2">
                  <p className="font-semibold text-foreground">Your route. Your routine.</p>
                  <p>You're already heading that way…</p>
                  <p className="italic">might as well have some fun. :)</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Link href="/auth?tab=register">
                <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}>
                  <Button size="lg" className="w-full sm:w-auto text-lg rounded-full px-8 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/30 transition-all" data-testid="button-get-started">
                    Get Started
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
              </Link>
              <Link href="/auth">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg rounded-full px-8 bg-background border-2 hover:bg-muted/50 transition-all" data-testid="button-login-home">
                    Login to Account
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-card border-y border-border">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <h2 className="text-3xl md:text-4xl font-bold">A cooperative network, not gig work.</h2>
              
              <div className="space-y-6">
                <motion.div 
                  whileHover={{ x: 5 }}
                  className="flex gap-4 p-4 rounded-2xl hover:bg-secondary/5 transition-colors"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center flex-shrink-0 text-3xl animate-float">
                    🏃
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">For Walkers</h3>
                    <p className="text-muted-foreground">Move forward in stages. Choose from Walk, Short Hop, Flex Hop, or Power Hop. All rides stay inside Short Hop—no more switching through multiple apps.</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  whileHover={{ x: 5 }}
                  className="flex gap-4 p-4 rounded-2xl hover:bg-primary/5 transition-colors"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 text-3xl animate-float" style={{ animationDelay: "1s" }}>
                    🚗
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">For Drivers</h3>
                    <p className="text-muted-foreground">Register your routine routes. Only pick up walkers along your exact path. Help others advance and earn Wheels to redeem for rewards.</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <motion.div 
                className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-[3rem] transform rotate-3"
                animate={{ rotate: [3, 5, 3] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              <img 
                src={featureImg} 
                alt="Feature visual" 
                className="relative z-10 rounded-[3rem] shadow-2xl border border-white/20 object-cover w-full aspect-square"
              />
            </motion.div>
          </div>
        </div>
      </section>

      <footer className="py-12 bg-muted/30 border-t">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} ShortHop. Shared routes. Real connections.</p>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/artist" className="relative group flex flex-col items-center gap-0 transition-transform hover:scale-105">
                <span className="relative">
                  <img src="/artist-icon.png" alt="" className="w-12 h-12 inline-block dark:invert drop-shadow-md" />
                  <span className="absolute inset-0 rounded-full animate-ping bg-primary/20 pointer-events-none" />
                </span>
                <span className="text-xs bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-bold -mt-1">Artist</span>
              </Link>
              <Link href="/support" className="text-muted-foreground hover:text-foreground transition-colors">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
