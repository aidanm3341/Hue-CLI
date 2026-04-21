import { loadConfig, requireConfig, type Config } from "../config";
import { getLights, getRooms, setLight, getEntertainmentConfigs } from "../hue/api";
import { resolveTarget } from "../resolve";
import { hexToXy } from "../hue/colors";
import { lightBucket } from "../hue/rateLimit";
import { makeRave, type RaveMode } from "../entertainment/effects/rave";
import { EntertainmentSession, dryRunPreview } from "../entertainment/session";

interface RaveOptions {
  mode?: string;
  bpm?: string;
  target?: string;
  dryRun?: boolean;
  // legacy REST options kept for back-compat
  speed?: string;
  lights?: string;
}

function hsvToHex(h: number, s: number, v: number): string {
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
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export async function runRave(opts: RaveOptions): Promise<void> {
  const cfg = await loadConfig();
  requireConfig(cfg);

  const mode = (opts.mode ?? "rainbow") as RaveMode;
  const bpm = parseInt(opts.bpm ?? "120");
  const validModes: RaveMode[] = ["rainbow", "strobe", "chaos", "beat"];
  if (!validModes.includes(mode)) {
    console.error(`Invalid mode '${mode}'. Use: ${validModes.join(", ")}`);
    process.exit(1);
  }

  // Use Entertainment API if configured
  if (cfg.clientKey && cfg.entertainmentConfigId) {
    await runRaveEntertainment(cfg as typeof cfg & { clientKey: string; entertainmentConfigId: string }, mode, bpm, opts);
    return;
  }

  // Fall back to REST-based rave
  console.log("Note: Entertainment config not set up — using REST API (lower fidelity). Run 'hue setup --reauth' to enable streaming.");
  await runRaveRest(cfg, opts);
}

async function runRaveEntertainment(
  cfg: Config & { clientKey: string; entertainmentConfigId: string },
  mode: RaveMode,
  bpm: number,
  opts: RaveOptions,
): Promise<void> {
  const configs = await getEntertainmentConfigs(cfg).catch(() => []);
  const entConfig = configs.find(c => c.id === cfg.entertainmentConfigId);
  if (!entConfig) {
    console.error(`Entertainment config not found — falling back to REST.`);
    await runRaveRest(cfg, opts);
    return;
  }

  const channels = entConfig.channels.map(c => ({ channelId: c.channel_id, position: c.position }));
  const effectFn = makeRave({ mode, bpm });

  if (opts.dryRun) {
    dryRunPreview(effectFn, channels);
    return;
  }

  const session = new EntertainmentSession(cfg, channels);

  let stopping = false;
  process.on("SIGINT", async () => {
    if (stopping) return;
    stopping = true;
    process.stdout.write("\nRave stopped.\n");
    await session.stop();
    process.exit(0);
  });

  console.log(`Rave started (${mode}, ${bpm} bpm, ${channels.length} channels). Ctrl-C to stop.`);
  try {
    await session.start();
    await session.run(effectFn);
  } finally {
    await session.stop();
  }
}

async function runRaveRest(cfg: Config, opts: RaveOptions): Promise<void> {
  const speed = parseInt(opts.speed ?? "500");
  const mode = (opts.mode ?? "rainbow") as "rainbow" | "strobe" | "chaos";

  let lights, rooms;
  try {
    [lights, rooms] = await Promise.all([getLights(cfg), getRooms(cfg)]);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  let ids: string[];
  const targetOpt = opts.lights ?? opts.target;
  if (targetOpt) {
    const targets = targetOpt.split(",").map((s: string) => s.trim());
    const resolved = await Promise.all(targets.map((t: string) => resolveTarget(cfg, t, lights, rooms)));
    ids = [...new Set(resolved.flatMap((r: { lightIds: string[] }) => r.lightIds))];
  } else {
    ids = lights.map((l: { id: string }) => l.id);
  }

  if (ids.length === 0) {
    console.error("No lights found.");
    process.exit(1);
  }

  process.on("SIGINT", () => { console.log("\nRave stopped."); process.exit(0); });

  let tick = 0;
  const STROBE_PAIR: [string, string] = ["#FF0000", "#0000FF"];
  while (true) {
    const hueBase = (tick * (360 / Math.max(speed / 100, 1))) % 360;
    const updates = ids.map((id: string, i: number) => {
      let hex: string;
      if (mode === "rainbow") {
        hex = hsvToHex((hueBase + (360 / ids.length) * i) % 360, 1, 1);
      } else if (mode === "strobe") {
        hex = (i % 2 === 0 ? tick % 2 === 0 : tick % 2 !== 0) ? STROBE_PAIR[0] : STROBE_PAIR[1];
      } else {
        hex = hsvToHex(Math.random() * 360, 1, 1);
      }
      return { id, xy: hexToXy(hex) };
    });
    await Promise.all(updates.map(async ({ id, xy }: { id: string; xy: { x: number; y: number } }) => {
      await lightBucket.consume(id);
      try {
        await setLight(cfg, id, { color: { xy }, dynamics: { duration: Math.min(speed, 400) } });
      } catch { /* rate-limited, skip */ }
    }));
    await new Promise<void>(r => setTimeout(r, speed));
    tick++;
  }
}
