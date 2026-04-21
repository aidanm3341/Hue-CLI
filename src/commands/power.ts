import { loadConfig, requireConfig } from "../config";
import { getLights, getRooms, setLight, setGroupedLight, getLight } from "../hue/api";
import { resolveTarget } from "../resolve";

async function applyPower(target: string, on: boolean | "toggle"): Promise<void> {
  const cfg = await loadConfig();
  requireConfig(cfg);

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

  try {
    if (resolved.groupedLightId) {
      let state = on;
      if (on === "toggle") {
        // Can't easily get grouped light state for toggle — default to on
        state = true;
      }
      await setGroupedLight(cfg, resolved.groupedLightId, { on: { on: state as boolean } });
    } else {
      await Promise.all(
        resolved.lightIds.map(async (id) => {
          let state = on as boolean;
          if (on === "toggle") {
            const current = await getLight(cfg, id);
            state = !current.on.on;
          }
          await setLight(cfg, id, { on: { on: state } });
        }),
      );
    }
    console.log(`Done.`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

export const runOn = (target = "all") => applyPower(target, true);
export const runOff = (target = "all") => applyPower(target, false);
export const runToggle = (target = "all") => applyPower(target, "toggle");
