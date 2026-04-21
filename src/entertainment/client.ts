// DTLS-PSK socket wrapper for Hue Entertainment streaming
// Uses node-dtls-client (TLS_PSK_WITH_AES_128_GCM_SHA256, DTLS 1.2)

import { dtls } from "node-dtls-client";

export class DtlsSocket {
  private socket: dtls.Socket | null = null;

  constructor(
    private readonly bridgeIp: string,
    private readonly appKey: string,
    private readonly clientKey: string, // hex string
  ) {}

  connect(timeoutMs = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("DTLS connection timed out"));
      }, timeoutMs);

      try {
        this.socket = dtls.createSocket({
          type: "udp4",
          address: this.bridgeIp,
          port: 2100,
          psk: { [this.appKey]: Buffer.from(this.clientKey, "hex") },
          ciphers: ["TLS_PSK_WITH_AES_128_GCM_SHA256"],
          timeout: timeoutMs,
        });
      } catch (e) {
        clearTimeout(timer);
        reject(e);
        return;
      }

      this.socket.once("connected", () => {
        clearTimeout(timer);
        resolve();
      });

      this.socket.once("error", (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  send(data: Buffer): void {
    if (!this.socket) return;
    // Fire-and-forget for 50fps frames — errors dropped intentionally
    this.socket.send(data, () => {});
  }

  close(): void {
    if (this.socket) {
      try { this.socket.close(); } catch { /* already closed */ }
      this.socket = null;
    }
  }

  get isConnected(): boolean {
    return this.socket !== null;
  }
}
