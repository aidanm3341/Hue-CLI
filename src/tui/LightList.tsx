import React from "react";
import { Box, Text } from "ink";
import type { HueLight } from "../hue/types";
import { xyToHex } from "../hue/colors";

interface Props {
  lights: HueLight[];
  selectedIndex: number;
}

function ColorSwatch({ light }: { light: HueLight }) {
  const hex = light.color
    ? xyToHex(
        light.color.xy.x,
        light.color.xy.y,
        (light.dimming?.brightness ?? 100) / 100,
      )
    : "#FFFFFF";
  return <Text backgroundColor={hex}>{"  "}</Text>;
}

export default function LightList({ lights, selectedIndex }: Props) {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} width={40}>
      <Text bold color="white"> Lights</Text>
      {lights.map((light, i) => {
        const selected = i === selectedIndex;
        const on = light.on.on;
        return (
          <Box key={light.id} flexDirection="row" gap={1}>
            <Text color={selected ? "cyan" : undefined} inverse={selected}>
              {on ? "●" : "○"}
            </Text>
            <ColorSwatch light={light} />
            <Text color={selected ? "cyan" : undefined} inverse={selected} wrap="truncate">
              {light.metadata.name}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
