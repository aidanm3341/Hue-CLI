import { loadConfig, requireConfig } from "../config";
import { getLights, getRooms, getGroupedLight } from "../hue/api";

export async function runRooms(opts: { json?: boolean }): Promise<void> {
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
    console.log(JSON.stringify(rooms, null, 2));
    return;
  }

  // Fetch grouped_light state for each room in parallel
  const groupedStates = await Promise.all(
    rooms.map(async (room) => {
      const svc = room.services.find((s) => s.rtype === "grouped_light");
      if (!svc) return null;
      try {
        return await getGroupedLight(cfg, svc.rid);
      } catch {
        return null;
      }
    }),
  );

  // Build a lightId → light map for quick lookup
  const lightMap = new Map(lights.map((l) => [l.id, l]));

  const col = (s: string, w: number) => s.slice(0, w).padEnd(w);

  console.log(`${col("Room", 24)} ${col("Lights", 8)} ${"On".padEnd(5)} ${"Brightness"}`)
  console.log("─".repeat(55));

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    const gl = groupedStates[i];
    const childLights = room.children
      .filter((c) => c.rtype === "light")
      .map((c) => lightMap.get(c.rid))
      .filter(Boolean);

    const on = gl?.on?.on ?? childLights.some((l) => l!.on.on);
    const onLights = childLights.filter((l) => l!.on.on);
    const avgBri = onLights.length > 0
      ? Math.round(onLights.reduce((s, l) => s + (l!.dimming?.brightness ?? 100), 0) / onLights.length)
      : 0;

    const onStr = on ? "✓" : "✗";
    const briStr = on ? `${avgBri}%` : "—";

    console.log(
      `${col(room.metadata.name, 24)} ${col(String(childLights.length), 8)} ${onStr.padEnd(5)} ${briStr}`,
    );
  }
}
