import type { Config } from "./config";
import type { HueLight, HueRoom } from "./hue/types";

export interface ResolveResult {
  lightIds: string[];
  groupedLightId?: string;
}

export async function resolveTarget(
  _cfg: Config,
  target: string,
  lights: HueLight[],
  rooms: HueRoom[],
): Promise<ResolveResult> {
  const t = target.toLowerCase();

  // "all" → every light
  if (t === "all") {
    return { lightIds: lights.map((l) => l.id) };
  }

  // Match light names (case-insensitive substring)
  const byName = lights.filter((l) =>
    l.metadata.name.toLowerCase().includes(t),
  );
  if (byName.length > 0) {
    return { lightIds: byName.map((l) => l.id) };
  }

  // Match light id exactly
  const byId = lights.find((l) => l.id.toLowerCase() === t);
  if (byId) {
    return { lightIds: [byId.id] };
  }

  // Match room name → return grouped_light service id
  const room = rooms.find((r) => r.metadata.name.toLowerCase().includes(t));
  if (room) {
    const svc = room.services.find((s) => s.rtype === "grouped_light");
    if (svc) {
      return { lightIds: [], groupedLightId: svc.rid };
    }
    // Fallback: resolve individual light children
    const childIds = room.children
      .filter((c) => c.rtype === "light")
      .map((c) => c.rid)
      .filter((rid) => lights.some((l) => l.id === rid));
    return { lightIds: childIds };
  }

  throw new Error(
    `No light, id, or room matching "${target}". Use 'hue list' to see available targets.`,
  );
}
