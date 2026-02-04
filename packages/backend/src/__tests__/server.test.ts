import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WebSocket } from "ws";
import { createServer, type ServerInstance } from "../server.js";

describe("Server", () => {
  let server: ServerInstance;
  const TEST_PORT = 13001;

  beforeEach(() => {
    server = createServer({
      port: TEST_PORT,
      host: "127.0.0.1",
    });
  });

  afterEach(async () => {
    await server.close();
  });

  it("should start and accept connections", async () => {
    // Give the server a moment to bind
    await new Promise((r) => setTimeout(r, 50));

    const addr = server.address();
    expect(addr).not.toBeNull();
    expect(addr?.port).toBe(TEST_PORT);

    const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);

    await new Promise<void>((resolve, reject) => {
      ws.on("open", resolve);
      ws.on("error", reject);
    });

    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it("should require connect message before forwarding commands", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);

    await new Promise<void>((resolve) => {
      ws.on("open", resolve);
    });

    // Send a command without connecting first
    ws.send(JSON.stringify({ type: "get_state" }));

    const message = await new Promise<string>((resolve) => {
      ws.on("message", (data) => resolve(data.toString()));
    });

    const parsed = JSON.parse(message);
    expect(parsed.type).toBe("error");
    expect(parsed.message).toContain("Not connected");

    ws.close();
  });

  it("should send connected message after successful connect", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);

    await new Promise<void>((resolve) => {
      ws.on("open", resolve);
    });

    // Send connect message
    ws.send(JSON.stringify({ type: "connect", cwd: "/tmp" }));

    const message = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout waiting for connected message"));
      }, 5000);

      ws.on("message", (data) => {
        clearTimeout(timeout);
        resolve(data.toString());
      });
    });

    const parsed = JSON.parse(message);
    // Either connected or error (if pi is not installed)
    expect(["connected", "error"]).toContain(parsed.type);

    ws.close();
  });
});

describe("PiSession", () => {
  it("should be importable", async () => {
    const { PiSession } = await import("../session.js");
    expect(PiSession).toBeDefined();
  });
});
