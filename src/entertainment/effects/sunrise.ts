import type { EffectFn } from "./types";
import { hexTo16bit, lerp16bit } from "../colors";

export type SunriseDirection = "rise" | "set";

export interface SunriseOpts {
  durationMs: number;
  direction: SunriseDirection;
}

const WARM  = hexTo16bit("#FF3C00"); // deep sunrise orange
const LIGHT = hexTo16bit("#FFF0CC"); // soft warm daylight

export function makeSunrise(opts: SunriseOpts): EffectFn {
  const FPS = 50;
  const totalFrames = Math.round(opts.durationMs / (1000 / FPS));

  return (tick, channels) => {
    const t = Math.min(tick / totalFrames, 1);
    const progress = opts.direction === "rise" ? t : 1 - t;
    const { r, g, b } = lerp16bit(WARM, LIGHT, progress);
    return channels.map(({ channelId }) => ({ channelId, r, g, b }));
  };
}
