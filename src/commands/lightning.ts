import { loadConfig, requireConfig, requireEntertainmentConfig } from "../config";
import { getEntertainmentConfigs } from "../hue/api";
import { makeLightning, type Intensity } from "../entertainment/effects/lightning";
import { EntertainmentSession, dryRunPreview } from "../entertainment/session";

interface LightningOptions {
  duration?: string;
  intensity?: string;
  noWarn?: boolean;
  dryRun?: boolean;
}

export async function runLightning(opts: LightningOptions): Promise<void> {
  const cfg = await loadConfig();
  requireConfig(cfg);
  requireEntertainmentConfig(cfg);

  const intensity = (opts.intensity ?? "medium") as Intensity;
  const validIntensities: Intensity[] = ["low", "medium", "high", "storm"];
  if (!validIntensities.includes(intensity)) {
    console.error(`Invalid intensity '${intensity}'. Use: ${validIntensities.join(", ")}`);
    process.exit(1);
  }

  if (!opts.noWarn) {
    process.stderr.write(
      "⚠  WARNING: The lightning effect contains rapid flashing lights.\n" +
      "   People with photosensitive epilepsy should not use this effect.\n" +
      "   Pass --no-warn to suppress this message.\n\n"
    );
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

  const channels = entConfig.channels.map(c => ({ channelId: c.channel_id, position: c.position }));
  const effectFn = makeLightning({ intensity });
  const durationMs = opts.duration ? parseFloat(opts.duration) * 1000 : undefined;

  if (opts.dryRun) {
    dryRunPreview(effectFn, channels);
    return;
  }

  const session = new EntertainmentSession(cfg, channels);

  let stopping = false;
  process.on("SIGINT", async () => {
    if (stopping) return;
    stopping = true;
    process.stdout.write("\nStopping lightning...\n");
    await session.stop();
    process.exit(0);
  });

  console.log(`Lightning effect started (${intensity} intensity). Ctrl-C to stop.`);
  try {
    await session.start();
    await session.run(effectFn, durationMs);
  } finally {
    await session.stop();
  }
}
