#!/usr/bin/env node

/**
 * CLI entry point for the pi-web server
 */

import "dotenv/config";
import { createServer } from "./server.js";

const port = parseInt(process.env.PORT ?? "3001", 10);
const host = process.env.HOST ?? "0.0.0.0";
const defaultCwd = process.env.PI_CWD ?? process.cwd();
const piCommand = process.env.PI_COMMAND ?? "pi";

console.log(`
╔═══════════════════════════════════════╗
║          Pi Web Server                ║
╚═══════════════════════════════════════╝

Configuration:
  Port:        ${port}
  Host:        ${host}
  Default CWD: ${defaultCwd}
  Pi Command:  ${piCommand}
`);

const server = createServer({
  port,
  host,
  defaultCwd,
  piCommand,
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`\n[server] Received ${signal}, shutting down...`);
  server.close().then(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Log when ready
const addr = server.address();
if (addr) {
  console.log(`[server] Listening on ws://${addr.host}:${addr.port}`);
}
