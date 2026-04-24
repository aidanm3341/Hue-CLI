import { Command } from "commander";
import { runSetup } from "./commands/setup";
import { runList } from "./commands/list";
import { runOn, runOff, runToggle } from "./commands/power";
import { runColor } from "./commands/color";
import { runBrightness } from "./commands/brightness";
import { runStatus } from "./commands/status";
import { runRooms } from "./commands/rooms";
import { runScenes, runScene } from "./commands/scenes";
import { runEffect } from "./commands/effect";
import { runEffects } from "./commands/effects";
import { runEntertainmentList, runEntertainmentSelect } from "./commands/entertainment";
import { runScreen } from "./commands/screen";
import { runTui } from "./commands/tui";

const program = new Command();

program
  .name("hue")
  .description("Philips Hue CLI — control your lights from the terminal")
  .version("0.1.0");

program
  .command("setup")
  .description("Pair with your Hue bridge")
  .option("--key <appkey>", "Use an existing app key instead of pairing")
  .option("--ip <address>", "Bridge IP address (skips auto-discovery)")
  .option("--client-key <key>", "Save an existing Entertainment API client key")
  .option("--reauth", "Re-pair to generate a client key for Entertainment streaming")
  .action((opts) => runSetup(opts));

program
  .command("list")
  .description("List all lights")
  .option("--json", "Output raw JSON")
  .action((opts) => runList(opts));

program
  .command("on [target]")
  .description("Turn lights on (name, id, room name, or 'all')")
  .action(runOn);

program
  .command("off [target]")
  .description("Turn lights off")
  .action(runOff);

program
  .command("toggle [target]")
  .description("Toggle lights on/off")
  .action(runToggle);

program
  .command("color <color> [target]")
  .description("Set light colour (hex #RRGGBB or name: red, blue, warm, cool, ...)")
  .action(runColor);

program
  .command("brightness <value> [target]")
  .description("Set brightness 0–100")
  .action(runBrightness);

program
  .command("effect <name>")
  .description("Start a light effect by name (see 'hue effects' for the full list)")
  .option("--duration <s>", "Auto-stop after N seconds")
  .option("--bpm <n>", "Beats per minute for tempo-synced effects", "120")
  .option("--intensity <level>", "Effect intensity: low, medium, high, storm (lightning)")
  .option("--rate <hz>", "Flash rate in Hz (strobe)", "2")
  .option("--safe", "Clamp strobe rate to 3 Hz safety threshold")
  .option("--color <hex>", "Primary colour for applicable effects")
  .option("--no-warn", "Suppress photosensitivity warning")
  .option("--dry-run", "Preview first 10 frames without connecting to bridge")
  .action((name, opts) => runEffect(name, opts));

program
  .command("effects")
  .description("List all available effects")
  .action(runEffects);

const entertainment = program
  .command("entertainment")
  .description("Manage Entertainment API configurations");

entertainment
  .command("list")
  .description("List available entertainment configurations")
  .option("--json", "Output raw JSON")
  .action((opts) => runEntertainmentList(opts));

entertainment
  .command("select <name>")
  .description("Select an entertainment configuration by name or ID")
  .action((name) => runEntertainmentSelect(name));

program
  .command("status")
  .description("Pretty light status with colour swatches")
  .option("--json", "Output raw JSON")
  .action((opts) => runStatus(opts));

program
  .command("rooms")
  .description("List all rooms with light count and state")
  .option("--json", "Output raw JSON")
  .action((opts) => runRooms(opts));

program
  .command("scenes")
  .description("List all scenes")
  .option("--room <name>", "Filter by room name")
  .option("--json", "Output raw JSON")
  .action((opts) => runScenes(opts));

program
  .command("scene <name>")
  .description("Activate a scene by name or id")
  .option("--room <name>", "Disambiguate by room name")
  .action((name, opts) => runScene(name, opts));

program
  .command("screen")
  .description("Sync lights to screen colours in real-time (Ambilight-style)")
  .option("--interval <ms>", "Capture interval in milliseconds", "100")
  .option("--mode <mode>", "spatial (default) or average", "spatial")
  .option("--smooth", "Smooth colour transitions between captures")
  .option("--display <n>", "Display index to capture", "1")
  .option("--duration <s>", "Auto-stop after N seconds")
  .action((opts) => runScreen(opts));

program
  .command("tui")
  .description("Launch interactive TUI dashboard")
  .action(runTui);

// Default to TUI when called with no subcommand
if (process.argv.length <= 2) {
  process.argv.push("tui");
}

program.parse();
