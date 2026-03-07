import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Leaf, ShieldCheck, MapPin } from "lucide-react";
import heroImg from '@assets/660BFE19-0B0D-4EAF-80FF-0BDCB97F3624_1772922571220.png';
import featureImg from '@assets/75C22BDF-5452-40CB-AA2E-053855BC7702_1772922571220.png';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
          <img src={heroImg} alt="Background" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/50 to-background" />
        </div>
        
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm mb-4 border border-primary/20">
              <Leaf className="w-4 h-4 mr-2" />
              The smarter way to commute
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-foreground tracking-tight leading-tight">
              Hop, Skip, and a <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Jump.</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Walking is the default. Advancement is the assist. Full rides are the backup.
              Save time and money, or earn credits without the pressure of gig work.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/auth?tab=register">
                <Button size="lg" className="w-full sm:w-auto text-lg rounded-full px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all">
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/auth">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg rounded-full px-8 bg-background border-2 hover:bg-muted/50 transition-all">
                  Login to Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card border-y border-border">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-3xl md:text-4xl font-bold">A cooperative network, not gig work.</h2>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center flex-shrink-0 text-secondary">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">For Walkers</h3>
                    <p className="text-muted-foreground">Running late? Need a quick lift for the last mile? Get a "Short Hop" for just a flat $10/month subscription.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">For Drivers</h3>
                    <p className="text-muted-foreground">Register your routine commute. Only pick up requests along your exact path. Earn credits with zero pressure.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-[3rem] transform rotate-3" />
              <img 
                src={featureImg} 
                alt="Feature visual" 
                className="relative z-10 rounded-[3rem] shadow-2xl border border-white/20 object-cover w-full aspect-square"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
