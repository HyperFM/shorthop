import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Camera, FileText, Shield, Bell, CheckCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { showFlash } from "@/components/FlashNotification";
import { useAuth } from "@/hooks/use-auth";

const STEPS = [
  { icon: Car, title: "Vehicle Info", desc: "Tell us about your ride" },
  { icon: Camera, title: "License Photo", desc: "Upload your driver's license" },
  { icon: Camera, title: "Selfie", desc: "Quick identity photo" },
  { icon: Shield, title: "Terms", desc: "Accept driver agreement" },
  { icon: Bell, title: "Notifications", desc: "Stay connected" },
  { icon: CheckCircle, title: "Done", desc: "Application submitted" },
];

export default function DriverOnboarding() {
  const { data: user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const saveProfile = useMutation({
    mutationFn: async () => {
      let driverLicenseUrl = null;
      let selfieUrl = null;
      if (licenseFile) driverLicenseUrl = `license_${user?.id}_${Date.now()}`;
      if (selfieFile) selfieUrl = `selfie_${user?.id}_${Date.now()}`;

      await apiRequest("POST", "/api/driver/profile", {
        vehicleMake, vehicleModel, vehicleColor, licensePlate,
        driverLicenseUrl, selfieUrl, agreedToTerms,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    },
  });

  const submitApp = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/driver/apply");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      showFlash("🎉", "Application submitted!", "success");
    },
    onError: () => {
      showFlash("❌", "Failed to submit", "error");
    },
  });

  const handleNext = async () => {
    if (step === 0) {
      if (!vehicleMake || !vehicleModel || !vehicleColor || !licensePlate) {
        showFlash("⚠️", "Fill all fields", "error");
        return;
      }
    }
    if (step === 3 && !agreedToTerms) {
      showFlash("⚠️", "Accept the terms", "error");
      return;
    }
    if (step === 3) {
      await saveProfile.mutateAsync();
    }
    if (step === 4) {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
      await submitApp.mutateAsync();
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="px-4 pt-4 pb-20 max-w-lg mx-auto">
      <div className="mb-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">ShortHop</p>
        <h1 className="text-lg font-display font-bold" data-testid="text-onboarding-title">Become a Driver</h1>
      </div>

      <div className="w-full h-1.5 bg-muted rounded-full mb-4 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex gap-1 mb-6">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-colors ${
              i <= step ? "bg-green-500" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {step === 0 && (
            <Card className="border-border/50" data-testid="step-vehicle">
              <CardContent className="p-4 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white mb-2">
                  <Car className="w-6 h-6" />
                </div>
                <h2 className="text-base font-display font-bold">Vehicle Information</h2>
                <p className="text-xs text-muted-foreground">We need your vehicle details so riders can find you.</p>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Make</Label>
                    <Input placeholder="Toyota, Honda, Ford..." value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} data-testid="input-vehicle-make" />
                  </div>
                  <div>
                    <Label className="text-xs">Model</Label>
                    <Input placeholder="Camry, Civic, F-150..." value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} data-testid="input-vehicle-model" />
                  </div>
                  <div>
                    <Label className="text-xs">Color</Label>
                    <Input placeholder="White, Black, Silver..." value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} data-testid="input-vehicle-color" />
                  </div>
                  <div>
                    <Label className="text-xs">License Plate</Label>
                    <Input placeholder="ABC-1234" value={licensePlate} onChange={e => setLicensePlate(e.target.value.toUpperCase())} data-testid="input-license-plate" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card className="border-border/50" data-testid="step-license">
              <CardContent className="p-4 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white mb-2">
                  <FileText className="w-6 h-6" />
                </div>
                <h2 className="text-base font-display font-bold">Driver's License</h2>
                <p className="text-xs text-muted-foreground">Upload a photo of your valid driver's license for verification.</p>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                  <Camera className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={e => setLicenseFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="license-upload"
                    data-testid="input-license-upload"
                  />
                  <label htmlFor="license-upload" className="cursor-pointer">
                    <p className="text-sm font-medium text-primary">Tap to upload or take photo</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG accepted</p>
                  </label>
                  {licenseFile && (
                    <p className="text-xs text-green-600 mt-2 font-medium">✓ {licenseFile.name}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="border-border/50" data-testid="step-selfie">
              <CardContent className="p-4 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white mb-2">
                  <Camera className="w-6 h-6" />
                </div>
                <h2 className="text-base font-display font-bold">Identity Selfie</h2>
                <p className="text-xs text-muted-foreground">Take a quick selfie so we can confirm your identity matches your license.</p>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                  <Camera className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={e => setSelfieFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="selfie-upload"
                    data-testid="input-selfie-upload"
                  />
                  <label htmlFor="selfie-upload" className="cursor-pointer">
                    <p className="text-sm font-medium text-primary">Tap to take selfie</p>
                    <p className="text-xs text-muted-foreground mt-1">Front camera recommended</p>
                  </label>
                  {selfieFile && (
                    <p className="text-xs text-green-600 mt-2 font-medium">✓ {selfieFile.name}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="border-border/50" data-testid="step-terms">
              <CardContent className="p-4 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white mb-2">
                  <Shield className="w-6 h-6" />
                </div>
                <h2 className="text-base font-display font-bold">Driver Agreement</h2>
                <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-2 max-h-48 overflow-y-auto">
                  <p className="font-bold">By becoming a ShortHop driver, you agree:</p>
                  <ul className="space-y-1 list-disc pl-4">
                    <li>You are an independent driver, not an employee of ShortHop</li>
                    <li>You will follow all local traffic and driving laws</li>
                    <li>You will maintain valid auto insurance at all times</li>
                    <li>You will keep your vehicle in safe operating condition</li>
                    <li>You will treat all riders with respect and courtesy</li>
                    <li>You will not drive under the influence of drugs or alcohol</li>
                    <li>ShortHop may suspend your account for safety violations</li>
                  </ul>
                </div>
                <label className="flex items-center gap-2 cursor-pointer" data-testid="checkbox-agree-terms">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={e => setAgreedToTerms(e.target.checked)}
                    className="w-4 h-4 rounded border-border accent-green-500"
                  />
                  <span className="text-sm font-medium">I agree to the Driver Agreement</span>
                </label>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card className="border-border/50" data-testid="step-notifications">
              <CardContent className="p-4 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white mb-2">
                  <Bell className="w-6 h-6" />
                </div>
                <h2 className="text-base font-display font-bold">Enable Notifications</h2>
                <p className="text-xs text-muted-foreground">
                  Notifications let you know when a hopper needs a ride nearby.
                  This is critical for accepting hop requests while driving.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-800 font-medium">
                    Tap "Next" to enable notifications and submit your application.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 5 && (
            <Card className="border-green-200 bg-green-50/50" data-testid="step-complete">
              <CardContent className="p-6 text-center space-y-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white mx-auto"
                >
                  <CheckCircle className="w-8 h-8" />
                </motion.div>
                <h2 className="text-lg font-display font-bold text-green-700">Application Submitted!</h2>
                <p className="text-sm text-muted-foreground">
                  Your driver application is under review. We'll notify you once you're approved to start accepting hop requests.
                </p>
                <Button
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 mt-4"
                  onClick={() => setLocation("/dashboard")}
                  data-testid="button-go-dashboard"
                >
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {step < 5 && (
        <div className="flex gap-2 mt-4">
          {step > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)} data-testid="button-back">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          <Button
            className="flex-1 bg-gradient-to-r from-green-500 to-green-600"
            onClick={handleNext}
            disabled={saveProfile.isPending || submitApp.isPending}
            data-testid="button-next"
          >
            {step === 4 ? "Submit Application" : "Next"} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
