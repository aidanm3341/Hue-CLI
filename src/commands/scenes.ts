import { loadConfig, requireConfig } from "../config";
import { getRooms, getScenes, activateScene } from "../hue/api";

function matchRoom(name: string, filter: string): boolean {
  return name.toLowerCase().includes(filter.toLowerCase());
}

export async function runScenes(opts: { room?: string; json?: boolean }): Promise<void> {
  const cfg = await loadConfig();
  requireConfig(cfg);

  let rooms, scenes;
  try {
    [rooms, scenes] = await Promise.all([getRooms(cfg), getScenes(cfg)]);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  const roomMap = new Map(rooms.map((r) => [r.id, r.metadata.name]));

  let filtered = scenes;
  if (opts.room) {
    const matchingRoomIds = rooms
      .filter((r) => matchRoom(r.metadata.name, opts.room!))
      .map((r) => r.id);
    filtered = scenes.filter((s) => matchingRoomIds.includes(s.group.rid));
  }

  if (opts.json) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  if (filtered.length === 0) {
    console.log(opts.room ? `No scenes found for room matching "${opts.room}".` : "No scenes found.");
    return;
  }

  const col = (s: string, w: number) => s.slice(0, w).padEnd(w);
  console.log(`${col("Room", 24)} ${"Scene"}`);
  console.log("─".repeat(55));

  // Sort by room name then scene name
  filtered
    .slice()
    .sort((a, b) => {
      const ra = roomMap.get(a.group.rid) ?? "";
      const rb = roomMap.get(b.group.rid) ?? "";
      return ra.localeCompare(rb) || a.metadata.name.localeCompare(b.metadata.name);
    })
    .forEach((scene) => {
      const roomName = roomMap.get(scene.group.rid) ?? "—";
      console.log(`${col(roomName, 24)} ${scene.metadata.name}`);
    });
}

export async function runScene(
  nameOrId: string,
  opts: { room?: string },
): Promise<void> {
  const cfg = await loadConfig();
  requireConfig(cfg);

  let rooms, scenes;
  try {
    [rooms, scenes] = await Promise.all([getRooms(cfg), getScenes(cfg)]);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  const roomMap = new Map(rooms.map((r) => [r.id, r.metadata.name]));
  const t = nameOrId.toLowerCase();

  let candidates = scenes.filter(
    (s) =>
      s.metadata.name.toLowerCase().includes(t) ||
      s.id.toLowerCase() === t,
  );

  if (opts.room) {
    const matchingRoomIds = rooms
      .filter((r) => matchRoom(r.metadata.name, opts.room!))
      .map((r) => r.id);
    candidates = candidates.filter((s) => matchingRoomIds.includes(s.group.rid));
  }

  if (candidates.length === 0) {
    const hint = opts.room ? ` in room matching "${opts.room}"` : "";
    console.error(`No scene matching "${nameOrId}"${hint}.`);
    process.exit(1);
  }

  if (candidates.length > 1) {
    console.error(
      `Ambiguous — ${candidates.length} scenes match "${nameOrId}":\n` +
        candidates
          .map((s) => `  ${s.metadata.name}  (${roomMap.get(s.group.rid) ?? "unknown room"})`)
          .join("\n") +
        `\nUse --room to narrow down.`,
    );
    process.exit(1);
  }

  try {
    await activateScene(cfg, candidates[0].id);
    const roomName = roomMap.get(candidates[0].group.rid) ?? "";
    console.log(`Activated "${candidates[0].metadata.name}"${roomName ? ` in ${roomName}` : ""}.`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
