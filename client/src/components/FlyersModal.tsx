import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Download, FileText, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

interface FlyersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FlyersModal({ isOpen, onClose }: FlyersModalProps) {
  const [downloadingAll, setDownloadingAll] = useState(false);

  if (!isOpen) return null;

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAllFiles = async () => {
    setDownloadingAll(true);
    try {
      downloadFile("/driver-flyer.jpg", "ShortHop-Driver-Flyer.jpg");
      // Small delay between downloads
      setTimeout(() => {
        downloadFile("/hopper-flyer.pdf", "ShortHop-Hopper-Flyer.pdf");
      }, 500);
      
      // Show success message after a moment
      setTimeout(() => {
        setDownloadingAll(false);
      }, 1500);
    } catch (error) {
      console.error("Download error:", error);
      setDownloadingAll(false);
    }
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
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
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

          <CardContent className="space-y-4">
            {/* Message */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-foreground leading-relaxed">
                Help grow ShortHop in your area. Print these for free at your local library and spread the word.
              </p>
            </div>

            {/* Driver Flyer */}
            <motion.div whileHover={{ scale: 1.02 }} className="cursor-pointer">
              <button
                onClick={() => downloadFile("/driver-flyer.jpg", "ShortHop-Driver-Flyer.jpg")}
                className="w-full p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800 hover:shadow-md transition-shadow"
                data-testid="button-download-driver-flyer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-md">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-foreground">Driver Flyer</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Full-color flyer for drivers<br />
                      <span className="text-[10px]">JPG Image</span>
                    </p>
                  </div>
                  <Download className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
                </div>
              </button>
            </motion.div>

            {/* Hopper Flyers */}
            <motion.div whileHover={{ scale: 1.02 }} className="cursor-pointer">
              <button
                onClick={() => downloadFile("/hopper-flyer.pdf", "ShortHop-Hopper-Flyer.pdf")}
                className="w-full p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow"
                data-testid="button-download-hopper-flyer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-md">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-foreground">Hopper Flyers (Front & Back)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Print-ready flyer for hoppers<br />
                      <span className="text-[10px]">PDF Document</span>
                    </p>
                  </div>
                  <Download className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
                </div>
              </button>
            </motion.div>

            {/* Download All */}
            <Button
              onClick={downloadAllFiles}
              disabled={downloadingAll}
              className="w-full h-11 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
              data-testid="button-download-all-flyers"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloadingAll ? "Downloading..." : "Download All"}
            </Button>

            {/* Info */}
            <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
              <p className="text-xs text-muted-foreground">
                ✓ Mobile-friendly • ✓ Free to print • ✓ Spread the word locally
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
