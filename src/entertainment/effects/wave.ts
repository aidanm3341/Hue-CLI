import type { EffectFn } from "./types";
import { hexTo16bit, WHITE } from "../colors";

export type WaveAxis = "x" | "z";

export interface WaveOpts {
  color?: string;
  periodSec?: number; // wave period in seconds, default 2
  axis?: WaveAxis;
}

export function makeWave(opts: WaveOpts = {}): EffectFn {
  const FPS = 50;
  const framesPerCycle = Math.round(FPS * (opts.periodSec ?? 2));
  const { r: R, g: G, b: B } = opts.color ? hexTo16bit(opts.color) : WHITE;
  const axis = opts.axis ?? "x";

  return (tick, channels) => {
    const phase = (tick % framesPerCycle) / framesPerCycle * 2 * Math.PI;
    return channels.map(({ channelId, position }) => {
      // pos in [-1, 1]; maps channel spatial position to wave phase offset
      const pos = axis === "x" ? position.x : position.z;
      const t = (Math.sin(phase + pos * Math.PI) + 1) / 2; // 0→1
      return {
        channelId,
        r: Math.round(R * t),
        g: Math.round(G * t),
        b: Math.round(B * t),
      };
    });
  };
}
