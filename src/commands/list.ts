import { loadConfig, requireConfig } from "../config";
import { getLights, getRooms } from "../hue/api";
import { xyToHex } from "../hue/colors";

function ansiSwatch(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[48;2;${r};${g};${b}m  \x1b[0m`;
}

export async function runList(opts: { json?: boolean }): Promise<void> {
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

  // Build room-name lookup: lightId → roomName
  const lightRoom = new Map<string, string>();
  for (const room of rooms) {
    for (const child of room.children) {
      if (child.rtype === "light") lightRoom.set(child.rid, room.metadata.name);
    }
  }

  const col = (s: string, w: number) => s.slice(0, w).padEnd(w);

  console.log(
    `${col("ID", 36)} ${col("Name", 24)} ${col("Room", 18)} ${"On"} ${"Bri"} Colour`,
  );
  console.log("─".repeat(100));

  for (const light of lights) {
    const on = light.on.on ? "✓" : "✗";
    const bri = light.dimming ? `${Math.round(light.dimming.brightness)}%` : " — ";
    const hex = light.color
      ? xyToHex(light.color.xy.x, light.color.xy.y, (light.dimming?.brightness ?? 100) / 100)
      : "#FFFFFF";
    const swatch = ansiSwatch(hex);
    const room = lightRoom.get(light.id) ?? "—";
    console.log(
      `${col(light.id, 36)} ${col(light.metadata.name, 24)} ${col(room, 18)} ${on.padStart(2)}  ${bri.padStart(4)} ${swatch} ${hex}`,
    );
  }
}
