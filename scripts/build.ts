#!/usr/bin/env bun
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const out = resolve(root, "hue");

// Build — use process.execPath so the script finds bun regardless of PATH
const bunBin = process.execPath;
const build = Bun.spawnSync(
  [
    bunBin, "build",
    "--compile", "--minify",
    "--outfile", out,
    "./src/cli.ts",
  ],
  { cwd: root, stdout: "inherit", stderr: "inherit" },
);
if (build.exitCode !== 0) process.exit(build.exitCode ?? 1);

// Ad-hoc sign with JIT entitlements (required on macOS Sequoia for Bun compiled binaries)
if (process.platform === "darwin") {
  const entitlements = resolve(root, "scripts/entitlements.plist");
  // --remove-signature is a no-op if there's no existing signature; ignore exit code
  Bun.spawnSync(["codesign", "--remove-signature", out]);
  const sign = Bun.spawnSync(
    ["codesign", "--sign", "-", "--force", "--entitlements", entitlements, out],
    { stdout: "inherit", stderr: "inherit" },
  );
  if (sign.exitCode !== 0) {
    console.error("codesign failed");
    process.exit(1);
  }
  console.log("Signed OK");
}

console.log(`Built: ${out}`);
