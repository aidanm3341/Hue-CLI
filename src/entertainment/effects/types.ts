import type { ChannelColor } from "../packet";

export type { ChannelColor };

export interface ChannelInfo {
  channelId: number;
  position: { x: number; y: number; z: number };
}

// tick: 0-based frame counter; channels: full info including positions
export type EffectFn = (tick: number, channels: ChannelInfo[]) => ChannelColor[];
