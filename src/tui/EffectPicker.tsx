import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

const EFFECTS = [
  { id: "lightning",      label: "Lightning",       description: "Flickering storm flashes" },
  { id: "fire",           label: "Fire",             description: "Organic orange-red flicker" },
  { id: "candle",         label: "Candle",           description: "Warm amber flicker" },
  { id: "strobe",         label: "Strobe",           description: "Rapid flash ⚠ photosensitive" },
  { id: "police",         label: "Police",           description: "Alternating red/blue" },
  { id: "rave",           label: "Rave",             description: "Rainbow colour cycle" },
  { id: "beatdrop",       label: "Beat Drop",        description: "Pulse on each beat" },
  { id: "wave",           label: "Wave",             description: "Brightness ripple across room" },
  { id: "spotlight",      label: "Spotlight",        description: "Moving white spotlight" },
  { id: "breathe",        label: "Breathe",          description: "Slow sine-wave pulse" },
  { id: "northernlights", label: "Northern Lights",  description: "Slow aurora drift" },
  { id: "sunrise",        label: "Sunrise",          description: "5-min warm→daylight fade" },
  { id: "sunset",         label: "Sunset",           description: "5-min daylight→warm fade" },
] as const;

interface Props {
  onSelect: (effectId: string) => void;
  onCancel: () => void;
  onStop: () => void;
  streamingEffect: string | null;
}

export default function EffectPicker({ onSelect, onCancel, onStop, streamingEffect }: Props) {
  const [idx, setIdx] = useState(0);

  useInput((input, key) => {
    if (key.upArrow)   setIdx(i => Math.max(0, i - 1));
    if (key.downArrow) setIdx(i => Math.min(EFFECTS.length - 1, i + 1));
    if (key.return)    onSelect(EFFECTS[idx]!.id);
    if (key.escape)    onCancel();
    if (input === "s" && streamingEffect) onStop();
  }, { isActive: true });

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="yellow"
      paddingX={2}
      paddingY={1}
      width={58}
      marginTop={1}
    >
      <Text bold color="yellow"> Effects</Text>
      <Box marginTop={1} flexDirection="column">
        {EFFECTS.map((e, i) => {
          const selected = i === idx;
          const active = streamingEffect === e.id;
          return (
            <Box key={e.id} flexDirection="row" gap={2}>
              <Text color={active ? "green" : selected ? "cyan" : undefined} inverse={selected}>
                {active ? "◉ " : "  "}{e.label.padEnd(14)}
              </Text>
              <Text dimColor>{e.description}</Text>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>↑/↓ navigate   Enter activate   Esc close{streamingEffect ? "   s stop" : ""}</Text>
      </Box>
    </Box>
  );
}
