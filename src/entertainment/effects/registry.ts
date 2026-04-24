export interface EffectMeta {
  name: string;
  description: string;
  photosensitive?: boolean;
}

export const EFFECT_REGISTRY: EffectMeta[] = [
  { name: "lightning",       description: "Flickering storm flashes",              photosensitive: true },
  { name: "fire",            description: "Organic orange-red flicker" },
  { name: "candle",          description: "Warm amber flicker" },
  { name: "strobe",          description: "Rapid on/off flash",                    photosensitive: true },
  { name: "police",          description: "Alternating red/blue pairs",            photosensitive: true },
  { name: "rave",            description: "Rainbow colour cycle (REST fallback if no entertainment config)" },
  { name: "beatdrop",        description: "Pulse on each beat, hue shifts per bar" },
  { name: "wave",            description: "Brightness ripple across room (uses channel positions)" },
  { name: "spotlight",       description: "White spotlight crossfading between channels" },
  { name: "breathe",         description: "Slow sine-wave brightness pulse" },
  { name: "northernlights",  description: "Slow aurora drift through cyan/teal/purple" },
  { name: "sunrise",         description: "5-minute warm-to-daylight fade" },
  { name: "sunset",          description: "5-minute daylight-to-warm fade" },
  { name: "screen",          description: "Sync lights to screen colours in real-time (Ambilight-style)" },
];

export const EFFECT_NAMES = new Set(EFFECT_REGISTRY.map(e => e.name));
