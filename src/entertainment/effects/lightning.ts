import type { EffectFn } from "./types";
import { BLACK } from "../colors";

export type Intensity = "low" | "medium" | "high" | "storm";

// Probability of a new flash starting per frame across the whole rig
const FLASH_PROB: Record<Intensity, number> = {
  low:    0.005,
  medium: 0.015,
  high:   0.04,
  storm:  0.10,
};

interface FlashState {
  brightness: number;
  decay: number;
}

export function makeLightning(opts: { intensity: Intensity }): EffectFn {
  const prob = FLASH_PROB[opts.intensity];
  const activeFlashes = new Map<number, FlashState>();

  return (_tick, channels) => {
    return channels.map(({ channelId }) => {
      // Maybe start a new flash on this channel (only if not already flashing)
      if (!activeFlashes.has(channelId) && Math.random() < prob) {
        activeFlashes.set(channelId, {
          brightness: 65535,
          decay: 0.65 + Math.random() * 0.25,
        });
      }

      const flash = activeFlashes.get(channelId);
      if (!flash) return { channelId, ...BLACK };

      const bri = flash.brightness;
      flash.brightness = Math.floor(bri * flash.decay);
      if (flash.brightness < 400) activeFlashes.delete(channelId);

      // White-blue lightning tint
      return {
        channelId,
        r: Math.min(65535, Math.round(bri * 0.85)),
        g: Math.min(65535, Math.round(bri * 0.90)),
        b: Math.min(65535, bri),
      };
    });
  };
}
