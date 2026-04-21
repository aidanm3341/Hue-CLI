import { describe, it, expect } from "bun:test";
import { buildFrame } from "./packet";

const TEST_UUID = "01234567-89ab-cdef-0123-456789abcdef";

describe("buildFrame", () => {
  it("has correct magic bytes", () => {
    const frame = buildFrame(TEST_UUID, 0, []);
    expect(frame.slice(0, 9).toString("ascii")).toBe("HueStream");
  });

  it("has correct version bytes", () => {
    const frame = buildFrame(TEST_UUID, 0, []);
    expect(frame[9]).toBe(0x02);
    expect(frame[10]).toBe(0x00);
  });

  it("encodes sequence number", () => {
    expect(buildFrame(TEST_UUID, 42, [])[11]).toBe(42);
    expect(buildFrame(TEST_UUID, 255, [])[11]).toBe(255);
    expect(buildFrame(TEST_UUID, 256, [])[11]).toBe(0); // wraps
  });

  it("has RGB color space byte", () => {
    const frame = buildFrame(TEST_UUID, 0, []);
    expect(frame[14]).toBe(0x00);
  });

  it("encodes UUID at offset 16", () => {
    const frame = buildFrame(TEST_UUID, 0, []);
    expect(frame.slice(16, 52).toString("ascii")).toBe(TEST_UUID);
  });

  it("header is 52 bytes with no channels", () => {
    const frame = buildFrame(TEST_UUID, 0, []);
    expect(frame.length).toBe(52);
  });

  it("encodes channel correctly", () => {
    const frame = buildFrame(TEST_UUID, 0, [
      { channelId: 3, r: 0x1234, g: 0x5678, b: 0x9abc },
    ]);
    expect(frame.length).toBe(52 + 7);
    expect(frame[52]).toBe(3); // channel id
    expect(frame.readUInt16BE(53)).toBe(0x1234); // R
    expect(frame.readUInt16BE(55)).toBe(0x5678); // G
    expect(frame.readUInt16BE(57)).toBe(0x9abc); // B
  });

  it("encodes multiple channels in order", () => {
    const frame = buildFrame(TEST_UUID, 0, [
      { channelId: 0, r: 65535, g: 0, b: 0 },
      { channelId: 1, r: 0, g: 65535, b: 0 },
      { channelId: 2, r: 0, g: 0, b: 65535 },
    ]);
    expect(frame.length).toBe(52 + 21);
    // Channel 1: green only
    expect(frame.readUInt16BE(52 + 7 + 1)).toBe(0);     // R
    expect(frame.readUInt16BE(52 + 7 + 3)).toBe(65535);  // G
    expect(frame.readUInt16BE(52 + 7 + 5)).toBe(0);     // B
  });
});
