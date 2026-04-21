// HueStream v2.0 binary frame builder
// Frame layout (bytes):
//   0–8    "HueStream" magic (9 bytes ASCII)
//   9      version major = 0x02
//   10     version minor = 0x00
//   11     sequence number (0–255 wrapping)
//   12–13  reserved 0x00 0x00
//   14     color space: 0x00 = RGB
//   15     reserved 0x00
//   16–51  entertainment config UUID (36 bytes ASCII)
//   52+    N × 7 bytes: 1B channel_id + 2B R (BE) + 2B G (BE) + 2B B (BE)

export interface ChannelColor {
  channelId: number;
  r: number; // 0–65535
  g: number;
  b: number;
}

const MAGIC = Buffer.from("HueStream", "ascii");
const HEADER_SIZE = 52;

export function buildFrame(
  entertainmentConfigId: string,
  seq: number,
  channels: ChannelColor[],
): Buffer {
  const header = Buffer.alloc(HEADER_SIZE, 0);
  MAGIC.copy(header, 0);
  header[9] = 0x02;
  header[10] = 0x00;
  header[11] = seq & 0xff;
  // bytes 12–13: reserved (already 0)
  header[14] = 0x00; // RGB color space
  // byte 15: reserved (already 0)
  const uuidStr = entertainmentConfigId.slice(0, 36).padEnd(36, "\0");
  Buffer.from(uuidStr, "ascii").copy(header, 16);

  const channelBuf = Buffer.alloc(channels.length * 7);
  for (let i = 0; i < channels.length; i++) {
    const off = i * 7;
    const ch = channels[i]!;
    channelBuf[off] = ch.channelId & 0xff;
    channelBuf.writeUInt16BE(ch.r, off + 1);
    channelBuf.writeUInt16BE(ch.g, off + 3);
    channelBuf.writeUInt16BE(ch.b, off + 5);
  }

  return Buffer.concat([header, channelBuf]);
}
