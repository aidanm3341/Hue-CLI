import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { NAMED_COLORS, resolveColor } from "../hue/colors";

interface Props {
  onSelect: (xy: { x: number; y: number }) => void;
  onCancel: () => void;
}

const PALETTE = Object.entries(NAMED_COLORS);

export default function ColorPicker({ onSelect, onCancel }: Props) {
  const [hexInput, setHexInput] = useState("");
  const [error, setError] = useState("");
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [mode, setMode] = useState<"palette" | "hex">("palette");

  useInput((input, key) => {
    if (key.escape) { onCancel(); return; }

    if (mode === "palette") {
      if (key.leftArrow) setPaletteIdx((i) => Math.max(0, i - 1));
      if (key.rightArrow) setPaletteIdx((i) => Math.min(PALETTE.length - 1, i + 1));
      if (key.upArrow) setPaletteIdx((i) => Math.max(0, i - 4));
      if (key.downArrow) setPaletteIdx((i) => Math.min(PALETTE.length - 1, i + 4));
      if (key.return) {
        try {
          onSelect(resolveColor(PALETTE[paletteIdx][0]));
        } catch { /* ignore */ }
      }
      if (input === "h") { setMode("hex"); }
    }
  });

  function handleHexSubmit(val: string) {
    try {
      onSelect(resolveColor(val));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid colour");
    }
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      width={50}
    >
      <Text bold color="cyan">Colour Picker  </Text>
      <Text dimColor>↑↓←→ navigate  Enter select  h for hex  Esc cancel</Text>
      <Box flexDirection="row" flexWrap="wrap" marginTop={1}>
        {PALETTE.map(([name, hex], i) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          const selected = i === paletteIdx && mode === "palette";
          return (
            <Box key={name} flexDirection="row">
              <Text color={selected ? "cyan" : undefined}>{selected ? "[" : " "}</Text>
              <Text backgroundColor={hex}>{"  "}</Text>
              <Text color={selected ? "cyan" : undefined}>{selected ? "]" : " "}</Text>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        {PALETTE[paletteIdx] && (
          <Text>Selected: <Text bold>{PALETTE[paletteIdx][0]}</Text> ({PALETTE[paletteIdx][1]})</Text>
        )}
      </Box>
      <Box marginTop={1}>
        <Text>Hex: </Text>
        <TextInput
          value={hexInput}
          onChange={setHexInput}
          onSubmit={handleHexSubmit}
          placeholder="#RRGGBB"
          focus={mode === "hex"}
        />
      </Box>
      {error && <Text color="red">{error}</Text>}
    </Box>
  );
}
