import type { EffectFn } from "./types";
import { hexTo16bit, WHITE } from "../colors";

export type BreathePhase = "sync" | "offset";

export interface BreatheOpts {
  color?: string;    // hex, default white
  rateSec?: number;  // cycle duration in seconds, default 4
  phase?: BreathePhase;
}

export function makeBreathe(opts: BreatheOpts = {}): EffectFn {
  const FPS = 50;
  const framesPerCycle = Math.round(FPS * (opts.rateSec ?? 4));
  const { r: R, g: G, b: B } = opts.color ? hexTo16bit(opts.color) : WHITE;

  return (tick, channels) => {
    return channels.map(({ channelId }, i) => {
      const phaseOffset = opts.phase === "offset"
        ? (2 * Math.PI * i) / channels.length
        : 0;
      const t = (tick % framesPerCycle) / framesPerCycle;
      // Smooth sine: 0 → 1 → 0 per cycle
      const brightness = (1 - Math.cos(2 * Math.PI * t + phaseOffset)) / 2;
      return {
        channelId,
        r: Math.round(R * brightness),
        g: Math.round(G * brightness),
        b: Math.round(B * brightness),
      };
    });
  };
}
