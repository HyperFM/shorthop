import { motion } from "framer-motion";
import artistPhoto from "@assets/IMG_1045_1773139915037.png";
import artistIcon from "@assets/Bazaart_C170F68C-567F-4AFE-9D29-92CC851910BD_1773139915035.png";

export default function Artist() {
  return (
    <div className="min-h-screen">
      <div className="relative w-full h-[60vh] sm:h-[70vh] overflow-hidden">
        <img
          src={artistPhoto}
          alt="HyperFM"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>

      <div className="container mx-auto px-6 max-w-2xl -mt-20 relative z-10 pb-16">
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
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
