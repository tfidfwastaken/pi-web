/**
 * PiSession manages a single pi --mode rpc subprocess
 */

import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import type { WsServerMessage } from "@pi-web/shared";

export interface PiSessionOptions {
  cwd: string;
  piCommand?: string;
  onMessage: (message: WsServerMessage) => void;
  onClose: (code: number | null) => void;
  onError: (error: Error) => void;
}

export class PiSession extends EventEmitter {
  private process: ChildProcess | null = null;
  private buffer = "";
  private readonly options: PiSessionOptions;
  private closed = false;

  constructor(options: PiSessionOptions) {
    super();
    this.options = options;
  }

  /**
   * Spawn the pi process
   */
  async spawn(): Promise<void> {
    const piCommand = this.options.piCommand ?? "pi";

    try {
      this.process = spawn(piCommand, ["--mode", "rpc"], {
        cwd: this.options.cwd,
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          // Ensure color output is disabled for clean JSON
          NO_COLOR: "1",
          FORCE_COLOR: "0",
        },
      });

      this.process.stdout?.on("data", (data: Buffer) => {
        this.handleStdout(data.toString());
      });

      this.process.stderr?.on("data", (data: Buffer) => {
        console.error(`[pi stderr] ${data.toString()}`);
      });

      this.process.on("close", (code) => {
        if (!this.closed) {
          this.closed = true;
          this.options.onClose(code);
        }
      });

      this.process.on("error", (error) => {
        this.options.onError(error);
      });

      // Wait a bit to ensure the process started
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (this.process.exitCode !== null) {
        throw new Error(`pi process exited immediately with code ${this.process.exitCode}`);
      }
    } catch (error) {
      throw new Error(`Failed to spawn pi: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Handle stdout data from pi process
   */
  private handleStdout(data: string): void {
    this.buffer += data;

    // Process complete lines (JSON Lines format)
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line) as WsServerMessage;
          this.options.onMessage(message);
        } catch (error) {
          console.error(`Failed to parse pi output: ${line}`);
        }
      }
    }
  }

  /**
   * Send a command to the pi process
   */
  send(message: string): void {
    if (!this.process?.stdin?.writable) {
      throw new Error("Pi process is not running");
    }
    this.process.stdin.write(message + "\n");
  }

  /**
   * Close the pi process
   */
  close(): void {
    if (this.closed) return;
    this.closed = true;

    if (this.process) {
      // Try graceful shutdown first
      this.process.stdin?.end();

      // Force kill after timeout
      const killTimeout = setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill("SIGKILL");
        }
      }, 1000);

      this.process.on("close", () => {
        clearTimeout(killTimeout);
      });

      if (!this.process.killed) {
        this.process.kill("SIGTERM");
      }
    }
  }

  /**
   * Check if the session is active
   */
  isActive(): boolean {
    return !this.closed && this.process !== null && this.process.exitCode === null;
  }
}
