import type { EffectFn } from "./types";

interface FireState {
  brightness: number;
  target: number;
  ttl: number;
}

export function makeFire(): EffectFn {
  const states = new Map<number, FireState>();

  return (_tick, channels) => {
    return channels.map(({ channelId }) => {
      let s = states.get(channelId);
      if (!s) {
        s = { brightness: 0.5, target: 0.7, ttl: 8 };
        states.set(channelId, s);
      }

      if (--s.ttl <= 0) {
        s.target = 0.35 + Math.random() * 0.65;
        s.ttl = 3 + Math.floor(Math.random() * 14);
      }

      s.brightness += (s.target - s.brightness) * 0.15;
      const b = s.brightness;

      // Red always high, green quadratic (orange→yellow), blue almost zero
      return {
        channelId,
        r: Math.min(65535, Math.round(65535 * b)),
        g: Math.min(65535, Math.round(65535 * b * b * 0.55)),
        b: Math.min(65535, Math.round(65535 * b * b * b * 0.04)),
      };
    });
  };
}
