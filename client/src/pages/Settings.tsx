import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, Users, Globe, Sparkles, Shield, Gift, Copy, Share2, Check, Mail, AlertTriangle, Smartphone, Palette, Camera, Plus, X, Eye, EyeOff, Lock } from "lucide-react";
import { PROFILE_TAB_COLORS } from "@/components/BottomTabBar";
import { useLocation } from "wouter";
import { showFlash } from "@/components/FlashNotification";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { api } from "@shared/routes";
import { InterestBubbles } from "@/components/InterestBubbles";
import { SubscriptionModal } from "@/components/SubscriptionModal";

const FUN_PROMPTS = [
  "My go-to karaoke song is...",
  "The best hidden gem in Lexington is...",
  "My dream road trip would be...",
  "If I could only eat one food forever...",
  "My unpopular opinion is...",
  "The best thing about Lexington is...",
  "My morning routine always includes...",
  "You'll never guess that I...",
  "My ideal weekend looks like...",
  "The last thing that made me laugh was...",
];

export default function Settings() {
  const { data: user } = useAuth();
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();
  const [bio, setBio] = useState((user as any)?.bio || "");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(() => {
    const raw = (user as any)?.interests;
    return raw ? raw.split(',').filter(Boolean) : [];
  });
  const [language, setLanguage] = useState((user as any)?.language || "en");
  const [travelTime, setTravelTime] = useState((user as any)?.travelTime || "");
  const [favoritePlaces, setFavoritePlaces] = useState((user as any)?.favoritePlaces || "");
  const [profileTabColor, setProfileTabColor] = useState(() => {
    try { return localStorage.getItem("sh-profile-tab-color") || "text-orange-500"; } catch { return "text-orange-500"; }
  });
  const [preferredUsername, setPreferredUsername] = useState(user?.username || "");
  const [legalName, setLegalName] = useState((user as any)?.legalName || "");
  const [profilePhoto, setProfilePhoto] = useState<string | null>((user as any)?.profilePhoto || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [funPrompts, setFunPrompts] = useState<{ prompt: string; answer: string }[]>(() => {
    try {
      const stored = localStorage.getItem("sh-fun-prompts");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showPromptPicker, setShowPromptPicker] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState<"public" | "semi_private" | "private">(() => {
    return ((user as any)?.profileVisibility as any) || "public";
  });

  const { data: friendCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/friends/count"],
    enabled: !!user,
  });

  async function changeProfileVisibility(val: "public" | "semi_private" | "private") {
    setProfileVisibility(val);
    try {
      await apiRequest("PATCH", "/api/user/profile", { profileVisibility: val });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      const labels = { public: "Public", semi_private: "Semi-Private", private: "Private" };
      const icons = { public: "🌐", semi_private: "👤", private: "🔒" };
      showFlash(icons[val], `Profile set to ${labels[val]}`, "info");
    } catch {
      showFlash("❌", "Failed to update visibility", "error");
    }
  }

  function applyProfileTabColor(color: string) {
    setProfileTabColor(color);
    try { localStorage.setItem("sh-profile-tab-color", color); } catch {}
    window.dispatchEvent(new CustomEvent("sh-profile-color-change", { detail: color }));
  }
  const [subscriptionPlan, setSubscriptionPlan] = useState<"flex_hop" | "power_hop" | null>(null);

  useEffect(() => {
    if (user) {
      setBio((user as any)?.bio || "");
      setLanguage((user as any)?.language || "en");
      setTravelTime((user as any)?.travelTime || "");
      setFavoritePlaces((user as any)?.favoritePlaces || "");
      setPreferredUsername(user.username || "");
      setLegalName((user as any)?.legalName || "");
      setProfilePhoto((user as any)?.profilePhoto || null);
      setProfileVisibility(((user as any)?.profileVisibility as any) || "public");
      const raw = (user as any)?.interests;
      setSelectedInterests(raw ? raw.split(',').filter(Boolean) : []);
    }
  }, [user]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/user/profile", {
        legalName: legalName.trim() || null,
        bio: bio.trim() || null,
        interests: selectedInterests.join(',') || null,
        language,
        travelTime: travelTime || null,
        favoritePlaces: favoritePlaces.trim() || null,
        profilePhoto: profilePhoto || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      localStorage.setItem("sh-fun-prompts", JSON.stringify(funPrompts));
      showFlash("✅", "Profile saved!", "success");
    },
    onError: () => showFlash("❌", "Failed to save", "error"),
  });

  const switchTier = useMutation({
    mutationFn: async (subscription: string | null) => {
      await apiRequest("PATCH", "/api/admin/my-tier", { subscription });
    },
    onSuccess: (_data, subscription) => {
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      const label = subscription === "power_hop" ? "PowerHop" : subscription === "flex_hop" ? "FlexHop" : "Standard";
      showFlash("✅", `Switched to ${label}`, "success");
    },
    onError: () => showFlash("❌", "Failed to switch tier", "error"),
  });

  const copyReferralCode = async () => {
    if (!user?.referralCode) return;
    try {
      await navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      showFlash("📋", "Copied!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showFlash("❌", "Copy failed", "error");
    }
  };

  const shareReferralCode = async () => {
    if (!user?.referralCode) return;
    const shareData = {
      title: "Join ShortHop!",
      text: `Use my referral code "${user.referralCode}" to join ShortHop and we both earn bonus credits!`,
      url: window.location.origin + "/auth?tab=register",
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      copyReferralCode();
    }
  };

  const cancelSubscription = useMutation({
    mutationFn: async () => {
      await apiRequest(api.subscription.cancel.method, api.subscription.cancel.path);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      showFlash("✅", "Subscription cancelled", "info");
    },
    onError: () => {
      showFlash("❌", "Failed to cancel", "error");
    },
  });

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showFlash("❌", "Photo must be under 2MB", "error");
      return;
    }
    const canvas = document.createElement("canvas");
    const img = new Image();
    img.onload = () => {
      const maxSize = 400;
      let w = img.width, h = img.height;
      if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
      else { w = Math.round(w * maxSize / h); h = maxSize; }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        setProfilePhoto(dataUrl);
        showFlash("📸", "Photo updated! Tap Save to keep it.", "success");
      }
    };
    const reader = new FileReader();
    reader.onload = (ev) => { img.src = ev.target?.result as string; };
    reader.readAsDataURL(file);
  }

  function addFunPrompt(prompt: string) {
    if (funPrompts.length >= 3) {
      showFlash("ℹ️", "Maximum 3 prompts", "info");
      return;
    }
    setFunPrompts(prev => [...prev, { prompt, answer: "" }]);
    setShowPromptPicker(false);
  }

  function removeFunPrompt(index: number) {
    setFunPrompts(prev => prev.filter((_, i) => i !== index));
  }

  function updateFunPromptAnswer(index: number, answer: string) {
    setFunPrompts(prev => prev.map((p, i) => i === index ? { ...p, answer } : p));
  }

  const usedPrompts = funPrompts.map(p => p.prompt);
  const availablePrompts = FUN_PROMPTS.filter(p => !usedPrompts.includes(p));

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto">
      <h1 data-testid="text-settings-title" className="text-xl font-display font-bold mb-1">Profile</h1>
      <p className="text-xs text-muted-foreground mb-4">Your identity and preferences.</p>

      <div className="space-y-6">
        {user && (user as any)?.isRoutePioneer && (
          <Card className="border-yellow-400/80 bg-gradient-to-br from-yellow-400/20 to-amber-300/20 dark:from-yellow-500/15 dark:to-amber-500/10" data-testid="card-route-pioneer">
            <CardContent className="py-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-400/50">
                <span className="text-2xl">👑</span>
              </div>
              <div>
                <p className="text-sm font-extrabold text-yellow-600 dark:text-yellow-300">Route Pioneer</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 font-semibold">Early Rider #{(user as any)?.signupNumber || '?'}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">One of the first 5 riders to join ShortHop</p>
              </div>
            </CardContent>
          </Card>
        )}

        {user && (user.subscription === "flex_hop" || user.subscription === "power_hop") && (
          <Card className="border-violet-300/40 bg-gradient-to-br from-violet-50/50 to-fuchsia-50/40 dark:from-violet-950/20 dark:to-fuchsia-950/10" data-testid="card-profile-color">
            <CardContent className="py-4 px-4">
              <div className="flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4 text-violet-500" />
                <p className="text-xs font-black text-foreground">Profile Tab Color</p>
                <Badge className="text-[9px] h-4 ml-auto bg-violet-500/10 text-violet-600 border-violet-400/30">
                  {user.subscription === "power_hop" ? "PowerHop" : "FlexHop"} Perk
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mb-3">Customize the color of your Profile tab in the navigation bar.</p>
              <div className="flex flex-wrap gap-2">
                {PROFILE_TAB_COLORS.map((color) => {
                  const isSelected = profileTabColor === color.value;
                  const bgMap: Record<string, string> = {
                    "text-orange-500": "bg-orange-500",
                    "text-violet-500": "bg-violet-500",
                    "text-cyan-500": "bg-cyan-500",
                    "text-rose-500": "bg-rose-500",
                    "text-lime-500": "bg-lime-500",
                    "text-amber-400": "bg-amber-400",
                    "text-sky-500": "bg-sky-500",
                    "text-fuchsia-500": "bg-fuchsia-500",
                  };
                  return (
                    <button
                      key={color.value}
                      onClick={() => applyProfileTabColor(color.value)}
                      className={`w-8 h-8 rounded-full ${bgMap[color.value] || "bg-gray-500"} transition-all ${
                        isSelected ? "ring-2 ring-offset-2 ring-foreground scale-110" : "opacity-70 hover:opacity-100"
                      }`}
                      title={color.label}
                      data-testid={`button-profile-color-${color.label.toLowerCase()}`}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {user && (user as any)?.signupNumber && !(user as any)?.isRoutePioneer && (
          <Card className="border-border/50" data-testid="card-signup-number">
            <CardContent className="py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-bold text-muted-foreground">#{(user as any)?.signupNumber}</span>
              </div>
              <div>
                <p className="text-xs font-bold">ShortHop Member #{(user as any)?.signupNumber}</p>
                <p className="text-[10px] text-muted-foreground">Thank you for being an early adopter</p>
              </div>
            </CardContent>
          </Card>
        )}

        {user && (
          <Card
            className="border-2"
            style={{
              borderColor: profileTabColor.includes("violet") ? "#8b5cf680"
                : profileTabColor.includes("cyan") ? "#06b6d480"
                : profileTabColor.includes("rose") ? "#f43f5e80"
                : profileTabColor.includes("lime") ? "#84cc1680"
                : profileTabColor.includes("amber") ? "#fbbf2480"
                : profileTabColor.includes("sky") ? "#0ea5e980"
                : profileTabColor.includes("fuchsia") ? "#d946ef80"
                : "#f9731680",
            }}
            data-testid="card-your-profile"
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-500" />
                  Your Profile
                </div>
                <div className="flex items-center gap-1" data-testid="profile-visibility-selector">
                  {([
                    { val: "public" as const, icon: <Globe className="w-3 h-3" />, label: "Public" },
                    { val: "semi_private" as const, icon: <EyeOff className="w-3 h-3" />, label: "Semi" },
                    { val: "private" as const, icon: <Lock className="w-3 h-3" />, label: "Private" },
                  ]).map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => changeProfileVisibility(opt.val)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold border transition-all ${
                        profileVisibility === opt.val
                          ? opt.val === "public" ? "bg-green-50 dark:bg-green-950/20 border-green-300/50 text-green-600"
                            : opt.val === "semi_private" ? "bg-blue-50 dark:bg-blue-950/20 border-blue-300/50 text-blue-600"
                            : "bg-muted border-border text-muted-foreground"
                          : "bg-transparent border-transparent text-muted-foreground/50 hover:text-muted-foreground"
                      }`}
                      data-testid={`button-visibility-${opt.val}`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                <div
                  className="relative w-24 h-24 rounded-full flex items-center justify-center cursor-pointer overflow-hidden transition-colors"
                  style={{
                    border: `4px solid`,
                    borderColor: profileTabColor.replace("text-", "").replace("-500", "").replace("-400", "") === "orange" ? "#f97316"
                      : profileTabColor.includes("violet") ? "#8b5cf6"
                      : profileTabColor.includes("cyan") ? "#06b6d4"
                      : profileTabColor.includes("rose") ? "#f43f5e"
                      : profileTabColor.includes("lime") ? "#84cc16"
                      : profileTabColor.includes("amber") ? "#fbbf24"
                      : profileTabColor.includes("sky") ? "#0ea5e9"
                      : profileTabColor.includes("fuchsia") ? "#d946ef"
                      : "#f97316",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-profile-photo"
                >
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 bg-muted w-full h-full flex items-center justify-center">
                      <Camera className="w-6 h-6 text-muted-foreground" />
                      <span className="text-[8px] text-muted-foreground font-bold">Add Photo</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Camera className="w-3 h-3 text-white" />
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  data-testid="input-profile-photo"
                />
              </div>

              {friendCountData && (
                <div className="flex items-center justify-center gap-4 text-center" data-testid="friends-count-display">
                  <div>
                    <p className="text-lg font-bold" data-testid="text-friend-count">{friendCountData.count}</p>
                    <p className="text-[10px] text-muted-foreground">Friends</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{(user as any)?.totalHops || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Hops</p>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs font-bold mb-1.5 block">Preferred Username</Label>
                <Input
                  placeholder="How you want to be known..."
                  value={preferredUsername}
                  onChange={(e) => setPreferredUsername(e.target.value)}
                  className="text-sm"
                  data-testid="input-preferred-username"
                />
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block">Legal Name</Label>
                <Input
                  placeholder="Your legal name (private, for verification)"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="text-sm"
                  data-testid="input-legal-name"
                />
                <p className="text-[9px] text-muted-foreground mt-0.5">Only visible to ShortHop for verification purposes</p>
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-green-500" />
                  Language
                </Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="text-sm" data-testid="select-language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español (Spanish)</SelectItem>
                    <SelectItem value="fr">Français (French)</SelectItem>
                    <SelectItem value="zh">中文 (Chinese)</SelectItem>
                    <SelectItem value="ar">العربية (Arabic)</SelectItem>
                    <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                    <SelectItem value="pt">Português (Portuguese)</SelectItem>
                    <SelectItem value="ja">日本語 (Japanese)</SelectItem>
                    <SelectItem value="ko">한국어 (Korean)</SelectItem>
                    <SelectItem value="de">Deutsch (German)</SelectItem>
                    <SelectItem value="sw">Kiswahili (Swahili)</SelectItem>
                    <SelectItem value="tl">Tagalog (Filipino)</SelectItem>
                    <SelectItem value="vi">Tiếng Việt (Vietnamese)</SelectItem>
                    <SelectItem value="ru">Русский (Russian)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[9px] text-muted-foreground mt-0.5">Messages you receive will be auto-translated to your language</p>
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block">Bio</Label>
                <Textarea
                  placeholder="Tell people a little about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={200}
                  className="text-sm resize-none h-20"
                  data-testid="input-bio"
                />
                <p className="text-[9px] text-muted-foreground text-right mt-0.5">{bio.length}/200</p>
              </div>

              <div>
                <Label className="text-xs font-bold mb-1 block">Interests</Label>
                <p className="text-[10px] text-muted-foreground mb-2">Tap to select up to 12 — riders see what you have in common</p>
                <InterestBubbles
                  selected={selectedInterests}
                  onChange={setSelectedInterests}
                  maxSelections={12}
                />
                <p className="text-[9px] text-muted-foreground text-right mt-1">{selectedInterests.length}/12 selected</p>
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block">Travel Time</Label>
                <Select value={travelTime} onValueChange={setTravelTime}>
                  <SelectTrigger className="text-sm" data-testid="select-travel-time">
                    <SelectValue placeholder="When do you usually ride?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                    <SelectItem value="anytime">Anytime</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block">Favorite Places in the City</Label>
                <Input
                  placeholder="e.g. Rupp Arena, Summit, The Burl, Keeneland..."
                  value={favoritePlaces}
                  onChange={(e) => setFavoritePlaces(e.target.value)}
                  className="text-sm"
                  data-testid="input-favorite-places"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                    Fun Prompts
                  </Label>
                  <span className="text-[9px] text-muted-foreground">{funPrompts.length}/3</span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">Show a fun side of yourself — riders love personality!</p>

                {funPrompts.map((fp, index) => (
                  <div key={index} className="mb-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-orange-500">{fp.prompt}</p>
                      <button
                        onClick={() => removeFunPrompt(index)}
                        className="text-muted-foreground hover:text-destructive"
                        data-testid={`button-remove-prompt-${index}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Input
                      placeholder="Your answer..."
                      value={fp.answer}
                      onChange={(e) => updateFunPromptAnswer(index, e.target.value)}
                      className="text-sm h-9"
                      maxLength={100}
                      data-testid={`input-fun-prompt-${index}`}
                    />
                  </div>
                ))}

                {funPrompts.length < 3 && (
                  <button
                    onClick={() => setShowPromptPicker(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-orange-300/50 text-orange-500 text-xs font-bold hover:border-orange-400 hover:bg-orange-50/30 dark:hover:bg-orange-950/10 transition-all"
                    data-testid="button-add-prompt"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add a Fun Prompt
                  </button>
                )}

                {showPromptPicker && (
                  <div className="mt-2 p-3 rounded-xl bg-muted/50 border border-border/50 space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Pick a prompt</p>
                    {availablePrompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => addFunPrompt(prompt)}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:text-orange-600 transition-colors"
                        data-testid={`button-pick-prompt`}
                      >
                        {prompt}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowPromptPicker(false)}
                      className="w-full text-center text-[10px] text-muted-foreground mt-1 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => saveProfile.mutate()}
                disabled={saveProfile.isPending}
                data-testid="button-save-profile"
              >
                {saveProfile.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>
        )}

        {user && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Membership
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.isAdmin ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Admin: Switch between tiers freely</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: null, label: "Standard", icon: "🚶", desc: "Free tier" },
                      { key: "flex_hop", label: "FlexHop", icon: "🚀", desc: "$10/mo" },
                      { key: "power_hop", label: "PowerHop", icon: "⚡", desc: "$25/mo" },
                    ].map((tier) => {
                      const isActive = (user.subscription || null) === tier.key;
                      return (
                        <button
                          key={tier.label}
                          onClick={() => switchTier.mutate(tier.key)}
                          disabled={switchTier.isPending}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                            isActive
                              ? 'border-primary bg-primary/10'
                              : 'border-border/50 hover:border-primary/30'
                          }`}
                          data-testid={`button-admin-tier-${tier.label.toLowerCase()}`}
                        >
                          <span className="text-xl">{tier.icon}</span>
                          <span className="text-xs font-bold">{tier.label}</span>
                          <span className="text-[9px] text-muted-foreground">{tier.desc}</span>
                          {isActive && <Badge className="text-[8px] h-4 bg-primary/20 text-primary border-0">Active</Badge>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : user.subscription ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{user.subscription === "power_hop" ? "⚡" : "🚀"}</span>
                      <div>
                        <p className="font-bold text-foreground text-sm" data-testid="text-subscription-plan">
                          {user.subscription === "power_hop" ? "PowerHop" : "FlexHop"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.subscription === "power_hop" ? "$25/month" : "$10/month"}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Active</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="button-cancel-subscription"
                    onClick={() => cancelSubscription.mutate()}
                    disabled={cancelSubscription.isPending}
                    className="w-full text-destructive hover:text-destructive"
                  >
                    Cancel Subscription
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20">
                    <span className="text-xl">🚶</span>
                    <div>
                      <p className="text-sm font-bold text-foreground">Standard</p>
                      <p className="text-xs text-muted-foreground">Free plan — pay per ride</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSubscriptionPlan("flex_hop")}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border/50 hover:border-primary/40 transition-all"
                      data-testid="button-upgrade-flex"
                    >
                      <span className="text-lg">🚀</span>
                      <span className="text-xs font-bold">FlexHop</span>
                      <span className="text-[10px] text-muted-foreground">$10/mo</span>
                    </button>
                    <button
                      onClick={() => setSubscriptionPlan("power_hop")}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border/50 hover:border-orange-400/40 transition-all"
                      data-testid="button-upgrade-power"
                    >
                      <span className="text-lg">⚡</span>
                      <span className="text-xs font-bold">PowerHop</span>
                      <span className="text-[10px] text-muted-foreground">$25/mo</span>
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {user && user.referralCode && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-secondary" />
                Referral Program
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Share your referral code with friends. When they sign up, you both earn bonus credits!
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex-1 min-w-[200px] bg-muted rounded-xl px-4 py-3 font-mono text-lg text-foreground tracking-wider text-center" data-testid="text-referral-code">
                  {user.referralCode}
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyReferralCode}
                  data-testid="button-copy-referral"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={shareReferralCode}
                  data-testid="button-share-referral"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
              {user.referredBy && (
                <p className="text-xs text-muted-foreground">
                  You were referred by code: <span className="font-mono font-medium text-foreground">{user.referredBy}</span>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-green-200/50 dark:border-green-800/40 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/install")} data-testid="card-install-app">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md shadow-green-500/20">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-foreground">Install ShortHop</p>
                <p className="text-[10px] text-muted-foreground">Add to your home screen for the best experience</p>
              </div>
              <Badge className="text-[9px] bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-0">NEW</Badge>
            </div>
          </CardContent>
        </Card>

        {user?.isAdmin && (
          <Card className="border-red-200/50 dark:border-red-800/40 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/admin")} data-testid="card-admin-link">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-md shadow-red-500/20">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-extrabold text-foreground">Admin Dashboard</p>
                  <p className="text-[10px] text-muted-foreground">Manage users, reports, and settings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/40" data-testid="card-notifications-inbox">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-sm">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-bold text-foreground flex-1">Notifications</p>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] font-bold h-7 px-2.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation("/dashboard");
                  }}
                  data-testid="button-view-notifications"
                >
                  View All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] font-bold h-7 px-2.5 text-blue-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    showFlash("✅", "All marked as read", "success");
                  }}
                  data-testid="button-mark-all-read"
                >
                  Mark Read
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <ContactShortHop />
        <ReportIssue />
      </div>

      {subscriptionPlan && user && (
        <SubscriptionModal
          plan={subscriptionPlan}
          user={user}
          open={true}
          onOpenChange={(open) => !open && setSubscriptionPlan(null)}
        />
      )}
    </div>
  );
}

function ContactShortHop() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");

  const sendMsg = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/contact", { subject, message, category });
    },
    onSuccess: () => {
      setOpen(false);
      setSubject("");
      setMessage("");
      showFlash("✅", "Message sent!", "success");
    },
    onError: () => {
      showFlash("❌", "Failed to send", "error");
    },
  });

  return (
    <>
      <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setOpen(true)}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold">Contact ShortHop</p>
            <p className="text-xs text-muted-foreground">Questions, feedback, or support</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact ShortHop</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="text-sm" data-testid="select-contact-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Question</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="feedback">Feedback</SelectItem>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="safety">Safety Concern</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="text-sm"
              data-testid="input-contact-subject"
            />
            <Textarea
              placeholder="Your message..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              className="text-sm"
              data-testid="input-contact-message"
            />
            <Button
              className="w-full"
              onClick={() => sendMsg.mutate()}
              disabled={!subject.trim() || !message.trim() || sendMsg.isPending}
              data-testid="button-send-contact"
            >
              Send Message
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReportIssue() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("bug");
  const [description, setDescription] = useState("");

  const submitReport = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/report", { category, description });
    },
    onSuccess: () => {
      setOpen(false);
      setDescription("");
      showFlash("✅", "Report submitted", "success");
    },
    onError: () => {
      showFlash("❌", "Failed to submit", "error");
    },
  });

  return (
    <>
      <Card className="cursor-pointer hover:border-red-200 transition-colors" onClick={() => setOpen(true)}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-bold">Report an Issue</p>
            <p className="text-xs text-muted-foreground">Safety, bugs, or concerns</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an Issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="text-sm" data-testid="select-report-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unsafe_driver">Unsafe Driver</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="payment">Payment Issue</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Describe the issue..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="text-sm"
              data-testid="input-report-description"
            />
            <Button
              className="w-full bg-red-500 hover:bg-red-600"
              onClick={() => submitReport.mutate()}
              disabled={!description.trim() || submitReport.isPending}
              data-testid="button-submit-report"
            >
              Submit Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
