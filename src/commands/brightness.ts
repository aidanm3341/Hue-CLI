import { loadConfig, requireConfig } from "../config";
import { getLights, getRooms, setLight, setGroupedLight } from "../hue/api";
import { resolveTarget } from "../resolve";

export async function runBrightness(value: string, target = "all"): Promise<void> {
  const cfg = await loadConfig();
  requireConfig(cfg);

  const brightness = parseFloat(value);
  if (isNaN(brightness) || brightness < 0 || brightness > 100) {
    console.error("Brightness must be a number between 0 and 100.");
    process.exit(1);
  }

  let lights, rooms;
  try {
    [lights, rooms] = await Promise.all([getLights(cfg), getRooms(cfg)]);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  let resolved;
  try {
    resolved = await resolveTarget(cfg, target, lights, rooms);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  const update = {
    dimming: { brightness },
    dynamics: { duration: cfg.defaults.transitionMs },
  };

  try {
    if (resolved.groupedLightId) {
      await setGroupedLight(cfg, resolved.groupedLightId, update);
    } else {
      await Promise.all(resolved.lightIds.map((id) => setLight(cfg, id, update)));
    }
    console.log(`Done.`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
