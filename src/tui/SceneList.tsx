import React from "react";
import { Box, Text } from "ink";
import type { HueScene, HueRoom } from "../hue/types";

interface Props {
  scenes: HueScene[];
  rooms: HueRoom[];
  selectedIndex: number;
  lastActivated: string | null;
}

export default function SceneList({ scenes, rooms, selectedIndex, lastActivated }: Props) {
  const roomMap = new Map(rooms.map((r) => [r.id, r.metadata.name]));

  // Sort by room then name
  const sorted = scenes
    .slice()
    .sort((a, b) => {
      const ra = roomMap.get(a.group.rid) ?? "";
      const rb = roomMap.get(b.group.rid) ?? "";
      return ra.localeCompare(rb) || a.metadata.name.localeCompare(b.metadata.name);
    });

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} width={78}>
      <Text bold color="white"> Scenes</Text>
      {sorted.map((scene, i) => {
        const selected = i === selectedIndex;
        const roomName = roomMap.get(scene.group.rid) ?? "—";
        const isActive = scene.id === lastActivated;
        return (
          <Box key={scene.id} flexDirection="row" gap={2}>
            <Text
              color={selected ? "cyan" : isActive ? "green" : undefined}
              inverse={selected}
              wrap="truncate"
            >
              {isActive ? "✓ " : "  "}
              {roomName.padEnd(20).slice(0, 20)}  {scene.metadata.name}
            </Text>
          </Box>
        );
      })}
      <Box marginTop={1}>
        <Text dimColor>↑/↓ navigate   Enter activate   1/2/3 switch view</Text>
      </Box>
    </Box>
  );
}
