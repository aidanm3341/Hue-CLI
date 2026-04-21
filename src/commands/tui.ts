import React from "react";
import { render } from "ink";
import { loadConfig, requireConfig } from "../config";
import App from "../tui/App";

export async function runTui(): Promise<void> {
  const cfg = await loadConfig();
  requireConfig(cfg);
  render(React.createElement(App, { cfg }));
}
