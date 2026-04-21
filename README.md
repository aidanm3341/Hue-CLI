# hue

A fast, keyboard-driven CLI and terminal dashboard for controlling Philips Hue lights.

- Fire-and-forget commands for lights, rooms, and scenes
- Real-time TUI dashboard with colour pickers and live status
- Entertainment API streaming for high-framerate lighting effects (lightning, fire, rave, and more)

---

## Installation

Requires [Bun](https://bun.sh).

```sh
git clone <repo>
cd hue
bun install
bun run install:global   # builds binary and copies to ~/.local/bin/hue
```

To rebuild and reinstall after changes:

```sh
bun run install:global
```

---

## Setup

### Pairing with a new bridge

```sh
hue setup
```

Auto-discovers your bridge on the local network. If multiple bridges are found you'll be prompted to confirm. Press the physical link button on the bridge when asked, then press Enter.

Provide the IP directly to skip discovery:

```sh
hue setup --ip 192.168.1.42
```

If you already have an app key (e.g. from the Hue app or a previous install):

```sh
hue setup --key YOUR_APP_KEY --ip 192.168.1.42
```

Config is saved to `~/.config/hue-cli/config.json`.

### Enabling the Entertainment streaming API

The Entertainment API streams lighting effects directly to the bridge over DTLS at up to 50 fps. It requires a separate client key obtained by re-pairing:

```sh
hue setup --reauth
```

Press the link button when prompted. The tool will generate a client key, detect your Entertainment Areas, and let you choose one if multiple exist.

If you already have a client key:

```sh
hue setup --client-key YOUR_CLIENT_KEY
```

---

## Lights

### Listing lights

```sh
hue list
hue list --json
```

### Turning lights on and off

```sh
hue on                    # all lights
hue off                   # all lights
hue toggle                # all lights

hue on "desk lamp"        # by name (substring match, case-insensitive)
hue off "living room"     # by room name
hue toggle ab12cd34       # by light ID
```

### Setting colour

```sh
hue color red
hue color warm
hue color "#FF6A00"
hue color blue "desk lamp"
hue color cool "living room"
```

Named colours: `red`, `green`, `blue`, `warm`, `cool`, `purple`, `orange`, `pink`, `white`, `yellow`.

### Setting brightness

```sh
hue brightness 80           # all lights, 80%
hue brightness 40 "desk lamp"
hue brightness 100 "living room"
```

### Status overview

```sh
hue status
hue status --json
```

Prints a table with colour swatches, on/off state, and brightness for every light.

---

## Rooms

```sh
hue rooms
hue rooms --json
```

Lists all rooms with the number of lights on and average brightness.

---

## Scenes

### Listing scenes

```sh
hue scenes
hue scenes --room "living room"
hue scenes --json
```

### Activating a scene

```sh
hue scene "Energize"
hue scene "Relax" --room "bedroom"   # disambiguate when the name exists in multiple rooms
```

---

## Effects

Effects require the Entertainment streaming API to be configured (see [Setup](#enabling-the-entertainment-streaming-api)). `rave` falls back to the REST API if streaming is not available.

### Listing effects

```sh
hue effects
```

```
Name             Description
------------------------------------------------------------
lightning        Flickering storm flashes ⚠
fire             Organic orange-red flicker
candle           Warm amber flicker
strobe           Rapid on/off flash ⚠
police           Alternating red/blue pairs ⚠
rave             Rainbow colour cycle
beatdrop         Pulse on each beat, hue shifts per bar
wave             Brightness ripple across room
spotlight        White spotlight crossfading between channels
breathe          Slow sine-wave brightness pulse
northernlights   Slow aurora drift through cyan/teal/purple
sunrise          5-minute warm-to-daylight fade
sunset           5-minute daylight-to-warm fade

⚠  = contains flashing lights (photosensitivity risk)
```

### Starting an effect

```sh
hue effect fire
hue effect rave
hue effect candle
hue effect northernlights
```

Press `Ctrl-C` to stop.

Auto-stop after a set duration:

```sh
hue effect breathe --duration 30    # stop after 30 seconds
hue effect sunrise --duration 600   # 10-minute sunrise
```

### Effect options

| Flag | Effects | Description |
|---|---|---|
| `--duration <s>` | all | Auto-stop after N seconds |
| `--bpm <n>` | `rave`, `beatdrop` | Beats per minute (default: 120) |
| `--intensity <level>` | `lightning` | `low`, `medium`, `high`, `storm` (default: medium) |
| `--rate <hz>` | `strobe` | Flash rate in Hz (default: 2) |
| `--safe` | `strobe` | Clamp rate to 3 Hz safety threshold |
| `--color <hex>` | `strobe`, `breathe`, `wave` | Primary colour |
| `--no-warn` | flashing effects | Suppress photosensitivity warning |
| `--dry-run` | all | Print first 10 frames as a table; no bridge connection |

```sh
hue effect lightning --intensity storm
hue effect strobe --rate 4 --color "#FF0000"
hue effect strobe --safe                      # capped at 3 Hz
hue effect rave --bpm 140
hue effect wave --color "#00BFFF"
hue effect beatdrop --bpm 128
hue effect sunrise --duration 300             # 5-minute sunrise
```

---

## Entertainment configurations

Hue Entertainment Areas define which lights are included in streaming effects and their spatial positions in the room. You create and edit these in the Hue app under **Settings → Entertainment Areas**.

```sh
hue entertainment list          # show all configured areas
hue entertainment select "TV"   # set the active area by name or ID
```

The active area is stored in your config and used by all `hue effect` commands.

---

## TUI dashboard

```sh
hue          # launches TUI by default when called with no arguments
hue tui
```

### Navigation

| Key | Action |
|---|---|
| `1` | Lights view |
| `2` | Rooms view |
| `3` | Scenes view |
| `↑` / `↓` | Navigate list |
| `q` | Quit |

### Lights view

| Key | Action |
|---|---|
| `space` | Toggle selected light on/off |
| `b` + `←` / `→` | Brightness ±10% |
| `c` | Open colour picker |
| `Esc` | Close colour picker |

The colour picker shows a palette of named colours and accepts a hex value. Selecting a colour applies it immediately and keeps the picker open so you can keep experimenting.

### Rooms view

| Key | Action |
|---|---|
| `space` | Toggle all lights in room on/off |

### Scenes view

| Key | Action |
|---|---|
| `Enter` | Activate selected scene |

### Effects (requires Entertainment API)

| Key | Action |
|---|---|
| `e` | Open effect picker |
| `l` | Start lightning |
| `r` | Start rave |
| `s` | Start strobe |
| `Esc` | Stop current effect |

The effect picker lets you browse all 13 effects with descriptions. A `◉ STREAMING: <name>` badge appears in the header while an effect is running.

---

## Configuration file

Located at `~/.config/hue-cli/config.json`.

```json
{
  "bridgeIp": "192.168.1.42",
  "appKey": "your-app-key",
  "clientKey": "your-client-key-hex",
  "entertainmentConfigId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "defaults": {
    "transitionMs": 200
  }
}
```

You can edit this file directly — for example to change the default transition time or swap in a different entertainment area.
