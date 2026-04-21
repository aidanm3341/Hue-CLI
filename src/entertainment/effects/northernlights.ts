import type { EffectFn } from "./types";

// Slow drift through aurora colours: cyan-green, cyan, blue-purple, purple, teal
const PALETTE = [
  { r: 0,     g: 65535, b: 28000 },  // cyan-green
  { r: 0,     g: 55000, b: 65535 },  // cyan
  { r: 10000, g: 5000,  b: 65535 },  // blue-indigo
  { r: 30000, g: 0,     b: 65535 },  // purple
  { r: 0,     g: 40000, b: 30000 },  // deep teal
] as const;

export function makeNorthernLights(): EffectFn {
  const phases = new Map<number, number>();

  return (tick, channels) => {
    return channels.map(({ channelId }, i) => {
      if (!phases.has(channelId)) {
        // Stagger channels so they drift independently
        phases.set(channelId, Math.random() * 500 + i * 150);
      }
      const p = phases.get(channelId)!;

      // Very slow palette cycle: ~30 seconds per full rotation
      const t = ((tick + p) * 0.00065) % PALETTE.length;
      const idx = Math.floor(t);
      const frac = t - idx;
      const c1 = PALETTE[idx % PALETTE.length]!;
      const c2 = PALETTE[(idx + 1) % PALETTE.length]!;

      // Slow breathing on top of colour drift
      const brightness = 0.35 + 0.45 * (Math.sin((tick + p) * 0.007) * 0.5 + 0.5);

      return {
        channelId,
        r: Math.round((c1.r + (c2.r - c1.r) * frac) * brightness),
        g: Math.round((c1.g + (c2.g - c1.g) * frac) * brightness),
        b: Math.round((c1.b + (c2.b - c1.b) * frac) * brightness),
      };
    });
  };
}
