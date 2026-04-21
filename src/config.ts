import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface Config {
  bridgeIp: string;
  appKey: string;
  clientKey?: string;
  entertainmentConfigId?: string;
  defaults: { transitionMs: number };
}

const CONFIG_PATH = `${process.env.HOME}/.config/hue-cli/config.json`;

export async function loadConfig(): Promise<Config | null> {
  const file = Bun.file(CONFIG_PATH);
  if (!(await file.exists())) return null;
  try {
    return await file.json() as Config;
  } catch {
    return null;
  }
}

export async function saveConfig(cfg: Config): Promise<void> {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  await Bun.write(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

export function requireConfig(cfg: Config | null): asserts cfg is Config {
  if (!cfg) {
    console.error("No bridge configured. Run 'hue setup' first to pair with your bridge.");
    process.exit(1);
  }
}

export function requireEntertainmentConfig(cfg: Config): asserts cfg is Config & { clientKey: string; entertainmentConfigId: string } {
  if (!cfg.clientKey || !cfg.entertainmentConfigId) {
    console.error(
      "Entertainment streaming not configured.\n" +
      "Run 'hue setup --reauth' to generate a client key, then 'hue entertainment select <name>' to choose a config.",
    );
    process.exit(1);
  }
}
