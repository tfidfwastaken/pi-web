/**
 * WebSocket server that bridges browser connections to pi RPC instances
 */

import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import { PiSession } from "./session.js";
import type { WsClientMessage, WsServerMessage } from "@pi-web/shared";

export interface ServerOptions {
  port: number;
  host?: string;
  defaultCwd?: string;
  piCommand?: string;
}

export interface ServerInstance {
  close: () => Promise<void>;
  address: () => { port: number; host: string } | null;
}

interface ClientConnection {
  id: string;
  ws: WebSocket;
  session: PiSession | null;
  cwd: string | null;
}

export function createServer(options: ServerOptions): ServerInstance {
  const { port, host = "0.0.0.0", defaultCwd, piCommand } = options;

  const wss = new WebSocketServer({ port, host });
  const clients = new Map<string, ClientConnection>();

  console.log(`[server] Starting WebSocket server on ${host}:${port}`);

  wss.on("connection", (ws: WebSocket) => {
    const clientId = randomUUID();
    const client: ClientConnection = {
      id: clientId,
      ws,
      session: null,
      cwd: null,
    };
    clients.set(clientId, client);

    console.log(`[server] Client connected: ${clientId}`);

    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WsClientMessage;
        await handleClientMessage(client, message, { defaultCwd, piCommand });
      } catch (error) {
        console.error(`[server] Error handling message from ${clientId}:`, error);
        sendToClient(ws, {
          type: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    ws.on("close", () => {
      console.log(`[server] Client disconnected: ${clientId}`);
      if (client.session) {
        client.session.close();
      }
      clients.delete(clientId);
    });

    ws.on("error", (error) => {
      console.error(`[server] WebSocket error for ${clientId}:`, error);
    });
  });

  wss.on("error", (error) => {
    console.error("[server] WebSocket server error:", error);
  });

  return {
    close: () =>
      new Promise((resolve) => {
        // Close all client sessions first
        for (const client of clients.values()) {
          if (client.session) {
            client.session.close();
          }
          client.ws.close();
        }
        clients.clear();

        wss.close(() => {
          console.log("[server] Server closed");
          resolve();
        });
      }),

    address: () => {
      const addr = wss.address();
      if (typeof addr === "string" || !addr) return null;
      return { port: addr.port, host: addr.address };
    },
  };
}

async function handleClientMessage(
  client: ClientConnection,
  message: WsClientMessage,
  options: { defaultCwd?: string; piCommand?: string }
): Promise<void> {
  // Handle connect message - spawn pi process
  if (message.type === "connect") {
    if (client.session?.isActive()) {
      sendToClient(client.ws, {
        type: "error",
        message: "Already connected to a session",
      });
      return;
    }

    // Expand ~ to home directory
    let cwd = message.cwd || options.defaultCwd || process.cwd();
    if (cwd.startsWith("~")) {
      cwd = cwd.replace("~", process.env.HOME || "");
    }
    client.cwd = cwd;

    console.log(`[server] Creating session for ${client.id} in ${cwd}`);

    const session = new PiSession({
      cwd,
      piCommand: options.piCommand,
      onMessage: (msg) => {
        sendToClient(client.ws, msg);
      },
      onClose: (code) => {
        console.log(`[server] Pi process closed with code ${code} for ${client.id}`);
        sendToClient(client.ws, {
          type: "disconnected",
          reason: `Pi process exited with code ${code}`,
        });
        client.session = null;
      },
      onError: (error) => {
        console.error(`[server] Pi process error for ${client.id}:`, error);
        sendToClient(client.ws, {
          type: "error",
          message: error.message,
        });
      },
    });

    try {
      await session.spawn();
      client.session = session;

      sendToClient(client.ws, {
        type: "connected",
        sessionId: client.id,
      });

      console.log(`[server] Session created for ${client.id}`);
    } catch (error) {
      console.error(`[server] Failed to spawn pi for ${client.id}:`, error);
      sendToClient(client.ws, {
        type: "error",
        message: error instanceof Error ? error.message : "Failed to spawn pi",
      });
    }

    return;
  }

  // All other messages require an active session
  if (!client.session?.isActive()) {
    sendToClient(client.ws, {
      type: "error",
      message: "Not connected to a session. Send a 'connect' message first.",
    });
    return;
  }

  // Forward the message to the pi process
  client.session.send(JSON.stringify(message));
}

function sendToClient(ws: WebSocket, message: WsServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}
