import React from "react";
import { Box, Text } from "ink";
import type { HueRoom, HueLight } from "../hue/types";

interface Props {
  room: HueRoom | null;
  lights: HueLight[];
}

export default function RoomControls({ room, lights }: Props) {
  if (!room) {
    return (
      <Box borderStyle="single" borderColor="gray" paddingX={2} width={38} alignItems="center" justifyContent="center">
        <Text dimColor>No room selected</Text>
      </Box>
    );
  }

  const lightMap = new Map(lights.map((l) => [l.id, l]));
  const childLights = room.children
    .filter((c) => c.rtype === "light")
    .map((c) => lightMap.get(c.rid))
    .filter(Boolean) as HueLight[];

  const onLights = childLights.filter((l) => l.on.on);
  const avgBri = onLights.length > 0
    ? Math.round(onLights.reduce((s, l) => s + (l.dimming?.brightness ?? 100), 0) / onLights.length)
    : 0;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={2} paddingY={1} width={38}>
      <Text bold>{room.metadata.name}</Text>
      <Box marginTop={1}>
        <Text dimColor>{onLights.length}/{childLights.length} lights on</Text>
        {onLights.length > 0 && <Text dimColor>  avg {avgBri}%</Text>}
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {childLights.map((light) => {
          const on = light.on.on;
          const bri = light.dimming?.brightness ?? 100;
          return (
            <Box key={light.id} flexDirection="row" gap={1}>
              <Text color={on ? "green" : "gray"}>{on ? "●" : "○"}</Text>
              <Text wrap="truncate">{light.metadata.name}</Text>
              {on && <Text dimColor>{Math.round(bri)}%</Text>}
            </Box>
          );
        })}
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>────────────────────────────────</Text>
        <Text dimColor>space  toggle room on/off</Text>
        <Text dimColor>1/2/3  switch view</Text>
      </Box>
    </Box>
  );
}
