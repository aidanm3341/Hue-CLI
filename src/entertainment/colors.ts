// 16-bit (0–65535) color helpers for the Entertainment streaming API

export interface RGB16 {
  r: number;
  g: number;
  b: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function float01To16bit(v: number): number {
  return Math.round(clamp(v, 0, 1) * 65535);
}

export function hexTo16bit(hex: string): RGB16 {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return {
    r: float01To16bit(r),
    g: float01To16bit(g),
    b: float01To16bit(b),
  };
}

// Converts hue (0–360) at full saturation + value to 16-bit RGB
export function hueWheelTo16bit(hue: number): RGB16 {
  const h = ((hue % 360) + 360) % 360;
  const s = 1;
  const v = 1;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else              { r = c; b = x; }
  return {
    r: float01To16bit(r + m),
    g: float01To16bit(g + m),
    b: float01To16bit(b + m),
  };
}

export function lerp16bit(a: RGB16, b: RGB16, t: number): RGB16 {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

export const BLACK: RGB16 = { r: 0, g: 0, b: 0 };
export const WHITE: RGB16 = { r: 65535, g: 65535, b: 65535 };
