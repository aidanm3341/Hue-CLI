import { loadConfig, requireConfig, requireEntertainmentConfig, type Config } from "../config";
import { getEntertainmentConfigs } from "../hue/api";
import { EntertainmentSession, type ChannelInfo } from "../entertainment/session";
import { captureScreen } from "../screen/capture";
import { analyzeFrame, makeScreenEffectFn, makeScreenState, updateScreenState, type ScreenMode } from "../screen/analyze";

export interface ScreenOptions {
  interval?: string;
  mode?: string;
  smooth?: boolean;
  display?: string;
  duration?: string;
}

export async function runScreen(opts: ScreenOptions): Promise<void> {
  const cfg = await loadConfig();
  requireConfig(cfg);
  requireEntertainmentConfig(cfg);

  const intervalMs = parseInt(opts.interval ?? "100");
  const mode = (opts.mode ?? "spatial") as ScreenMode;
  const display = parseInt(opts.display ?? "1");
  const durationMs = opts.duration ? parseFloat(opts.duration) * 1000 : undefined;

  if (mode !== "spatial" && mode !== "average") {
    console.error(`Unknown mode '${mode}'. Use 'spatial' or 'average'.`);
    process.exit(1);
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

  console.log(
    `Screen sync — ${channels.length} channels, mode=${mode}, interval=${intervalMs}ms` +
    `${opts.smooth ? ", smooth" : ""}. Ctrl-C to stop.`,
  );
  console.log(
    "Note: if capture fails, grant Screen Recording permission to Terminal in\n" +
    "System Settings → Privacy & Security → Screen Recording.",
  );

  const state = makeScreenState();
  const effectFn = makeScreenEffectFn(state, { smooth: opts.smooth ?? false });

  const session = new EntertainmentSession(
    cfg as Config & { clientKey: string; entertainmentConfigId: string },
    channels,
  );

  let captureInterval: ReturnType<typeof setInterval> | null = null;
  let stopping = false;

  async function stop() {
    if (stopping) return;
    stopping = true;
    if (captureInterval !== null) { clearInterval(captureInterval); captureInterval = null; }
    process.stdout.write("\nStopping...\n");
    await session.stop();
    process.exit(0);
  }

  process.on("SIGINT", stop);

  await session.start();

  let captureCount = 0;
  let failCount = 0;

  captureInterval = setInterval(() => {
    const bytes = captureScreen({ display, thumbW: 64, thumbH: 40 });
    if (!bytes) {
      failCount++;
      if (failCount === 3) {
        process.stderr.write(
          "Warning: screen capture failing. Check Screen Recording permission in\n" +
          "System Settings → Privacy & Security → Screen Recording, then restart Terminal.\n",
        );
      }
      return;
    }
    captureCount++;
    if (captureCount === 1) process.stdout.write("First capture succeeded — streaming to lights.\n");
    const targets = analyzeFrame(bytes, channels, mode);
    updateScreenState(state, targets, channels);
  }, intervalMs);

  try {
    await session.run(effectFn, durationMs);
  } finally {
    if (captureInterval !== null) clearInterval(captureInterval);
    await session.stop();
  }
}
