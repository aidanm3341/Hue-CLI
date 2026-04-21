import { loadConfig, requireConfig } from "../config";
import { getLights, getRooms } from "../hue/api";
import { xyToHex } from "../hue/colors";

function swatch(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[48;2;${r};${g};${b}m    \x1b[0m`;
}

function briBar(pct: number): string {
  const filled = Math.round(pct / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

export async function runStatus(opts: { json?: boolean }): Promise<void> {
  const cfg = await loadConfig();
  requireConfig(cfg);

  let lights, rooms;
  try {
    [lights, rooms] = await Promise.all([getLights(cfg), getRooms(cfg)]);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  if (opts.json) {
    console.log(JSON.stringify(lights, null, 2));
    return;
  }

  const lightRoom = new Map<string, string>();
  for (const room of rooms) {
    for (const child of room.children) {
      if (child.rtype === "light") lightRoom.set(child.rid, room.metadata.name);
    }
  }

  for (const light of lights) {
    const on = light.on.on;
    const bri = light.dimming?.brightness ?? 100;
    const hex = light.color
      ? xyToHex(light.color.xy.x, light.color.xy.y, bri / 100)
      : "#FFFFFF";
    const room = lightRoom.get(light.id) ?? "—";
    const state = on ? "\x1b[32m● ON \x1b[0m" : "\x1b[90m○ off\x1b[0m";

    console.log(`${state} \x1b[1m${light.metadata.name}\x1b[0m  \x1b[2m${room}\x1b[0m`);
    console.log(`     ${swatch(hex)} ${hex}  ${briBar(bri)} ${Math.round(bri)}%`);
    console.log();
  }
}
