import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Download } from "lucide-react";
import { motion } from "framer-motion";

interface FlyersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FLYERS: { src: string; filename: string; label: string }[] = [
  { src: "/flyer-qr-poster.png", filename: "ShortHop-QR-Poster.png", label: "QR Poster" },
  { src: "/flyer-drivers-riders.jpeg", filename: "ShortHop-Drivers-Riders.jpeg", label: "Drivers & Riders" },
  { src: "/flyer-multilingual.jpeg", filename: "ShortHop-Multilingual.jpeg", label: "Multilingual Sheet" },
  { src: "/flyer-business-cards.png", filename: "ShortHop-Business-Cards.png", label: "Business Cards" },
  { src: "/flyer-stickers-sheet.png", filename: "ShortHop-Stickers-Sheet.png", label: "Stickers Sheet" },
  { src: "/flyer-qr-only.jpeg", filename: "ShortHop-QR-Only.jpeg", label: "QR Only" },
  { src: "/flyer-logo-white.jpeg", filename: "ShortHop-Logo-White.jpeg", label: "Logo (White BG)" },
  { src: "/flyer-logo-black.jpeg", filename: "ShortHop-Logo-Black.jpeg", label: "Logo (Black BG)" },
];

export function FlyersModal({ isOpen, onClose }: FlyersModalProps) {
  if (!isOpen) return null;

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      data-testid="modal-flyers"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-background shadow-xl"
      >
        <Card className="border-0">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4 sticky top-0 bg-background z-10">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span>📑</span>
              ShortHop Flyers
            </CardTitle>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              data-testid="button-close-flyers"
            >
              <X className="w-5 h-5" />
            </button>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-foreground leading-relaxed">
                Help grow ShortHop in your area. Print these for free at your local library and spread the word.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {FLYERS.map((flyer, i) => (
                <motion.button
                  key={flyer.filename}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => downloadFile(flyer.src, flyer.filename)}
                  className="group relative rounded-xl overflow-hidden border border-border bg-muted/30 hover:shadow-lg transition-all"
                  data-testid={`button-download-flyer-${i}`}
                >
                  <div className="aspect-square w-full bg-white dark:bg-neutral-900 flex items-center justify-center overflow-hidden">
                    <img
                      src={flyer.src}
                      alt={flyer.label}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-white/95 text-black rounded-full p-2 shadow-lg">
                      <Download className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="px-2 py-1.5 text-[11px] font-medium text-foreground bg-background/90 text-center truncate">
                    {flyer.label}
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                Tap any flyer to download • Free to print • Spread the word locally
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
