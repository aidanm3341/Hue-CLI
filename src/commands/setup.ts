import { discoverBridge } from "../hue/discovery";
import { pair } from "../hue/pairing";
import { loadConfig, saveConfig } from "../config";
import { getEntertainmentConfigs } from "../hue/api";
import { createInterface } from "node:readline";

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

interface SetupOptions {
  key?: string;
  ip?: string;
  clientKey?: string;
  reauth?: boolean;
}

export async function runSetup(opts: SetupOptions): Promise<void> {
  // --reauth: re-pair to get a clientKey for Entertainment API
  if (opts.reauth) {
    await runReauth();
    return;
  }

  // --client-key alone: just update existing config without re-pairing
  if (opts.clientKey && !opts.key && !opts.ip) {
    const existing = await loadConfig();
    if (!existing) {
      console.error("No bridge configured. Run 'hue setup' first.");
      process.exit(1);
    }
    await saveConfig({ ...existing, clientKey: opts.clientKey });
    console.log(`Client key saved. Run 'hue entertainment list' to view available configs.`);
    return;
  }

  // Load existing config to preserve fields we're not changing
  const existing = await loadConfig();

  // Resolve bridge IP
  let bridgeIp = opts.ip ?? null;

  if (!bridgeIp) {
    console.log("Searching for Hue bridge on your network...");
    bridgeIp = await discoverBridge();

    if (bridgeIp) {
      console.log(`Found bridge at ${bridgeIp}`);
      const confirm = await prompt(`Use this bridge? [Y/n]: `);
      if (confirm.toLowerCase() === "n") bridgeIp = null;
    }

    if (!bridgeIp) {
      bridgeIp = await prompt("Enter bridge IP address: ");
      if (!bridgeIp) {
        console.error("No IP provided. Aborting.");
        process.exit(1);
      }
    }
  }

  // Use existing key or pair to get a new one
  let appKey: string;
  if (opts.key) {
    appKey = opts.key;
    console.log(`Using provided app key.`);
  } else {
    console.log(`Connecting to bridge at ${bridgeIp}...`);
    try {
      const result = await pair(bridgeIp);
      appKey = result.username;
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  }

  // Preserve clientKey from existing config if not overriding
  const clientKey = opts.clientKey ?? existing?.clientKey;
  await saveConfig({
    ...(existing ?? {}),
    bridgeIp,
    appKey,
    clientKey,
    defaults: existing?.defaults ?? { transitionMs: 200 },
  });
  console.log(`Config saved to ~/.config/hue-cli/config.json`);
  if (!clientKey) {
    console.log(`Tip: run 'hue setup --client-key <key>' or 'hue setup --reauth' to enable Entertainment streaming.`);
  }
}

async function runReauth(): Promise<void> {
  const existing = await loadConfig();
  if (!existing) {
    console.error("No bridge configured. Run 'hue setup' first.");
    process.exit(1);
  }

  console.log(`Re-pairing with bridge at ${existing.bridgeIp} to generate a client key...`);
  console.log("Press the link button on your bridge when prompted.\n");

  let result: { username: string; clientKey?: string };
  try {
    result = await pair(existing.bridgeIp, { generateClientKey: true });
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  if (!result.clientKey) {
    console.error("Bridge did not return a client key. Make sure your bridge firmware is up to date.");
    process.exit(1);
  }

  const updated = {
    ...existing,
    appKey: result.username,
    clientKey: result.clientKey,
  };

  // Auto-detect entertainment configuration
  let entertainmentConfigId: string | undefined;
  try {
    const configs = await getEntertainmentConfigs({ ...updated });
    if (configs.length === 1) {
      entertainmentConfigId = configs[0]!.id;
      console.log(`Auto-selected entertainment config: ${configs[0]!.metadata.name} (${configs[0]!.channels.length} channels)`);
    } else if (configs.length > 1) {
      console.log(`\nMultiple entertainment configurations found:`);
      configs.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.metadata.name} — ${c.channels.length} channels`);
      });
      const choice = await prompt(`Select config [1–${configs.length}]: `);
      const idx = parseInt(choice) - 1;
      if (idx >= 0 && idx < configs.length) {
        entertainmentConfigId = configs[idx]!.id;
        console.log(`Selected: ${configs[idx]!.metadata.name}`);
      } else {
        console.log("Invalid choice — skipping. Run 'hue entertainment select <name>' later.");
      }
    } else {
      console.log("No entertainment configurations found on bridge.");
      console.log("Create one in the Philips Hue app under Settings > Entertainment Areas.");
    }
  } catch (e) {
    console.log(`Could not fetch entertainment configs: ${e instanceof Error ? e.message : e}`);
  }

  await saveConfig({ ...updated, entertainmentConfigId });
  console.log(`\nClient key saved. Entertainment streaming is now available.`);
}
