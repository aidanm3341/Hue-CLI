import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useInput, useApp } from "ink";
import type { Config } from "../config";
import type { HueLight, HueRoom, HueScene } from "../hue/types";
import { getLights, getRooms, getScenes, setGroupedLight, activateScene, getEntertainmentConfigs } from "../hue/api";
import LightList from "./LightList";
import LightControls from "./LightControls";
import RoomList from "./RoomList";
import RoomControls from "./RoomControls";
import SceneList from "./SceneList";
import EffectPicker from "./EffectPicker";
import { EntertainmentSession, type ChannelInfo } from "../entertainment/session";
import { makeRave } from "../entertainment/effects/rave";
import { makeLightning } from "../entertainment/effects/lightning";
import { makeStrobe } from "../entertainment/effects/strobe";
import { makeSunrise } from "../entertainment/effects/sunrise";
import { makeCandle } from "../entertainment/effects/candle";
import { makeBreathe } from "../entertainment/effects/breathe";
import { makeBeatDrop } from "../entertainment/effects/beatdrop";
import { makeWave } from "../entertainment/effects/wave";
import { makeSpotlight } from "../entertainment/effects/spotlight";
import { makePolice } from "../entertainment/effects/police";
import { makeFire } from "../entertainment/effects/fire";
import { makeNorthernLights } from "../entertainment/effects/northernlights";
import type { EffectFn } from "../entertainment/effects/types";

type Mode = "lights" | "rooms" | "scenes";
export type EffectName =
  | "lightning" | "rave" | "strobe"
  | "sunrise" | "sunset" | "candle" | "breathe"
  | "beatdrop" | "wave" | "spotlight" | "police" | "fire" | "northernlights"
  | null;

function buildEffect(name: EffectName): EffectFn | null {
  switch (name) {
    case "lightning":     return makeLightning({ intensity: "medium" });
    case "rave":          return makeRave({ mode: "rainbow", bpm: 120 });
    case "strobe":        return makeStrobe({ rateHz: 2 });
    case "sunrise":       return makeSunrise({ durationMs: 5 * 60 * 1000, direction: "rise" });
    case "sunset":        return makeSunrise({ durationMs: 5 * 60 * 1000, direction: "set" });
    case "candle":        return makeCandle();
    case "breathe":       return makeBreathe();
    case "beatdrop":      return makeBeatDrop({ bpm: 120 });
    case "wave":          return makeWave();
    case "spotlight":     return makeSpotlight();
    case "police":        return makePolice();
    case "fire":          return makeFire();
    case "northernlights":return makeNorthernLights();
    default:              return null;
  }
}

interface Props {
  cfg: Config;
}

export default function App({ cfg }: Props) {
  const { exit } = useApp();

  const [lights, setLights] = useState<HueLight[]>([]);
  const [rooms, setRooms] = useState<HueRoom[]>([]);
  const [scenes, setScenes] = useState<HueScene[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const [mode, setMode] = useState<Mode>("lights");
  const [lightIndex, setLightIndex] = useState(0);
  const [roomIndex, setRoomIndex] = useState(0);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [effectPickerOpen, setEffectPickerOpen] = useState(false);
  const [lastActivatedScene, setLastActivatedScene] = useState<string | null>(null);

  const [streamingEffect, setStreamingEffect] = useState<EffectName>(null);
  const sessionRef = useRef<EntertainmentSession | null>(null);
  const effectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refresh() {
    try {
      const [l, r, s] = await Promise.all([getLights(cfg), getRooms(cfg), getScenes(cfg)]);
      setLights(l);
      setRooms(r);
      setScenes(s);
      setLastRefresh(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, []);

  const stopEffect = useCallback(async () => {
    if (effectIntervalRef.current) {
      clearInterval(effectIntervalRef.current);
      effectIntervalRef.current = null;
    }
    if (sessionRef.current) {
      await sessionRef.current.stop();
      sessionRef.current = null;
    }
    setStreamingEffect(null);
  }, []);

  const startEffect = useCallback(async (effectName: EffectName) => {
    if (!effectName) return;
    if (!cfg.clientKey || !cfg.entertainmentConfigId) return;

    const effectFn = buildEffect(effectName);
    if (!effectFn) return;

    await stopEffect();

    try {
      const configs = await getEntertainmentConfigs(cfg);
      const entConfig = configs.find(c => c.id === cfg.entertainmentConfigId);
      if (!entConfig) return;

      const channels: ChannelInfo[] = entConfig.channels.map(c => ({
        channelId: c.channel_id,
        position: c.position,
      }));

      const session = new EntertainmentSession(
        cfg as Config & { clientKey: string; entertainmentConfigId: string },
        channels,
      );
      await session.start();
      sessionRef.current = session;

      let tick = 0;
      effectIntervalRef.current = setInterval(() => {
        session.sendFrame(effectFn(tick, channels));
        tick++;
      }, 20); // 50fps

      setStreamingEffect(effectName);
    } catch (e) {
      setError(`Effect failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [cfg, stopEffect]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (effectIntervalRef.current) clearInterval(effectIntervalRef.current);
      sessionRef.current?.stop();
    };
  }, []);

  // Sort scenes the same way SceneList does so sceneIndex lines up
  const roomMap = new Map(rooms.map((r) => [r.id, r.metadata.name]));
  const sortedScenes = scenes.slice().sort((a, b) => {
    const ra = roomMap.get(a.group.rid) ?? "";
    const rb = roomMap.get(b.group.rid) ?? "";
    return ra.localeCompare(rb) || a.metadata.name.localeCompare(b.metadata.name);
  });

  const anyOverlayOpen = pickerOpen || effectPickerOpen;

  useInput(async (input, key) => {
    if (anyOverlayOpen) return;

    if (input === "q" || (key.ctrl && input === "c")) { exit(); return; }
    if (input === "1") { setMode("lights"); return; }
    if (input === "2") { setMode("rooms"); return; }
    if (input === "3") { setMode("scenes"); return; }

    // Effect shortcuts (require entertainment config)
    if (cfg.clientKey && cfg.entertainmentConfigId) {
      if (input === "e") { setEffectPickerOpen(true); return; }
      if (input === "l") { await startEffect("lightning"); return; }
      if (input === "r") { await startEffect("rave"); return; }
      if (input === "s" && mode !== "scenes") { await startEffect("strobe"); return; }
      if (key.escape && streamingEffect) { await stopEffect(); return; }
    }

    if (mode === "lights") {
      if (key.upArrow) setLightIndex((i) => Math.max(0, i - 1));
      if (key.downArrow) setLightIndex((i) => Math.min(lights.length - 1, i + 1));
    }

    if (mode === "rooms") {
      if (key.upArrow) setRoomIndex((i) => Math.max(0, i - 1));
      if (key.downArrow) setRoomIndex((i) => Math.min(rooms.length - 1, i + 1));
      if (input === " ") {
        const room = rooms[roomIndex];
        if (!room) return;
        const svc = room.services.find((s) => s.rtype === "grouped_light");
        if (!svc) return;
        const lightMap = new Map(lights.map((l) => [l.id, l]));
        const anyOn = room.children
          .filter((c) => c.rtype === "light")
          .some((c) => lightMap.get(c.rid)?.on.on);
        await setGroupedLight(cfg, svc.rid, { on: { on: !anyOn } }).catch(() => {});
        refresh();
      }
    }

    if (mode === "scenes") {
      if (key.upArrow) setSceneIndex((i) => Math.max(0, i - 1));
      if (key.downArrow) setSceneIndex((i) => Math.min(sortedScenes.length - 1, i + 1));
      if (key.return) {
        const scene = sortedScenes[sceneIndex];
        if (!scene) return;
        await activateScene(cfg, scene.id).catch(() => {});
        setLastActivatedScene(scene.id);
        refresh();
      }
    }
  }, { isActive: !anyOverlayOpen });

  const hasEntertainment = !!(cfg.clientKey && cfg.entertainmentConfigId);

  const tabBar = (
    <Box gap={2} marginBottom={1}>
      <Text bold color="yellow">Hue CLI </Text>
      <Text dimColor>— {cfg.bridgeIp}  </Text>
      <Text color={mode === "lights" ? "cyan" : "gray"} bold={mode === "lights"} underline={mode === "lights"}>
        1 Lights
      </Text>
      <Text color={mode === "rooms" ? "cyan" : "gray"} bold={mode === "rooms"} underline={mode === "rooms"}>
        2 Rooms
      </Text>
      <Text color={mode === "scenes" ? "cyan" : "gray"} bold={mode === "scenes"} underline={mode === "scenes"}>
        3 Scenes
      </Text>
      {streamingEffect && (
        <Text color="yellow" bold> ◉ STREAMING: {streamingEffect}</Text>
      )}
      <Text dimColor>  {lastRefresh.toLocaleTimeString()}</Text>
    </Box>
  );

  return (
    <Box flexDirection="column">
      {tabBar}
      {error && <Text color="red">⚠ {error}</Text>}

      {mode === "lights" && (
        <Box flexDirection="row" gap={1}>
          <LightList lights={lights} selectedIndex={lightIndex} />
          <LightControls
            light={lights[lightIndex] ?? null}
            cfg={cfg}
            onUpdate={refresh}
            onPickerChange={setPickerOpen}
          />
        </Box>
      )}

      {mode === "rooms" && (
        <Box flexDirection="row" gap={1}>
          <RoomList rooms={rooms} lights={lights} selectedIndex={roomIndex} />
          <RoomControls room={rooms[roomIndex] ?? null} lights={lights} />
        </Box>
      )}

      {mode === "scenes" && (
        <SceneList
          scenes={scenes}
          rooms={rooms}
          selectedIndex={sceneIndex}
          lastActivated={lastActivatedScene}
        />
      )}

      {effectPickerOpen && (
        <EffectPicker
          onSelect={async (effect) => {
            setEffectPickerOpen(false);
            await startEffect(effect as EffectName);
          }}
          onCancel={() => setEffectPickerOpen(false)}
          streamingEffect={streamingEffect}
          onStop={async () => {
            setEffectPickerOpen(false);
            await stopEffect();
          }}
        />
      )}

      {mode !== "scenes" && !effectPickerOpen && (
        <Box marginTop={1}>
          <Text dimColor>
            {mode === "lights" ? "↑/↓ navigate   " : "↑/↓ navigate   space toggle room   "}
            1/2/3 switch view   q quit
            {hasEntertainment ? "   l/r/s effect   e picker   Esc stop" : ""}
          </Text>
        </Box>
      )}
    </Box>
  );
}
