import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { HueLight } from "../hue/types";
import type { Config } from "../config";
import { setLight } from "../hue/api";
import { xyToHex, hexToXy } from "../hue/colors";
import ColorPicker from "./ColorPicker";
import { hsvToHex } from "./utils";

interface Props {
  light: HueLight | null;
  cfg: Config;
  onUpdate: () => void;
  onPickerChange: (open: boolean) => void;
}

export default function LightControls({ light, cfg, onUpdate, onPickerChange }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [briMode, setBriMode] = useState(false);
  const [raving, setRaving] = useState(false);
  const [raveInterval, setRaveInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  function openPicker() {
    setShowPicker(true);
    onPickerChange(true);
  }

  function closePicker() {
    setShowPicker(false);
    onPickerChange(false);
  }

  useInput(async (input, key) => {
    if (!light) return;
    if (showPicker) return; // ColorPicker handles its own input

    if (input === " ") {
      await setLight(cfg, light.id, { on: { on: !light.on.on } }).catch(() => {});
      onUpdate();
    }

    if (input === "b") setBriMode((v) => !v);

    if (briMode) {
      const current = light.dimming?.brightness ?? 100;
      if (key.leftArrow) {
        const next = Math.max(1, current - 10);
        await setLight(cfg, light.id, { dimming: { brightness: next }, dynamics: { duration: cfg.defaults.transitionMs } }).catch(() => {});
        onUpdate();
      }
      if (key.rightArrow) {
        const next = Math.min(100, current + 10);
        await setLight(cfg, light.id, { dimming: { brightness: next }, dynamics: { duration: cfg.defaults.transitionMs } }).catch(() => {});
        onUpdate();
      }
    }

    if (input === "c") {
      openPicker();
    }

    if (input === "r") {
      if (raving) {
        if (raveInterval) clearInterval(raveInterval);
        setRaveInterval(null);
        setRaving(false);
      } else {
        setRaving(true);
        let tick = 0;
        const id = setInterval(async () => {
          const hex = hsvToHex((tick * 30) % 360, 1, 1);
          await setLight(cfg, light.id, {
            color: { xy: hexToXy(hex) },
            dynamics: { duration: 400 },
          }).catch(() => {});
          tick++;
        }, 500);
        setRaveInterval(id);
      }
    }
  });

  if (!light) {
    return (
      <Box borderStyle="single" borderColor="gray" paddingX={2} width={38} alignItems="center" justifyContent="center">
        <Text dimColor>No light selected</Text>
      </Box>
    );
  }

  const bri = light.dimming?.brightness ?? 100;
  const hex = light.color
    ? xyToHex(light.color.xy.x, light.color.xy.y, bri / 100)
    : "#FFFFFF";

  const briBar = "█".repeat(Math.round(bri / 10)) + "░".repeat(10 - Math.round(bri / 10));

  if (showPicker) {
    return (
      <ColorPicker
        onSelect={async (xy) => {
          await setLight(cfg, light.id, { color: { xy }, dynamics: { duration: cfg.defaults.transitionMs } }).catch(() => {});
          onUpdate();
        }}
        onCancel={closePicker}
      />
    );
  }

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={2} paddingY={1} width={38}>
      <Text bold>{light.metadata.name}</Text>
      <Box marginTop={1}>
        <Text>State: </Text>
        <Text color={light.on.on ? "green" : "gray"}>{light.on.on ? "ON" : "OFF"}</Text>
        {raving && <Text color="magenta"> ★ rave</Text>}
      </Box>
      <Box marginTop={1} flexDirection="row">
        <Text>Colour: </Text>
        <Text backgroundColor={hex}>{"  "}</Text>
        <Text> {hex}</Text>
      </Box>
      <Box marginTop={1}>
        <Text>Bri: {briBar} {Math.round(bri)}%</Text>
      </Box>
      <Box flexDirection="column" marginTop={1} gap={0}>
        <Text dimColor>────────────────────────────────</Text>
        <Text dimColor>space  toggle on/off</Text>
        <Text dimColor>b+←/→  brightness ±10{briMode ? " \x1b[33m[active]\x1b[0m" : ""}</Text>
        <Text dimColor>c      colour picker</Text>
        <Text dimColor>r      {raving ? "stop rave" : "mini rave"}</Text>
        <Text dimColor>q      quit</Text>
      </Box>
    </Box>
  );
}
