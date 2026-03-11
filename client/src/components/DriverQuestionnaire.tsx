import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Music, PawPrint, ShoppingBag, Sparkles, ChevronRight, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { showFlash } from "@/components/FlashNotification";
import { api } from "@shared/routes";

interface DriverQuestionnaireProps {
  onComplete: () => void;
  initialValues?: {
    driverConvoComfort?: string | null;
    driverMusicPref?: string | null;
    driverPetsOk?: boolean | null;
    driverGroceriesOk?: boolean | null;
    driverLifestyleTags?: string | null;
  };
}

const CONVO_OPTIONS = [
  { value: "quiet", label: "Quiet Ride", emoji: "🤫", desc: "I prefer minimal conversation" },
  { value: "friendly_chat", label: "Friendly Chat", emoji: "😊", desc: "Happy to make small talk" },
  { value: "either", label: "Either Way", emoji: "🤝", desc: "I'm flexible — your call!" },
];

const MUSIC_OPTIONS = [
  { value: "no_music", label: "No Music", emoji: "🔇" },
  { value: "low_bg", label: "Low Background", emoji: "🔉" },
  { value: "rider_choice", label: "Rider's Choice", emoji: "🎵" },
  { value: "my_playlist", label: "My Playlist", emoji: "🎶" },
];

export function DriverQuestionnaire({ onComplete, initialValues }: DriverQuestionnaireProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [convo, setConvo] = useState(initialValues?.driverConvoComfort || "friendly_chat");
  const [music, setMusic] = useState(initialValues?.driverMusicPref || "rider_choice");
  const [petsOk, setPetsOk] = useState<boolean>(initialValues?.driverPetsOk ?? true);
  const [groceriesOk, setGroceriesOk] = useState<boolean>(initialValues?.driverGroceriesOk ?? true);
  const [lifestyleTags, setLifestyleTags] = useState(initialValues?.driverLifestyleTags || "");

  const totalSteps = 5;

  const saveQuestionnaire = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/user/profile", {
        driverConvoComfort: convo,
        driverMusicPref: music,
        driverPetsOk: petsOk,
        driverGroceriesOk: groceriesOk,
        driverLifestyleTags: lifestyleTags.trim() || null,
        driverQuestionnaireCompleted: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      showFlash("✅", "Profile saved — hoppers can see your vibe!", "success");
      onComplete();
    },
    onError: () => {
      showFlash("❌", "Failed to save profile", "error");
    },
  });

  return (
    <Card className="border-green-200/50 dark:border-green-800/40 bg-gradient-to-br from-green-50/50 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/10" data-testid="driver-questionnaire">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-green-500" />
          <p className="text-sm font-extrabold text-foreground">Driver Profile</p>
          <span className="text-[10px] text-muted-foreground ml-auto">{step + 1} / {totalSteps}</span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">Help hoppers feel comfortable riding with you</p>

        <div className="flex gap-1 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-green-500" : "bg-muted"}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="convo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-4 h-4 text-green-600" />
                <p className="text-xs font-bold">Conversation comfort?</p>
              </div>
              <div className="space-y-1.5">
                {CONVO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setConvo(opt.value)}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                      convo === opt.value
                        ? "border-green-400 bg-green-100/60 dark:bg-green-900/30 dark:border-green-600"
                        : "border-border/50 hover:border-green-300 dark:hover:border-green-700"
                    }`}
                    data-testid={`option-convo-${opt.value}`}
                  >
                    <span className="text-lg">{opt.emoji}</span>
                    <div>
                      <p className="text-xs font-bold">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                    </div>
                    {convo === opt.value && <Check className="w-4 h-4 text-green-500 ml-auto" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="music" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-2 mb-2">
                <Music className="w-4 h-4 text-green-600" />
                <p className="text-xs font-bold">Music preference?</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {MUSIC_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setMusic(opt.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                      music === opt.value
                        ? "border-green-400 bg-green-100/60 dark:bg-green-900/30 dark:border-green-600"
                        : "border-border/50 hover:border-green-300 dark:hover:border-green-700"
                    }`}
                    data-testid={`option-music-${opt.value}`}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <p className="text-[10px] font-bold text-center">{opt.label}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="pets" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-2 mb-2">
                <PawPrint className="w-4 h-4 text-green-600" />
                <p className="text-xs font-bold">Okay with pets?</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPetsOk(true)}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-lg border transition-all ${
                    petsOk ? "border-green-400 bg-green-100/60 dark:bg-green-900/30 dark:border-green-600" : "border-border/50"
                  }`}
                  data-testid="option-pets-yes"
                >
                  <span className="text-2xl">🐾</span>
                  <p className="text-xs font-bold">Pet Friendly</p>
                </button>
                <button
                  onClick={() => setPetsOk(false)}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-lg border transition-all ${
                    !petsOk ? "border-orange-400 bg-orange-100/60 dark:bg-orange-900/30 dark:border-orange-600" : "border-border/50"
                  }`}
                  data-testid="option-pets-no"
                >
                  <span className="text-2xl">🚫</span>
                  <p className="text-xs font-bold">No Pets</p>
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="groceries" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="w-4 h-4 text-green-600" />
                <p className="text-xs font-bold">Help with groceries or small items?</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setGroceriesOk(true)}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-lg border transition-all ${
                    groceriesOk ? "border-green-400 bg-green-100/60 dark:bg-green-900/30 dark:border-green-600" : "border-border/50"
                  }`}
                  data-testid="option-groceries-yes"
                >
                  <span className="text-2xl">🛍️</span>
                  <p className="text-xs font-bold">Happy to Help</p>
                </button>
                <button
                  onClick={() => setGroceriesOk(false)}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-lg border transition-all ${
                    !groceriesOk ? "border-orange-400 bg-orange-100/60 dark:bg-orange-900/30 dark:border-orange-600" : "border-border/50"
                  }`}
                  data-testid="option-groceries-no"
                >
                  <span className="text-2xl">🙅</span>
                  <p className="text-xs font-bold">Passengers Only</p>
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="tags" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-green-600" />
                <p className="text-xs font-bold">Anything else about you? (optional)</p>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">
                Share a fun fact, hobby, or lifestyle tag to help riders feel at ease.
              </p>
              <Input
                placeholder="e.g. UK student, dog lover, early bird..."
                value={lifestyleTags}
                onChange={(e) => setLifestyleTags(e.target.value)}
                maxLength={100}
                className="text-sm h-9"
                data-testid="input-lifestyle-tags"
              />
              <p className="text-[9px] text-muted-foreground mt-1 text-right">{lifestyleTags.length}/100</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 mt-4">
          {step > 0 && (
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setStep(step - 1)} data-testid="button-questionnaire-back">
              Back
            </Button>
          )}
          <Button
            size="sm"
            className="text-xs flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => {
              if (step < totalSteps - 1) {
                setStep(step + 1);
              } else {
                saveQuestionnaire.mutate();
              }
            }}
            disabled={saveQuestionnaire.isPending}
            data-testid="button-questionnaire-next"
          >
            {step < totalSteps - 1 ? (
              <>Next <ChevronRight className="w-3 h-3 ml-1" /></>
            ) : saveQuestionnaire.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
