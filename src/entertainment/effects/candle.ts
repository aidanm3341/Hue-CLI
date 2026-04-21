import type { EffectFn } from "./types";

// Warm candle amber in 16-bit
const R_BASE = 65535;
const G_BASE = 22000;
const B_BASE = 1200;

export function makeCandle(): EffectFn {
  const phases = new Map<number, number>();

  return (tick, channels) => {
    return channels.map(({ channelId }) => {
      if (!phases.has(channelId)) {
        phases.set(channelId, Math.random() * 800);
      }
      const p = phases.get(channelId)!;

      // Layered sine waves at incommensurable frequencies → organic flicker
      const noise =
        Math.sin((tick + p) * 0.051) * 0.18 +
        Math.sin((tick + p) * 0.137) * 0.09 +
        Math.sin((tick + p) * 0.373) * 0.04 +
        (Math.random() - 0.5) * 0.08;

      const bri = Math.max(0.25, Math.min(1.0, 0.65 + noise));

      return {
        channelId,
        r: Math.round(R_BASE * bri),
        g: Math.round(G_BASE * bri),
        b: Math.round(B_BASE * bri),
      };
    });
  };
}
