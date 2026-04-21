import type { Config } from "../config";
import { startEntertainmentStream, stopEntertainmentStream } from "../hue/api";
import { DtlsSocket } from "./client";
import { buildFrame, type ChannelColor } from "./packet";
import type { EffectFn, ChannelInfo } from "./effects/types";

export type { ChannelInfo };

const FPS = 50;
const FRAME_MS = 1000 / FPS;

export class EntertainmentSession {
  private socket: DtlsSocket | null = null;
  private seq = 0;
  private _stopped = false;

  constructor(
    private readonly cfg: Config & { clientKey: string; entertainmentConfigId: string },
    private readonly channels: ChannelInfo[],
  ) {}

  async start(): Promise<void> {
    await startEntertainmentStream(this.cfg, this.cfg.entertainmentConfigId);
    this.socket = new DtlsSocket(this.cfg.bridgeIp, this.cfg.appKey, this.cfg.clientKey);
    await this.socket.connect();
  }

  sendFrame(colors: ChannelColor[]): void {
    if (!this.socket || this._stopped) return;
    const frame = buildFrame(this.cfg.entertainmentConfigId, this.seq++ & 0xff, colors);
    this.socket.send(frame);
  }

  async stop(): Promise<void> {
    this._stopped = true;
    this.socket?.close();
    this.socket = null;
    await stopEntertainmentStream(this.cfg, this.cfg.entertainmentConfigId).catch(() => {});
  }

  get stopped(): boolean { return this._stopped; }

  async run(effectFn: EffectFn, durationMs?: number): Promise<void> {
    let tick = 0;
    const startMs = Date.now();

    while (!this._stopped) {
      const frameStart = Date.now();

      this.sendFrame(effectFn(tick, this.channels));
      tick++;

      if (durationMs !== undefined && Date.now() - startMs >= durationMs) break;

      const elapsed = Date.now() - frameStart;
      const wait = Math.max(0, FRAME_MS - elapsed);
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
    }
  }
}

export function dryRunPreview(effectFn: EffectFn, channels: ChannelInfo[], frames = 10): void {
  console.log(`Dry-run preview (first ${frames} frames at ${FPS}fps):`);
  console.log(`${"Frame".padEnd(6)}  Channels`);
  console.log("-".repeat(60));
  for (let i = 0; i < frames; i++) {
    const cols = effectFn(i, channels).map(c =>
      `ch${c.channelId}(${c.r},${c.g},${c.b})`
    ).join("  ");
    console.log(`${String(i).padEnd(6)}  ${cols}`);
  }
}
