import React from "react";
import { Box, Text } from "ink";
import type { HueRoom, HueLight } from "../hue/types";

interface Props {
  rooms: HueRoom[];
  lights: HueLight[];
  selectedIndex: number;
}

export default function RoomList({ rooms, lights, selectedIndex }: Props) {
  const lightMap = new Map(lights.map((l) => [l.id, l]));

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} width={40}>
      <Text bold color="white"> Rooms</Text>
      {rooms.map((room, i) => {
        const selected = i === selectedIndex;
        const childLights = room.children
          .filter((c) => c.rtype === "light")
          .map((c) => lightMap.get(c.rid))
          .filter(Boolean) as HueLight[];
        const on = childLights.some((l) => l.on.on);
        const onCount = childLights.filter((l) => l.on.on).length;

        return (
          <Box key={room.id} flexDirection="row" gap={1}>
            <Text color={selected ? "cyan" : undefined} inverse={selected}>
              {on ? "●" : "○"}
            </Text>
            <Text color={selected ? "cyan" : undefined} inverse={selected} wrap="truncate">
              {room.metadata.name}
            </Text>
            <Text dimColor>{onCount}/{childLights.length}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
