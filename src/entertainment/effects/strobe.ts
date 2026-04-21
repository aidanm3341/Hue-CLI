import type { EffectFn } from "./types";
import type { RGB16 } from "../colors";
import { hexTo16bit, WHITE, BLACK } from "../colors";

const FPS = 50;
const MAX_SAFE_HZ = 3;

export interface StrobeOpts {
  color?: string;   // hex, default white
  bg?: string;      // hex, default black
  rateHz: number;
  safe?: boolean;   // clamp to MAX_SAFE_HZ
}

export function makeStrobe(opts: StrobeOpts): EffectFn {
  const rate = opts.safe ? Math.min(opts.rateHz, MAX_SAFE_HZ) : opts.rateHz;
  const framesPerHalf = Math.max(1, Math.round(FPS / (2 * rate)));
  const onColor: RGB16 = opts.color ? hexTo16bit(opts.color) : WHITE;
  const offColor: RGB16 = opts.bg ? hexTo16bit(opts.bg) : BLACK;

  return (tick, channels) => {
    const phase = Math.floor(tick / framesPerHalf) % 2;
    const { r, g, b } = phase === 0 ? onColor : offColor;
    return channels.map(({ channelId }) => ({ channelId, r, g, b }));
  };
}
