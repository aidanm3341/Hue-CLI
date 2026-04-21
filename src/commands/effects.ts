import { EFFECT_REGISTRY } from "../entertainment/effects/registry";

export function runEffects(): void {
  console.log(`${"Name".padEnd(16)} ${"Description"}`);
  console.log("-".repeat(60));
  for (const e of EFFECT_REGISTRY) {
    const warn = e.photosensitive ? " ⚠" : "";
    console.log(`${e.name.padEnd(16)} ${e.description}${warn}`);
  }
  console.log(`\n${EFFECT_REGISTRY.length} effects available.`);
  console.log(`⚠  = contains flashing lights (photosensitivity risk)`);
}
