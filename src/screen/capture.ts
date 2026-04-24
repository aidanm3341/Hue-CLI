import { readFileSync } from "node:fs";

const TMP_PATH = "/tmp/hue-screen-cap.bmp";

export interface CaptureOpts {
  display?: number;
  thumbW?: number;
  thumbH?: number;
}

/**
 * Captures the screen and returns a tiny BMP thumbnail as raw bytes.
 * Returns null on any failure — callers should keep the last good frame.
 */
export function captureScreen(opts: CaptureOpts = {}): Uint8Array | null {
  const display = opts.display ?? 1;
  const thumbW = opts.thumbW ?? 64;
  const thumbH = opts.thumbH ?? 40;

  const cap = Bun.spawnSync([
    "screencapture", "-x", "-t", "bmp", "-D", String(display), TMP_PATH,
  ]);
  if (cap.exitCode !== 0) return null;

  // sips -z takes height then width (macOS quirk)
  const resize = Bun.spawnSync([
    "sips", "-z", String(thumbH), String(thumbW), TMP_PATH, "--out", TMP_PATH,
  ]);
  if (resize.exitCode !== 0) return null;

  try {
    return readFileSync(TMP_PATH);
  } catch {
    return null;
  }
}
