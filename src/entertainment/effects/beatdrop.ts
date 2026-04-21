import type { EffectFn } from "./types";
import { hueWheelTo16bit } from "../colors";

export function makeBeatDrop(opts: { bpm: number }): EffectFn {
  const FPS = 50;
  const framesPerBeat = FPS * 60 / opts.bpm;
  // Beat intensities for 4/4 time: 1 (downbeat), 2, 3, 4
  const beatIntensities = [1.0, 0.55, 0.8, 0.4];
  // Hue shifts per bar position: red, purple, blue, cyan
  const beatHues = [0, 270, 220, 180];

  return (tick, channels) => {
    const beatNum = Math.floor(tick / framesPerBeat) % 4;
    const posInBeat = (tick % framesPerBeat) / framesPerBeat;
    const peak = beatIntensities[beatNum]!;

    // Sharp attack (5% of beat), exponential decay
    const brightness = posInBeat < 0.05
      ? peak * (posInBeat / 0.05)
      : peak * Math.pow(1 - (posInBeat - 0.05) / 0.95, 1.5);

    const { r, g, b } = hueWheelTo16bit(beatHues[beatNum]!);
    return channels.map(({ channelId }) => ({
      channelId,
      r: Math.round(r * brightness),
      g: Math.round(g * brightness),
      b: Math.round(b * brightness),
    }));
  };
}
