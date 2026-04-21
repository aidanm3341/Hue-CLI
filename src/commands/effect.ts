import { loadConfig, requireConfig, requireEntertainmentConfig, type Config } from "../config";
import { getEntertainmentConfigs, getLights, getRooms, setLight } from "../hue/api";
import { resolveTarget } from "../resolve";
import { hexToXy } from "../hue/colors";
import { lightBucket } from "../hue/rateLimit";
import { EntertainmentSession, dryRunPreview, type ChannelInfo } from "../entertainment/session";
import type { EffectFn } from "../entertainment/effects/types";
import { EFFECT_NAMES, EFFECT_REGISTRY } from "../entertainment/effects/registry";
import { makeLightning, type Intensity } from "../entertainment/effects/lightning";
import { makeStrobe } from "../entertainment/effects/strobe";
import { makeRave, type RaveMode } from "../entertainment/effects/rave";
import { makeSunrise } from "../entertainment/effects/sunrise";
import { makeCandle } from "../entertainment/effects/candle";
import { makeBreathe } from "../entertainment/effects/breathe";
import { makeBeatDrop } from "../entertainment/effects/beatdrop";
import { makeWave } from "../entertainment/effects/wave";
import { makeSpotlight } from "../entertainment/effects/spotlight";
import { makePolice } from "../entertainment/effects/police";
import { makeFire } from "../entertainment/effects/fire";
import { makeNorthernLights } from "../entertainment/effects/northernlights";

interface EffectOptions {
  duration?: string;
  bpm?: string;
  intensity?: string;
  rate?: string;
  safe?: boolean;
  color?: string;
  noWarn?: boolean;
  dryRun?: boolean;
}

function buildEffect(name: string, opts: EffectOptions): EffectFn {
  const bpm = parseInt(opts.bpm ?? "120");
  switch (name) {
    case "lightning":      return makeLightning({ intensity: (opts.intensity ?? "medium") as Intensity });
    case "strobe":         return makeStrobe({ rateHz: parseFloat(opts.rate ?? "2"), color: opts.color, safe: opts.safe });
    case "rave":           return makeRave({ mode: "rainbow", bpm });
    case "fire":           return makeFire();
    case "candle":         return makeCandle();
    case "breathe":        return makeBreathe({ color: opts.color });
    case "beatdrop":       return makeBeatDrop({ bpm });
    case "wave":           return makeWave({ color: opts.color });
    case "spotlight":      return makeSpotlight();
    case "police":         return makePolice();
    case "northernlights": return makeNorthernLights();
    case "sunrise":        return makeSunrise({ durationMs: parseFloat(opts.duration ?? "300") * 1000, direction: "rise" });
    case "sunset":         return makeSunrise({ durationMs: parseFloat(opts.duration ?? "300") * 1000, direction: "set" });
    default:               throw new Error(`Unknown effect: ${name}`);
  }
}

export async function runEffect(name: string, opts: EffectOptions): Promise<void> {
  if (!EFFECT_NAMES.has(name)) {
    const similar = EFFECT_REGISTRY.map(e => e.name).filter(n => n.startsWith(name[0] ?? ""));
    console.error(`Unknown effect '${name}'. Run 'hue effects' to see available effects.`);
    if (similar.length) console.error(`Did you mean: ${similar.join(", ")}?`);
    process.exit(1);
  }

  const cfg = await loadConfig();
  requireConfig(cfg);

  const meta = EFFECT_REGISTRY.find(e => e.name === name)!;
  if (meta.photosensitive && !opts.noWarn) {
    process.stderr.write(
      `⚠  WARNING: '${name}' contains flashing lights.\n` +
      `   People with photosensitive epilepsy should not use this effect.\n` +
      `   Pass --no-warn to suppress this message.\n\n`,
    );
  }

  const effectFn = buildEffect(name, opts);
  const durationMs = opts.duration && name !== "sunrise" && name !== "sunset"
    ? parseFloat(opts.duration) * 1000
    : undefined;

  // rave can fall back to REST; all other effects require entertainment config
  if (!cfg.clientKey || !cfg.entertainmentConfigId) {
    if (name === "rave") {
      await runRaveRest(cfg, opts);
      return;
    }
    requireEntertainmentConfig(cfg); // exits with helpful message
  }

  const configs = await getEntertainmentConfigs(cfg).catch((e) => {
    console.error(`Failed to fetch entertainment configs: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  });
  const entConfig = configs.find(c => c.id === cfg.entertainmentConfigId);
  if (!entConfig) {
    console.error(`Entertainment config '${cfg.entertainmentConfigId}' not found on bridge.`);
    process.exit(1);
  }

  const channels: ChannelInfo[] = entConfig.channels.map(c => ({
    channelId: c.channel_id,
    position: c.position,
  }));

  if (opts.dryRun) {
    dryRunPreview(effectFn, channels);
    return;
  }

  const session = new EntertainmentSession(
    cfg as Config & { clientKey: string; entertainmentConfigId: string },
    channels,
  );

  let stopping = false;
  process.on("SIGINT", async () => {
    if (stopping) return;
    stopping = true;
    process.stdout.write("\nStopping...\n");
    await session.stop();
    process.exit(0);
  });

  console.log(`Effect '${name}' started (${channels.length} channels). Ctrl-C to stop.`);
  try {
    await session.start();
    await session.run(effectFn, durationMs);
  } finally {
    await session.stop();
  }
}

// REST fallback for rave when entertainment API is not configured
async function runRaveRest(cfg: Config, opts: EffectOptions): Promise<void> {
  console.log("Note: Entertainment config not set up — using REST API. Run 'hue setup --client-key <key>' to enable streaming.");
  const speed = 500;
  const bpm = parseInt(opts.bpm ?? "120");
  const degreesPerMs = (bpm / 60) * 360 / 1000;

  let lights, rooms;
  try {
    [lights, rooms] = await Promise.all([getLights(cfg), getRooms(cfg)]);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  const ids = lights.map((l: { id: string }) => l.id);
  if (!ids.length) { console.error("No lights found."); process.exit(1); }

  process.on("SIGINT", () => { console.log("\nStopped."); process.exit(0); });
  console.log(`Rave started (REST, ${ids.length} lights). Ctrl-C to stop.`);

  let tick = 0;
  while (true) {
    const hueBase = (tick * speed * degreesPerMs) % 360;
    await Promise.all(ids.map(async (id: string, i: number) => {
      const hue = (hueBase + (360 / ids.length) * i) % 360;
      const h = hue / 60;
      const c = 1, x = c * (1 - Math.abs((h % 2) - 1));
      let r = 0, g = 0, b = 0;
      if (h < 1) { r = c; g = x; } else if (h < 2) { r = x; g = c; }
      else if (h < 3) { g = c; b = x; } else if (h < 4) { g = x; b = c; }
      else if (h < 5) { r = x; b = c; } else { r = c; b = x; }
      const toH = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
      const hex = `#${toH(r)}${toH(g)}${toH(b)}`;
      await lightBucket.consume(id);
      await setLight(cfg, id, { color: { xy: hexToXy(hex) }, dynamics: { duration: 400 } }).catch(() => {});
    }));
    await new Promise<void>(r => setTimeout(r, speed));
    tick++;
  }
}
