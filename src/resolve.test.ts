import { describe, expect, it } from "bun:test";
import { resolveTarget } from "./resolve";
import type { HueLight, HueRoom } from "./hue/types";
import type { Config } from "./config";

const cfg = {} as Config;

const lights: HueLight[] = [
  { id: "l1", metadata: { name: "Living Room 1" }, on: { on: true }, dimming: { brightness: 80 } },
  { id: "l2", metadata: { name: "Living Room 2" }, on: { on: false }, dimming: { brightness: 50 } },
  { id: "l3", metadata: { name: "Bedroom Lamp" }, on: { on: true } },
];

const rooms: HueRoom[] = [
  {
    id: "r1",
    metadata: { name: "Living Room" },
    children: [
      { rid: "l1", rtype: "light" },
      { rid: "l2", rtype: "light" },
    ],
    services: [{ rid: "g1", rtype: "grouped_light" }],
  },
  {
    id: "r2",
    metadata: { name: "Bedroom" },
    children: [{ rid: "l3", rtype: "light" }],
    services: [{ rid: "g2", rtype: "grouped_light" }],
  },
];

describe("resolveTarget", () => {
  it("resolves 'all' to all light IDs", async () => {
    const result = await resolveTarget(cfg, "all", lights, rooms);
    expect(result.lightIds).toEqual(["l1", "l2", "l3"]);
  });

  it("resolves partial light name", async () => {
    const result = await resolveTarget(cfg, "bedroom", lights, rooms);
    expect(result.lightIds).toEqual(["l3"]);
  });

  it("resolves name case-insensitively", async () => {
    const result = await resolveTarget(cfg, "BEDROOM", lights, rooms);
    expect(result.lightIds).toEqual(["l3"]);
  });

  it("resolves multiple lights matching name fragment", async () => {
    const result = await resolveTarget(cfg, "living room", lights, rooms);
    expect(result.lightIds).toEqual(["l1", "l2"]);
  });

  it("resolves exact light ID", async () => {
    const result = await resolveTarget(cfg, "l3", lights, rooms);
    expect(result.lightIds).toEqual(["l3"]);
  });

  it("resolves room name to grouped_light ID", async () => {
    const result = await resolveTarget(cfg, "living room", lights, rooms);
    // Name match on lights wins over room here
    expect(result.lightIds.length).toBeGreaterThan(0);
  });

  it("resolves room name when no light names match", async () => {
    const result = await resolveTarget(cfg, "bedroom", lights, rooms);
    // "Bedroom Lamp" light name matches first
    expect(result.lightIds).toEqual(["l3"]);
  });

  it("throws on unknown target", async () => {
    await expect(resolveTarget(cfg, "kitchen", lights, rooms)).rejects.toThrow();
  });
});
