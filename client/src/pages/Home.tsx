import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, MapPin, Sparkles, Globe, ChevronDown, Star, AlertTriangle, RefreshCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import heroImg from '@assets/660BFE19-0B0D-4EAF-80FF-0BDCB97F3624_1772922571220.png';
import storesImg from '@assets/Bazaart_185A494F-721C-4A45-A827-D30BF7419E7D_1773320312839.jpeg';

const LANGUAGES = [
  { code: "en", name: "English", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "es", name: "Espa\u00f1ol", flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "fr", name: "Fran\u00e7ais", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "zh", name: "\u4E2D\u6587", flag: "\u{1F1E8}\u{1F1F3}" },
  { code: "ar", name: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", flag: "\u{1F1F8}\u{1F1E6}" },
  { code: "hi", name: "\u0939\u093F\u0928\u094D\u0926\u0940", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "pt", name: "Portugu\u00eas", flag: "\u{1F1E7}\u{1F1F7}" },
  { code: "ja", name: "\u65E5\u672C\u8A9E", flag: "\u{1F1EF}\u{1F1F5}" },
  { code: "ko", name: "\uD55C\uAD6D\uC5B4", flag: "\u{1F1F0}\u{1F1F7}" },
  { code: "de", name: "Deutsch", flag: "\u{1F1E9}\u{1F1EA}" },
  { code: "sw", name: "Kiswahili", flag: "\u{1F1F0}\u{1F1EA}" },
  { code: "tl", name: "Tagalog", flag: "\u{1F1F5}\u{1F1ED}" },
  { code: "vi", name: "Ti\u1EBFng Vi\u1EC7t", flag: "\u{1F1FB}\u{1F1F3}" },
  { code: "ru", name: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", flag: "\u{1F1F7}\u{1F1FA}" },
];

const HOME_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    tagline: "Move Forward with ShortHop",
    subtitle: "Affordable, simple, and social.",
    description: "ShortHop connects people already heading the same way. Drivers can earn and help others along their route, meet new people, and earn money. Hoppers get a convenient, low-cost ride\u2014no pressure, no extra apps.",
    your_route: "Your route. Your routine.",
    fun: "If you're already headed that way, why not have some fun?",
    get_started: "Get Started",
    login: "Login to Account",
    for_hoppers: "For Hoppers",
    hoppers_1: "Put in where you're going",
    hoppers_2: "Pay then get matched with someone already headed that way",
    hoppers_3: "Get there conveniently and affordably.",
    for_drivers: "For Drivers",
    drivers_1: "Register your regular routes.",
    drivers_2: "Only pick up Hoppers going along your exact path.",
    drivers_3: "Help others and earn money you can cash out anytime.",
    safety_title: "Safety & Trust",
    safety_tracking: "Live Trip Tracking",
    safety_tracking_desc: "See your matched Driver or Hopper in real time.",
    safety_ratings: "Two-Way Ratings",
    safety_ratings_desc: "Both Drivers and Hoppers rate each ride to build community trust.",
    safety_reporting: "In-App Reporting",
    safety_reporting_desc: "Flag any safety concerns, misconduct, or emergencies.",
    safety_refunds: "Automatic Refunds",
    safety_refunds_desc: "If a ride doesn't happen, you don't pay.",
    hopping_soon: "Hopping Soon",
    hopping_desc: "Coming to all major app stores. Subscribe through your device with Apple Pay, Google Pay, and more.",
  },
  es: {
    tagline: "Avanza con ShortHop",
    subtitle: "Asequible, simple y social.",
    description: "ShortHop conecta personas que ya van en la misma direcci\u00f3n. Los conductores ganan y ayudan a otros en su ruta. Los Hoppers obtienen un viaje conveniente y econ\u00f3mico.",
    your_route: "Tu ruta. Tu rutina.",
    fun: "Si ya vas por ah\u00ed, \u00bfpor qu\u00e9 no divertirte?",
    get_started: "Comenzar",
    login: "Iniciar Sesi\u00f3n",
    for_hoppers: "Para Hoppers",
    hoppers_1: "Pon a d\u00f3nde vas",
    hoppers_2: "Paga y emparejar\u00e1s con alguien que ya va en esa direcci\u00f3n",
    hoppers_3: "Llega de forma conveniente y econ\u00f3mica.",
    for_drivers: "Para Conductores",
    drivers_1: "Registra tus rutas habituales.",
    drivers_2: "Solo recoge Hoppers que van por tu camino exacto.",
    drivers_3: "Ayuda a otros y gana dinero que puedes retirar cuando quieras.",
    safety_title: "Seguridad y Confianza",
    safety_tracking: "Seguimiento en Vivo",
    safety_tracking_desc: "Ve a tu conductor o Hopper en tiempo real.",
    safety_ratings: "Calificaciones Mutuas",
    safety_ratings_desc: "Ambos califican cada viaje para construir confianza.",
    safety_reporting: "Reportes en la App",
    safety_reporting_desc: "Reporta cualquier preocupaci\u00f3n de seguridad.",
    safety_refunds: "Reembolsos Autom\u00e1ticos",
    safety_refunds_desc: "Si un viaje no ocurre, no pagas.",
    hopping_soon: "Pr\u00f3ximamente",
    hopping_desc: "Llegando a todas las tiendas de apps. Suscr\u00edbete con Apple Pay, Google Pay y m\u00e1s.",
  },
};

function t(lang: string, key: string): string {
  return HOME_TRANSLATIONS[lang]?.[key] || HOME_TRANSLATIONS["en"][key] || key;
}

export default function Home() {
  const { data: user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("shorthop_lang") || "en"; } catch { return "en"; }
  });
  const [langOpen, setLangOpen] = useState(false);
  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  const changeLang = (code: string) => {
    setLang(code);
    setLangOpen(false);
    try { localStorage.setItem("shorthop_lang", code); } catch {}
  };

  useEffect(() => {
    if (user) {
      setLocation("/instahop");
    }
  }, [user, setLocation]);

  if (user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="absolute top-3 right-3 z-50">
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 text-sm font-medium hover:bg-muted/50 transition-colors shadow-sm"
            data-testid="button-language-picker"
          >
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{currentLang.flag}</span>
            <span className="hidden sm:inline text-xs">{currentLang.name}</span>
            <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${langOpen ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-xl shadow-lg py-1 min-w-[180px] max-h-[300px] overflow-y-auto"
                  data-testid="dropdown-language-list"
                >
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => changeLang(l.code)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${lang === l.code ? "bg-primary/10 font-semibold" : ""}`}
                      data-testid={`button-lang-${l.code}`}
                    >
                      <span className="text-base">{l.flag}</span>
                      <span>{l.name}</span>
                      {lang === l.code && <span className="ml-auto text-primary text-xs">{"\u2713"}</span>}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <section className="relative pt-16 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
          <img src={heroImg} alt="Background" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background" />
        </div>

        <div className="container mx-auto px-4 max-w-3xl relative z-10">
          <div className="text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm border border-primary/20"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t(lang, "tagline")}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl md:text-2xl font-bold text-foreground"
            >
              {t(lang, "subtitle")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-4 text-base text-muted-foreground leading-relaxed"
            >
              <p>{t(lang, "description")}</p>
              <div className="pt-4 space-y-1">
                <p className="font-semibold text-foreground">{t(lang, "your_route")}</p>
                <p className="italic">{t(lang, "fun")}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Link href="/auth?tab=register">
                <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}>
                  <Button size="lg" className="w-full sm:w-auto text-lg rounded-full px-8 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/30 transition-all" data-testid="button-get-started">
                    {t(lang, "get_started")}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
              </Link>
              <Link href="/auth">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg rounded-full px-8 bg-background border-2 hover:bg-muted/50 transition-all" data-testid="button-login-home">
                    {t(lang, "login")}
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-card border-y border-border">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{"\u{1F3C3}"}</span>
                <h2 className="text-xl font-bold">{t(lang, "for_hoppers")}</h2>
              </div>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="text-primary mt-0.5 shrink-0">{"\u2022"}</span>
                  {t(lang, "hoppers_1")}
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-primary mt-0.5 shrink-0">{"\u2022"}</span>
                  {t(lang, "hoppers_2")}
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-primary mt-0.5 shrink-0">{"\u2022"}</span>
                  {t(lang, "hoppers_3")}
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{"\u{1F697}"}</span>
                <h2 className="text-xl font-bold">{t(lang, "for_drivers")}</h2>
              </div>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="text-primary mt-0.5 shrink-0">{"\u2022"}</span>
                  {t(lang, "drivers_1")}
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-primary mt-0.5 shrink-0">{"\u2022"}</span>
                  {t(lang, "drivers_2")}
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-primary mt-0.5 shrink-0">{"\u2022"}</span>
                  {t(lang, "drivers_3")}
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 border-b border-border">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-semibold text-sm border border-green-500/20">
                <ShieldCheck className="w-4 h-4" />
                {t(lang, "safety_title")}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/50 bg-muted/20 p-5 space-y-2">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-sm font-bold text-foreground">{t(lang, "safety_tracking")}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{t(lang, "safety_tracking_desc")}</p>
              </div>

              <div className="rounded-2xl border border-border/50 bg-muted/20 p-5 space-y-2">
                <div className="flex items-center gap-2.5">
                  <Star className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-sm font-bold text-foreground">{t(lang, "safety_ratings")}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{t(lang, "safety_ratings_desc")}</p>
              </div>

              <div className="rounded-2xl border border-border/50 bg-muted/20 p-5 space-y-2">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                  <p className="text-sm font-bold text-foreground">{t(lang, "safety_reporting")}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{t(lang, "safety_reporting_desc")}</p>
              </div>

              <div className="rounded-2xl border border-border/50 bg-muted/20 p-5 space-y-2">
                <div className="flex items-center gap-2.5">
                  <RefreshCcw className="w-4 h-4 text-blue-500 shrink-0" />
                  <p className="text-sm font-bold text-foreground">{t(lang, "safety_refunds")}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{t(lang, "safety_refunds_desc")}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-6"
          >
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">
              {t(lang, "hopping_soon")}
            </h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">
              {t(lang, "hopping_desc")}
            </p>
            <div className="relative max-w-md mx-auto">
              <motion.div
                className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{ filter: "blur(20px)" }}
              />
              <img
                src={storesImg}
                alt="Coming soon to Apple App Store, Google Play, Amazon Appstore, Microsoft Store, Huawei AppGallery, and more"
                className="relative z-10 w-full rounded-3xl shadow-xl border border-border/30"
                data-testid="img-hopping-soon-stores"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="py-10 bg-muted/30 border-t">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex flex-col items-center gap-5">
            <div className="flex items-center gap-6 text-sm">
              <Link href="/support" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-support">
                Support & Safety
              </Link>
              <Link href="/artist" className="relative group flex flex-col items-center gap-0 transition-transform hover:scale-105" data-testid="link-footer-artist">
                <span className="relative">
                  <img src="/artist-icon.png" alt="" className="w-10 h-10 inline-block dark:invert drop-shadow-md" />
                </span>
                <span className="text-[10px] bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-bold -mt-0.5">Artist</span>
              </Link>
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-privacy">
                Privacy & Terms
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} ShortHop. Shared routes. Real connections.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
