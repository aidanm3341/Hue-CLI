import type { EffectFn } from "./types";

export interface SpotlightOpts {
  dwellMs?: number;      // how long spotlight stays on each channel, default 1000
  transitionMs?: number; // crossfade duration, default 300
}

export function makeSpotlight(opts: SpotlightOpts = {}): EffectFn {
  const FPS = 50;
  const dwellFrames = Math.round(FPS * ((opts.dwellMs ?? 1000) / 1000));
  const xFrames = Math.round(FPS * ((opts.transitionMs ?? 300) / 1000));
  const period = dwellFrames + xFrames;
  const DIM = 0.03; // ambient level for off channels

  return (tick, channels) => {
    const n = channels.length;
    const currentIdx = Math.floor(tick / period) % n;
    const nextIdx = (currentIdx + 1) % n;
    const posInPeriod = tick % period;
    const inTransition = posInPeriod >= dwellFrames;
    const xProgress = inTransition ? (posInPeriod - dwellFrames) / xFrames : 0;

    const MAX = 65535;
    return channels.map(({ channelId }, i) => {
      let bri: number;
      if (i === currentIdx)      bri = inTransition ? 1 - xProgress : 1;
      else if (i === nextIdx)    bri = inTransition ? xProgress : DIM;
      else                       bri = DIM;
      return { channelId, r: Math.round(MAX * bri), g: Math.round(MAX * bri), b: Math.round(MAX * bri) };
    });
  };
}
