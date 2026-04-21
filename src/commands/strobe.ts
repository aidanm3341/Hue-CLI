import { loadConfig, requireConfig, requireEntertainmentConfig } from "../config";
import { getEntertainmentConfigs } from "../hue/api";
import { makeStrobe } from "../entertainment/effects/strobe";
import { EntertainmentSession, dryRunPreview } from "../entertainment/session";

interface StrobeOptions {
  color?: string;
  bg?: string;
  rate?: string;
  noWarn?: boolean;
  safe?: boolean;
  dryRun?: boolean;
  duration?: string;
}

export async function runStrobe(opts: StrobeOptions): Promise<void> {
  const cfg = await loadConfig();
  requireConfig(cfg);
  requireEntertainmentConfig(cfg);

  const rateHz = parseFloat(opts.rate ?? "2");
  if (isNaN(rateHz) || rateHz <= 0) {
    console.error("Invalid rate. Provide a positive number in Hz.");
    process.exit(1);
  }

  if (!opts.noWarn) {
    process.stderr.write(
      "⚠  WARNING: The strobe effect contains rapid flashing lights.\n" +
      "   People with photosensitive epilepsy should not use this effect.\n" +
      `   Current rate: ${rateHz} Hz${rateHz > 3 ? " — above the 3 Hz safety threshold" : ""}.\n` +
      "   Pass --safe to clamp to 3 Hz, or --no-warn to suppress this message.\n\n"
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
  const effectFn = makeStrobe({
    color: opts.color,
    bg: opts.bg,
    rateHz,
    safe: opts.safe,
  });
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
    process.stdout.write("\nStopping strobe...\n");
    await session.stop();
    process.exit(0);
  });

  console.log(`Strobe started (${rateHz} Hz${opts.safe ? " [safe-capped]" : ""}). Ctrl-C to stop.`);
  try {
    await session.start();
    await session.run(effectFn, durationMs);
  } finally {
    await session.stop();
  }
}
