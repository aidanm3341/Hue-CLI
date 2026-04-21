import type { EffectFn } from "./types";

// 4-phase cycle: red-left, off, blue-right, off (100ms each)
const RED  = { r: 65535, g: 0,     b: 0 };
const BLUE = { r: 0,     g: 0,     b: 65535 };
const OFF  = { r: 0,     g: 0,     b: 0 };

export function makePolice(): EffectFn {
  const FPS = 50;
  const phaseFrames = Math.round(FPS * 0.1); // 100ms per phase

  return (tick, channels) => {
    const phase = Math.floor(tick / phaseFrames) % 4;
    return channels.map(({ channelId }, i) => {
      const isLeft = i % 2 === 0;
      let color: { r: number; g: number; b: number };
      if      (phase === 0) color = isLeft ? RED  : OFF;
      else if (phase === 1) color = isLeft ? OFF  : RED;
      else if (phase === 2) color = isLeft ? BLUE : OFF;
      else                  color = isLeft ? OFF  : BLUE;
      return { channelId, ...color };
    });
  };
}
