import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ArrowLeftRight, Car, MapPin, X } from "lucide-react";

export interface PickupCorridor {
  name: string;
  lat: number;
  lng: number;
  trafficFlow?: string;
  corridorType?: string;
}

const CORRIDOR_REF: PickupCorridor[] = [
  { name: "Nicholasville Rd",            lat: 38.0496, lng: -84.5044, corridorType: "4-lane highway",      trafficFlow: "north toward downtown, south toward Jessamine Co" },
  { name: "Richmond Rd (US-25)",         lat: 38.0450, lng: -84.4880, corridorType: "busy highway",        trafficFlow: "northwest toward downtown, southeast toward Richmond" },
  { name: "New Circle Rd (KY-4)",        lat: 38.0650, lng: -84.5100, corridorType: "highway loop",        trafficFlow: "loop" },
  { name: "Man o' War Blvd (KY-922)",    lat: 37.9870, lng: -84.5050, corridorType: "6-lane boulevard",    trafficFlow: "east toward I-75, west toward Versailles Rd" },
  { name: "Tates Creek Rd",              lat: 38.0280, lng: -84.4930, corridorType: "4-lane road",         trafficFlow: "north toward campus, south toward Man o War" },
  { name: "Versailles Rd (US-60)",       lat: 38.0510, lng: -84.5200, corridorType: "4-lane highway",      trafficFlow: "east toward downtown, west toward Versailles" },
  { name: "Harrodsburg Rd (US-68)",      lat: 38.0350, lng: -84.5150, corridorType: "4-lane road",         trafficFlow: "northeast toward downtown, southwest toward Harrodsburg" },
  { name: "Winchester Rd (US-60)",       lat: 38.0550, lng: -84.4700, corridorType: "4-lane highway",      trafficFlow: "west toward downtown, east toward Winchester" },
  { name: "Leestown Rd (US-421)",        lat: 38.0580, lng: -84.5120, corridorType: "4-lane road",         trafficFlow: "south toward downtown, north toward Georgetown" },
  { name: "Broadway (US-68)",            lat: 38.0496, lng: -84.5100, corridorType: "2-lane urban road",   trafficFlow: "east toward downtown, west toward Leestown" },
  { name: "Main St",                     lat: 38.0500, lng: -84.5000, corridorType: "one-way downtown",    trafficFlow: "westbound through downtown" },
  { name: "Limestone (US-27)",           lat: 38.0420, lng: -84.5040, corridorType: "4-lane road",         trafficFlow: "north toward campus, south toward downtown" },
];

export function findCorridorByName(name: string): PickupCorridor | null {
  if (!name) return null;
  const lc = name.toLowerCase();
  return CORRIDOR_REF.find(c => lc.includes(c.name.toLowerCase().split(" ")[0])) || null;
}

function isOneWayRoad(corridor: PickupCorridor): boolean {
  return /one.?way/i.test(corridor.corridorType || "") || /one.?way/i.test(corridor.trafficFlow || "");
}

function isLoop(corridor: PickupCorridor): boolean {
  return /loop/i.test(corridor.corridorType || "") || /loop/i.test(corridor.trafficFlow || "");
}

type Orientation = "NS" | "EW" | "DIAG" | "LOOP";

function getOrientation(corridor: PickupCorridor): Orientation {
  if (isLoop(corridor)) return "LOOP";
  const flow = (corridor.trafficFlow || "").toLowerCase();
  const hasNS = /north|south/.test(flow);
  const hasEW = /east|west/.test(flow);
  if (hasNS && hasEW) return "DIAG";
  if (hasNS) return "NS";
  if (hasEW) return "EW";
  return "NS";
}

function isHeadingTowardDowntown(endLocation: string): boolean {
  const DOWNTOWN = ["downtown", "main st", "vine", "short st", "center", "university", "uk ", "campus", "lexington ave", "limestone", "broadway"];
  const AWAY    = ["jessamine", "richmond city", "winchester city", "nicholasville city", "man o war", "hamburg", "georgetown city", "harrodsburg city"];
  const e = endLocation.toLowerCase();
  if (DOWNTOWN.some(k => e.includes(k))) return true;
  if (AWAY.some(k => e.includes(k))) return false;
  return true;
}

function calcHopperSide(
  hopperLat: number,
  hopperLng: number,
  corridor: PickupCorridor,
  towardDowntown: boolean
): "correct" | "wrong" | "unknown" {
  const orient = getOrientation(corridor);
  if (orient === "LOOP") return "correct";
  if (orient === "NS") {
    const east = hopperLng >= corridor.lng;
    return (towardDowntown ? east : !east) ? "correct" : "wrong";
  }
  if (orient === "EW") {
    const south = hopperLat <= corridor.lat;
    return (towardDowntown ? south : !south) ? "correct" : "wrong";
  }
  if (orient === "DIAG") {
    const east = hopperLng >= corridor.lng;
    return (towardDowntown ? east : !east) ? "correct" : "wrong";
  }
  return "unknown";
}

function sideLabel(hopperLat: number, hopperLng: number, corridor: PickupCorridor): string {
  const orient = getOrientation(corridor);
  if (orient === "LOOP") return "loop road";
  if (orient === "NS" || orient === "DIAG") return hopperLng >= corridor.lng ? "east side" : "west side";
  if (orient === "EW") return hopperLat >= corridor.lat ? "north side" : "south side";
  return "roadside";
}

export interface RoadSideInfo {
  hopperSide: "correct" | "wrong" | "oneWay" | "unknown";
  hopperSideLabel: string;
  needsToCross: boolean;
  isOneWay: boolean;
  corridorName: string;
  hopperMessage: string;
  driverMessage: string;
  driverSideLabel: string;
}

export function buildRoadSideInfo(
  corridor: PickupCorridor | null,
  hopperLat: number | null,
  hopperLng: number | null,
  startLocation: string,
  endLocation: string
): RoadSideInfo | null {
  if (!corridor) return null;
  const name = corridor.name;
  const oneWay = isOneWayRoad(corridor);

  if (oneWay) {
    return {
      hopperSide: "oneWay",
      hopperSideLabel: "one-way road",
      needsToCross: false,
      isOneWay: true,
      corridorName: name,
      hopperMessage: `${name} is a one-way road — traffic only flows one direction. Stand clearly at the edge of the road and wave your driver down when you see their vehicle.`,
      driverMessage: `${name} is one-way — Hopper is positioned roadside. Drive slowly and watch for them waving.`,
      driverSideLabel: "one-way",
    };
  }

  const towardDowntown = isHeadingTowardDowntown(endLocation);

  if (hopperLat === null || hopperLng === null) {
    const dirLabel = towardDowntown ? "inbound (toward downtown)" : "outbound";
    return {
      hopperSide: "unknown",
      hopperSideLabel: dirLabel,
      needsToCross: false,
      isOneWay: false,
      corridorName: name,
      hopperMessage: `You need to be on the ${dirLabel} side of ${name} — the side where traffic is heading ${towardDowntown ? "toward downtown" : "away from downtown"}. Make sure you're facing traffic so your driver can see you.`,
      driverMessage: `Hopper should be on the ${dirLabel} side of ${name}. Look for them on your side of the road as you approach.`,
      driverSideLabel: dirLabel,
    };
  }

  const side = calcHopperSide(hopperLat, hopperLng, corridor, towardDowntown);
  const sl   = sideLabel(hopperLat, hopperLng, corridor);
  const needsToCross = side === "wrong";

  const hopperMsg = needsToCross
    ? `You're currently on the opposite side of ${name} from where traffic is heading your direction. You'll need to cross to the other side before your driver arrives — allow at least 5 minutes so there's plenty of time. Only cross when it's fully safe.`
    : `You're on the correct side of ${name} — great! Stay visible at the edge of the road and wave when you see your driver's vehicle.`;

  const driverMsg = needsToCross
    ? `The hopper is on the opposite side of ${name} and has been asked to cross. Keep driving your normal route — no need to stop or change lanes. You can briefly pull over if they haven't crossed when you arrive. No penalties apply.`
    : `Hopper is on your side of ${name} (${sl}). Slow down as you approach and watch for them at the roadside.`;

  return {
    hopperSide: side,
    hopperSideLabel: sl,
    needsToCross,
    isOneWay: false,
    corridorName: name,
    hopperMessage: hopperMsg,
    driverMessage: driverMsg,
    driverSideLabel: sl,
  };
}

interface HopperRoadSideAlertProps {
  info: RoadSideInfo;
  onDismiss?: () => void;
}

export function HopperRoadSideAlert({ info, onDismiss }: HopperRoadSideAlertProps) {
  const [visible, setVisible] = useState(true);

  function dismiss() {
    setVisible(false);
    onDismiss?.();
  }

  const { needsToCross, isOneWay, hopperSide } = info;
  const isCorrect = !needsToCross && !isOneWay && hopperSide !== "unknown";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          className={`rounded-2xl border p-4 mb-3 relative ${
            needsToCross
              ? "bg-orange-50 dark:bg-orange-950/30 border-orange-300/60 dark:border-orange-700/40"
              : isOneWay
              ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300/60 dark:border-blue-700/40"
              : isCorrect
              ? "bg-green-50 dark:bg-green-950/30 border-green-300/60 dark:border-green-700/40"
              : "bg-muted/40 border-border/50"
          }`}
          data-testid="card-road-side-hopper"
        >
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
            data-testid="button-dismiss-road-side"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-start gap-3 pr-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              needsToCross ? "bg-orange-500/15" : isOneWay ? "bg-blue-500/15" : "bg-green-500/15"
            }`}>
              {needsToCross
                ? <ArrowLeftRight className="w-4 h-4 text-orange-500" />
                : isOneWay
                ? <Car className="w-4 h-4 text-blue-500" />
                : <CheckCircle2 className="w-4 h-4 text-green-600" />
              }
            </div>

            <div className="flex-1 min-w-0">
              <p className={`text-xs font-black mb-1 leading-tight ${
                needsToCross ? "text-orange-700 dark:text-orange-300"
                : isOneWay ? "text-blue-700 dark:text-blue-300"
                : isCorrect ? "text-green-700 dark:text-green-300"
                : "text-foreground"
              }`}>
                {needsToCross
                  ? "⚠️ Cross Before Your Driver Arrives"
                  : isOneWay
                  ? "🚦 One-Way Road — Stay Visible"
                  : isCorrect
                  ? "✅ You're on the Right Side"
                  : "📍 Get to the Right Side"}
              </p>

              <p className="text-[11px] text-foreground/80 leading-relaxed">{info.hopperMessage}</p>

              {needsToCross && (
                <div className="mt-2.5 p-2 rounded-xl bg-orange-100/60 dark:bg-orange-900/20 border border-orange-200/50 dark:border-orange-700/30">
                  <p className="text-[10px] font-bold text-orange-700 dark:text-orange-400">
                    🦺 Safety first — only cross when the road is fully clear.
                  </p>
                </div>
              )}

              <div className="mt-2 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-[10px] text-muted-foreground font-medium truncate">
                  {info.corridorName} · {info.hopperSideLabel}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface DriverRoadSideNoticeProps {
  info: RoadSideInfo;
  minutesAway?: number;
  onDismiss?: () => void;
}

export function DriverRoadSideNotice({ info, minutesAway = 5, onDismiss }: DriverRoadSideNoticeProps) {
  const [visible, setVisible] = useState(true);

  function dismiss() {
    setVisible(false);
    onDismiss?.();
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
          className={`rounded-xl border p-3.5 mb-3 relative ${
            info.needsToCross
              ? "bg-amber-50 dark:bg-amber-950/25 border-amber-300/60 dark:border-amber-700/40"
              : "bg-green-50 dark:bg-green-950/20 border-green-300/40 dark:border-green-700/30"
          }`}
          data-testid="card-road-side-driver"
        >
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-start gap-3 pr-5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              info.needsToCross ? "bg-amber-400/20" : "bg-green-500/15"
            }`}>
              <Car className={`w-4 h-4 ${info.needsToCross ? "text-amber-600" : "text-green-600"}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <p className="text-xs font-black text-foreground">
                  {info.needsToCross ? "🔄 Hopper Crossing the Road" : "📍 Hopper Position"}
                </p>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  ~{minutesAway} min away
                </span>
              </div>
              <p className="text-[11px] text-foreground/80 leading-relaxed">{info.driverMessage}</p>
              {info.needsToCross && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1.5">
                  No penalties — hopper is responsible for crossing safely. Continue your commute.
                </p>
              )}
              {!info.needsToCross && !info.isOneWay && (
                <div className="mt-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{info.corridorName} · {info.driverSideLabel}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
