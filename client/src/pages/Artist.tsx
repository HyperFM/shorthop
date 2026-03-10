import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import artistPhoto from "@assets/IMG_1045_1773139915037.png";
import artistIcon from "@assets/Bazaart_C170F68C-567F-4AFE-9D29-92CC851910BD_1773139915035.png";

export default function Artist() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const descOpacity = useTransform(scrollYProgress, [0.3, 0.55], [0, 1]);
  const descY = useTransform(scrollYProgress, [0.3, 0.55], [60, 0]);

  return (
    <div ref={containerRef} className="min-h-screen">
      <div className="relative w-full">
        <img
          src={artistPhoto}
          alt="HyperFM"
          className="w-full object-contain"
          data-testid="img-artist-photo"
        />
      </div>

      <div className="container mx-auto px-6 max-w-2xl relative z-10 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <motion.img
            src={artistIcon}
            alt="HyperFM Symbol"
            className="w-16 h-16 mx-auto rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15, delay: 0.2 }}
          />

          <h1 className="text-3xl sm:text-4xl font-display font-black text-foreground tracking-tight" data-testid="text-artist-name">
            HyperFM
          </h1>
          <p className="text-sm text-muted-foreground font-medium tracking-wide" data-testid="text-artist-subtitle">
            Lexington Artist &bull; Founder &bull; CEO
          </p>
        </motion.div>

        <motion.div
          style={{ opacity: descOpacity, y: descY }}
          className="mt-10"
        >
          <p className="text-muted-foreground leading-relaxed text-[15px]" data-testid="text-artist-bio">
            ShortHop is the work of a Lexington-originated artist known as HyperFM, focused on building new music and creating opportunities for growth and creativity. The platform began with a simple moment of curiosity — running late for work, watching cars pass by, and wondering what it would look like if there were something that connected those passing moments and people together. Since then, the idea has continued to evolve as both a creative project and a digital environment for expression.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
