import { loadConfig, requireConfig, saveConfig } from "../config";
import { getEntertainmentConfigs } from "../hue/api";

export async function runEntertainmentList(opts: { json?: boolean }): Promise<void> {
  const cfg = await loadConfig();
  requireConfig(cfg);

  const configs = await getEntertainmentConfigs(cfg).catch((e) => {
    console.error(`Error: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  });

  if (opts.json) {
    console.log(JSON.stringify(configs, null, 2));
    return;
  }

  if (configs.length === 0) {
    console.log("No entertainment configurations found on this bridge.");
    return;
  }

  const active = cfg.entertainmentConfigId;
  console.log(`${"".padEnd(2)} ${"ID".padEnd(38)} ${"Name".padEnd(24)} ${"Channels".padEnd(8)} Status`);
  console.log("-".repeat(80));
  for (const c of configs) {
    const marker = c.id === active ? "▶" : " ";
    const status = c.status === "active" ? "streaming" : "idle";
    console.log(
      `${marker}  ${c.id.padEnd(38)} ${c.metadata.name.padEnd(24)} ${String(c.channels.length).padEnd(8)} ${status}`
    );
  }
  console.log(`\n${configs.length} configuration(s) found.`);
  if (active) console.log(`Current: ${active}`);
}

export async function runEntertainmentSelect(nameOrId: string): Promise<void> {
  const cfg = await loadConfig();
  requireConfig(cfg);

  const configs = await getEntertainmentConfigs(cfg).catch((e) => {
    console.error(`Error: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  });

  const lower = nameOrId.toLowerCase();
  const match = configs.find(c =>
    c.id === nameOrId || c.metadata.name.toLowerCase().includes(lower)
  );

  if (!match) {
    console.error(`No entertainment configuration matching '${nameOrId}'.`);
    console.error(`Available: ${configs.map(c => c.metadata.name).join(", ")}`);
    process.exit(1);
  }

  await saveConfig({ ...cfg, entertainmentConfigId: match.id });
  console.log(`Selected entertainment config: ${match.metadata.name} (${match.id})`);
  console.log(`${match.channels.length} channels available for streaming.`);
}
