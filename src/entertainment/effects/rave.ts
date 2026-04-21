import type { EffectFn } from "./types";
import { hueWheelTo16bit } from "../colors";

const FPS = 50;

export type RaveMode = "rainbow" | "strobe" | "chaos" | "beat";

export interface RaveOpts {
  mode: RaveMode;
  bpm: number;
}

export function makeRave(opts: RaveOpts): EffectFn {
  switch (opts.mode) {
    case "rainbow": return makeRainbow(opts.bpm);
    case "chaos":   return makeChaos();
    case "strobe":  return makeRaveStrobe(opts.bpm);
    case "beat":    return makeBeat(opts.bpm);
    default:        return makeRainbow(opts.bpm);
  }
}

function makeRainbow(bpm: number): EffectFn {
  const degreesPerFrame = (bpm / 60) * 360 / FPS;
  return (tick, channels) => {
    const baseHue = (tick * degreesPerFrame) % 360;
    return channels.map(({ channelId }, i) => {
      const hue = (baseHue + (360 / channels.length) * i) % 360;
      const { r, g, b } = hueWheelTo16bit(hue);
      return { channelId, r, g, b };
    });
  };
}

function makeChaos(): EffectFn {
  const states = new Map<number, { r: number; g: number; b: number; ttl: number }>();
  return (_tick, channels) => {
    return channels.map(({ channelId }) => {
      let s = states.get(channelId);
      if (!s || s.ttl <= 0) {
        const { r, g, b } = hueWheelTo16bit(Math.random() * 360);
        s = { r, g, b, ttl: 5 + Math.floor(Math.random() * 20) };
        states.set(channelId, s);
      }
      s.ttl--;
      return { channelId, r: s.r, g: s.g, b: s.b };
    });
  };
}

function makeRaveStrobe(bpm: number): EffectFn {
  const degreesPerFrame = (bpm / 60) * 360 / FPS;
  const framesPerHalf = Math.max(1, Math.round(FPS * 60 / bpm / 2));
  return (tick, channels) => {
    const baseHue = (tick * degreesPerFrame) % 360;
    const phase = Math.floor(tick / framesPerHalf) % 2;
    return channels.map(({ channelId }, i) => {
      const flipped = i % 2 === 1 ? 1 - phase : phase;
      const hue = flipped === 0 ? baseHue : (baseHue + 180) % 360;
      const { r, g, b } = hueWheelTo16bit(hue);
      return { channelId, r, g, b };
    });
  };
}

function makeBeat(bpm: number): EffectFn {
  const framesPerBeat = Math.max(1, FPS * 60 / bpm);
  return (tick, channels) => {
    const posInBeat = (tick % framesPerBeat) / framesPerBeat;
    const brightness = Math.pow(1 - posInBeat, 2);
    const baseHue = (tick / framesPerBeat) * 60 % 360;
    const { r, g, b } = hueWheelTo16bit(baseHue);
    const scale = (v: number) => Math.round(v * brightness);
    return channels.map(({ channelId }) => ({
      channelId,
      r: scale(r),
      g: scale(g),
      b: scale(b),
    }));
  };
}
