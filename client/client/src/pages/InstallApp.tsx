import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Monitor, Apple, Chrome } from "lucide-react";
import installGuideImg from "@assets/Bazaart_1AAAA4A6-0FC1-45A0-B1AE-31293E79ECB8_1773257943824.jpeg";

export default function InstallApp() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24" data-testid="install-app-page">
      <div className="text-center mb-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-500/30">
          <Smartphone className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-xl font-extrabold text-foreground">Install ShortHop</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Add ShortHop to your home screen for the full app experience
        </p>
      </div>

      <Card className="mb-4 border-orange-200/50 dark:border-orange-800/40 overflow-hidden" data-testid="card-visual-guide">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 px-4 py-2.5 border-b border-orange-200/30 dark:border-orange-800/30">
            <div className="flex items-center gap-2">
              <Badge className="text-[9px] bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 border-0">VISUAL GUIDE</Badge>
              <p className="text-xs font-bold text-foreground">4 Easy Steps</p>
            </div>
          </div>
          <img
            src={installGuideImg}
            alt="Visual guide showing 4 steps to install ShortHop: 1. Tap three dots, 2. Tap Share, 3. Add to Home Screen, 4. Success!"
            className="w-full"
            data-testid="img-install-guide"
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Card className="border-blue-200/50 dark:border-blue-800/40" data-testid="card-iphone-steps">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Apple className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-extrabold">iPhone (Safari)</p>
                <p className="text-[10px] text-muted-foreground">Best experience in Safari</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                { step: 1, text: "Open ShortHop in Safari", detail: "Make sure you're using Safari, not Chrome" },
                { step: 2, text: "Tap the Share button", detail: "The square with an arrow at the bottom of the screen" },
                { step: 3, text: 'Scroll down and tap "Add to Home Screen"', detail: "You may need to scroll down in the share menu" },
                { step: 4, text: 'Tap "Add" in the top right', detail: "ShortHop will appear on your home screen!" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">{item.step}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{item.text}</p>
                    <p className="text-[10px] text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200/50 dark:border-green-800/40" data-testid="card-android-steps">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <Chrome className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-extrabold">Android (Chrome)</p>
                <p className="text-[10px] text-muted-foreground">Works best in Chrome</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                { step: 1, text: "Open ShortHop in Chrome", detail: "Navigate to the ShortHop website" },
                { step: 2, text: "Tap the three-dot menu (⋮)", detail: "In the top-right corner of Chrome" },
                { step: 3, text: 'Tap "Add to Home screen"', detail: "Or \"Install app\" if prompted" },
                { step: 4, text: 'Tap "Add" to confirm', detail: "ShortHop will be added like a real app!" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-extrabold text-green-600 dark:text-green-400">{item.step}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{item.text}</p>
                    <p className="text-[10px] text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50" data-testid="card-desktop-steps">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
                <Monitor className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-extrabold">Desktop (Chrome/Edge)</p>
                <p className="text-[10px] text-muted-foreground">Install as a desktop app</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                { step: 1, text: "Look for the install icon", detail: "In the address bar (right side), look for ⊕ or the install icon" },
                { step: 2, text: 'Click "Install"', detail: "ShortHop opens as its own window — no browser tabs!" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-extrabold text-gray-600 dark:text-gray-400">{item.step}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{item.text}</p>
                    <p className="text-[10px] text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="text-center py-3">
          <p className="text-[10px] text-muted-foreground">
            Once installed, ShortHop works like a native app — fast, fullscreen, and always one tap away 🚗
          </p>
        </div>
      </div>
    </div>
  );
}
