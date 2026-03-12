import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Leaf, ShieldCheck, MapPin, Zap, Sparkles, Globe, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import heroImg from '@assets/660BFE19-0B0D-4EAF-80FF-0BDCB97F3624_1772922571220.png';
import featureImg from '@assets/75C22BDF-5452-40CB-AA2E-053855BC7702_1772922571220.png';
import storesImg from '@assets/Bazaart_185A494F-721C-4A45-A827-D30BF7419E7D_1773320312839.jpeg';

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "sw", name: "Kiswahili", flag: "🇰🇪" },
  { code: "tl", name: "Tagalog", flag: "🇵🇭" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
];

const HOME_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    tagline: "Shared routes. Real connections.",
    title_pre: "Jump, Skip, and a",
    title_hop: "Hop.",
    walking: "Walking is the best option for your physical and financial health.",
    hop_moves: "A Hop moves you affordably forward.",
    description: "ShortHop turns a driver's everyday route into an opportunity — helping others along the way, meeting new people, and earning real money, all from the comfort of their car.",
    cooperative: "Instead of high prices and pressure, ShortHop is built on convenience, opportunity, and connection.",
    your_route: "Your route. Your routine.",
    already: "You're already heading that way…",
    fun: "might as well have some fun. :)",
    get_started: "Get Started",
    login: "Login to Account",
    for_walkers: "For Walkers",
    walkers_desc: "Move forward in stages. Choose from Walk, Short Hop, Flex Hop, or Power Hop. All rides stay inside Short Hop—no more switching through multiple apps.",
    for_drivers: "For Drivers",
    drivers_desc: "Register your routine routes. Only pick up walkers along your exact path. Help others advance and earn Wheels you can cash out anytime.",
    coop_title: "A cooperative network, not gig work.",
    hopping_soon: "Hopping Soon",
    hopping_desc: "Coming to all major app stores. Subscribe through your device with Apple Pay, Google Pay, and more.",
  },
  es: {
    tagline: "Rutas compartidas. Conexiones reales.",
    title_pre: "Salta, brinca y un",
    title_hop: "Hop.",
    walking: "Caminar es la mejor opción para tu salud física y financiera.",
    hop_moves: "Un Hop te mueve hacia adelante de forma económica.",
    description: "ShortHop convierte la ruta diaria de un conductor en una oportunidad — ayudando a otros, conociendo gente y ganando dinero real.",
    cooperative: "En lugar de precios altos y presión, ShortHop está construido sobre conveniencia, oportunidad y conexión.",
    your_route: "Tu ruta. Tu rutina.",
    already: "Ya vas en esa dirección…",
    fun: "mejor diviértete. :)",
    get_started: "Comenzar",
    login: "Iniciar Sesión",
    for_walkers: "Para Caminantes",
    walkers_desc: "Avanza por etapas. Elige entre Walk, Short Hop, Flex Hop o Power Hop. Todos los viajes en Short Hop.",
    for_drivers: "Para Conductores",
    drivers_desc: "Registra tus rutas habituales. Solo recoge caminantes en tu camino. Ayuda y gana Wheels.",
    coop_title: "Una red cooperativa, no trabajo temporal.",
    hopping_soon: "Próximamente",
    hopping_desc: "Llegando a todas las tiendas de apps. Suscríbete con Apple Pay, Google Pay y más.",
  },
  fr: {
    tagline: "Trajets partagés. Vraies connexions.",
    title_pre: "Sauter, bondir et un",
    title_hop: "Hop.",
    walking: "Marcher est la meilleure option pour votre santé physique et financière.",
    hop_moves: "Un Hop vous fait avancer à prix abordable.",
    description: "ShortHop transforme le trajet quotidien d'un conducteur en opportunité — aider les autres, rencontrer des gens et gagner de l'argent.",
    cooperative: "Au lieu de prix élevés, ShortHop est construit sur la commodité, l'opportunité et la connexion.",
    your_route: "Votre trajet. Votre routine.",
    already: "Vous allez déjà par là…",
    fun: "autant en profiter. :)",
    get_started: "Commencer",
    login: "Se Connecter",
    for_walkers: "Pour les Marcheurs",
    walkers_desc: "Avancez par étapes. Choisissez entre Walk, Short Hop, Flex Hop ou Power Hop.",
    for_drivers: "Pour les Conducteurs",
    drivers_desc: "Enregistrez vos trajets habituels. Ne prenez que les marcheurs sur votre chemin.",
    coop_title: "Un réseau coopératif, pas du travail précaire.",
    hopping_soon: "Bientôt Disponible",
    hopping_desc: "Bientôt sur toutes les boutiques d'apps. Abonnez-vous avec Apple Pay, Google Pay et plus.",
  },
  zh: {
    tagline: "共享路线。真实连接。",
    title_pre: "跳跃、蹦跳和",
    title_hop: "一跳。",
    walking: "步行是对您身心和经济健康的最佳选择。",
    hop_moves: "一跳让您实惠前行。",
    description: "ShortHop 将司机的日常路线变成机会——帮助他人、结识新朋友、赚取真金白银。",
    cooperative: "ShortHop 建立在便利、机会和连接之上，而非高价和压力。",
    your_route: "你的路线。你的日常。",
    already: "你已经在这条路上了…",
    fun: "不如一起开心吧。:)",
    get_started: "开始使用",
    login: "登录账户",
    for_walkers: "步行者",
    walkers_desc: "分阶段前进。选择 Walk、Short Hop、Flex Hop 或 Power Hop。",
    for_drivers: "驾驶者",
    drivers_desc: "注册您的常规路线。只接顺路的步行者。帮助他人并赚取 Wheels。",
    coop_title: "合作网络，不是零工。",
    hopping_soon: "即将上线",
    hopping_desc: "即将登陆所有主要应用商店。使用 Apple Pay、Google Pay 等订阅。",
  },
};

function t(lang: string, key: string): string {
  return HOME_TRANSLATIONS[lang]?.[key] || HOME_TRANSLATIONS["en"][key] || key;
}

const floatingEmojis = ["🚗", "🏃", "🛞", "⚡", "🌿", "✨"];

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
      setLocation("/dashboard");
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
                      {lang === l.code && <span className="ml-auto text-primary text-xs">✓</span>}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

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
              {t(lang, "tagline")}
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-7xl font-extrabold text-foreground tracking-tight leading-tight"
            >
              {t(lang, "title_pre")}{" "}
              <motion.span 
                className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary inline-block"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                {t(lang, "title_hop")}
              </motion.span>
            </motion.h1>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-lg text-muted-foreground leading-relaxed space-y-4"
            >
              <p>{t(lang, "walking")}</p>
              <p className="font-semibold text-foreground flex items-center justify-center gap-2">
                <Zap className="w-5 h-5 text-secondary" />
                {t(lang, "hop_moves")}
              </p>
              <p>{t(lang, "description")}</p>
              <div className="pt-8 border-t border-border/30 space-y-6">
                <p className="text-foreground font-medium">{t(lang, "cooperative")}</p>
                <div className="space-y-2">
                  <p className="font-semibold text-foreground">{t(lang, "your_route")}</p>
                  <p>{t(lang, "already")}</p>
                  <p className="italic">{t(lang, "fun")}</p>
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
              <h2 className="text-3xl md:text-4xl font-bold">{t(lang, "coop_title")}</h2>
              
              <div className="space-y-6">
                <motion.div 
                  whileHover={{ x: 5 }}
                  className="flex gap-4 p-4 rounded-2xl hover:bg-secondary/5 transition-colors"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center flex-shrink-0 text-3xl animate-float">
                    🏃
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">{t(lang, "for_walkers")}</h3>
                    <p className="text-muted-foreground">{t(lang, "walkers_desc")}</p>
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
                    <h3 className="text-xl font-bold mb-2">{t(lang, "for_drivers")}</h3>
                    <p className="text-muted-foreground">{t(lang, "drivers_desc")}</p>
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

      <section className="py-20 bg-gradient-to-b from-background to-muted/20 border-t border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-6"
          >
            <motion.h2
              className="text-3xl md:text-4xl font-extrabold text-foreground"
              animate={{ scale: [1, 1.01, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {t(lang, "hopping_soon")}
            </motion.h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t(lang, "hopping_desc")}
            </p>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative max-w-xl mx-auto"
            >
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
            </motion.div>
          </motion.div>
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
