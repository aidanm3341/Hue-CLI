import type { ChannelInfo } from "../entertainment/effects/types";
import type { EffectFn } from "../entertainment/effects/types";
import type { RGB16 } from "../entertainment/colors";
import { lerp16bit, BLACK } from "../entertainment/colors";

export type ScreenMode = "spatial" | "average";

export interface ScreenState {
  current: Map<number, RGB16>;
  target: Map<number, RGB16>;
  ready: boolean;
}

export function makeScreenState(): ScreenState {
  return { current: new Map(), target: new Map(), ready: false };
}

// --- BMP parsing ---

interface BmpImage {
  width: number;
  height: number;
  isBottomUp: boolean;
  pixelOffset: number;
  stride: number;
  bytesPerPixel: number;
  buf: Buffer;
}

function parseBmp(bytes: Uint8Array): BmpImage | null {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (buf.length < 54) return null;
  if (buf[0] !== 0x42 || buf[1] !== 0x4d) return null; // "BM"

  const pixelOffset = buf.readUInt32LE(10);
  const width = buf.readInt32LE(18);
  const rawHeight = buf.readInt32LE(22);
  const bpp = buf.readUInt16LE(28);

  // Accept 24-bit BGR and 32-bit BGRA/BGRX (what sips produces)
  if (bpp !== 24 && bpp !== 32) return null;

  const height = Math.abs(rawHeight);
  const isBottomUp = rawHeight > 0; // negative height = top-down
  const bytesPerPixel = bpp === 32 ? 4 : 3;
  const stride = bpp === 32 ? width * 4 : Math.ceil((width * 3) / 4) * 4;

  if (buf.length < pixelOffset + stride * height) return null;

  return { width, height, isBottomUp, pixelOffset, stride, bytesPerPixel, buf };
}

function getPixelRGB(img: BmpImage, col: number, visualRow: number): [number, number, number] {
  const physRow = img.isBottomUp ? img.height - 1 - visualRow : visualRow;
  const off = img.pixelOffset + physRow * img.stride + col * img.bytesPerPixel;
  // BMP stores BGR (or BGRA for 32-bit) — R is always at +2, G at +1, B at +0
  return [img.buf[off + 2]!, img.buf[off + 1]!, img.buf[off]!];
}

function averageRegion(img: BmpImage, x0: number, x1: number): RGB16 {
  let sumR = 0, sumG = 0, sumB = 0, n = 0;
  for (let row = 0; row < img.height; row++) {
    for (let col = x0; col < x1; col++) {
      const [r, g, b] = getPixelRGB(img, col, row);
      sumR += r; sumG += g; sumB += b; n++;
    }
  }
  if (n === 0) return { ...BLACK };
  // Scale 8-bit [0,255] → 16-bit [0,65535]: multiply by 65535/255 = 257
  const s = 65535 / 255;
  return {
    r: Math.round(sumR / n * s),
    g: Math.round(sumG / n * s),
    b: Math.round(sumB / n * s),
  };
}

// --- Analysis ---

export function analyzeFrame(
  bytes: Uint8Array,
  channels: ChannelInfo[],
  mode: ScreenMode,
): Map<number, RGB16> {
  const result = new Map<number, RGB16>();
  const img = parseBmp(bytes);
  if (!img || channels.length === 0) return result;

  if (mode === "average") {
    const avg = averageRegion(img, 0, img.width);
    for (const ch of channels) result.set(ch.channelId, avg);
    return result;
  }

  // Spatial mode: map position.x ∈ [-1,1] to horizontal strip
  const xs = channels.map(ch => ch.position.x);
  const xRange = Math.max(...xs) - Math.min(...xs);
  if (xRange < 0.01) {
    // All channels at same x — fall back to average
    const avg = averageRegion(img, 0, img.width);
    for (const ch of channels) result.set(ch.channelId, avg);
    return result;
  }

  const halfWidth = 0.5 / channels.length;
  for (const ch of channels) {
    const t = (ch.position.x + 1) / 2; // [-1,1] → [0,1]
    const tLeft = Math.max(0, t - halfWidth);
    const tRight = Math.min(1, t + halfWidth);
    const x0 = Math.floor(tLeft * img.width);
    const x1 = Math.max(x0 + 1, Math.ceil(tRight * img.width));
    result.set(ch.channelId, averageRegion(img, x0, x1));
  }
  return result;
}

export function updateScreenState(
  state: ScreenState,
  targets: Map<number, RGB16>,
  channels: ChannelInfo[],
): void {
  for (const ch of channels) {
    const t = targets.get(ch.channelId);
    if (!t) continue;
    state.target.set(ch.channelId, t);
    if (!state.ready) {
      // Initialise current to target on first capture — avoids lerp from black
      state.current.set(ch.channelId, { ...t });
    }
  }
  state.ready = true;
}

export function makeScreenEffectFn(
  state: ScreenState,
  opts: { smooth: boolean; lerpFactor?: number },
): EffectFn {
  const alpha = opts.lerpFactor ?? 0.15;

  return (_tick, channels) => {
    if (!state.ready) {
      return channels.map(ch => ({ channelId: ch.channelId, r: 0, g: 0, b: 0 }));
    }
    return channels.map(ch => {
      const id = ch.channelId;
      const target = state.target.get(id) ?? BLACK;
      if (!opts.smooth) return { channelId: id, ...target };
      const current = state.current.get(id) ?? target;
      const next = lerp16bit(current, target, alpha);
      state.current.set(id, next);
      return { channelId: id, ...next };
    });
  };
}
