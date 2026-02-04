/**
 * WebSocket RPC client for communicating with pi-web backend
 */

import type {
  RpcCommand,
  RpcResponse,
  RpcEvent,
  WsClientMessage,
  WsServerMessage,
  RpcExtensionUIResponse,
  isRpcResponse,
  isRpcEvent,
} from "@pi-web/shared";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface RpcClientOptions {
  url: string;
  onStatusChange?: (status: ConnectionStatus) => void;
  onEvent?: (event: RpcEvent) => void;
  onError?: (error: Error) => void;
  reconnect?: boolean;
  reconnectDelay?: number;
}

interface PendingCommand {
  resolve: (response: RpcResponse) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class RpcClient {
  private ws: WebSocket | null = null;
  private options: Required<RpcClientOptions>;
  private pendingCommands = new Map<string, PendingCommand>();
  private commandIdCounter = 0;
  private status: ConnectionStatus = "disconnected";
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionConnected = false;

  constructor(options: RpcClientOptions) {
    this.options = {
      reconnect: true,
      reconnectDelay: 2000,
      onStatusChange: () => {},
      onEvent: () => {},
      onError: () => {},
      ...options,
    };
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.setStatus("connecting");

      try {
        this.ws = new WebSocket(this.options.url);

        this.ws.onopen = () => {
          this.setStatus("connected");
          resolve();
        };

        this.ws.onclose = () => {
          this.sessionConnected = false;
          if (this.status !== "disconnected") {
            this.setStatus("disconnected");
            this.handleReconnect();
          }
        };

        this.ws.onerror = (event) => {
          const error = new Error("WebSocket error");
          this.options.onError(error);
          if (this.status === "connecting") {
            reject(error);
          }
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        this.setStatus("error");
        reject(error);
      }
    });
  }

  /**
   * Connect to a pi session with the given working directory
   */
  async connectSession(cwd: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }

    return new Promise((resolve, reject) => {
      const messageHandler = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data) as WsServerMessage;
          if (msg.type === "connected") {
            this.sessionConnected = true;
            this.ws?.removeEventListener("message", messageHandler);
            resolve();
          } else if (msg.type === "error") {
            this.ws?.removeEventListener("message", messageHandler);
            reject(new Error(msg.message));
          }
        } catch (e) {
          // Ignore parse errors
        }
      };

      this.ws!.addEventListener("message", messageHandler);

      const timeout = setTimeout(() => {
        this.ws?.removeEventListener("message", messageHandler);
        reject(new Error("Connection timeout"));
      }, 10000);

      this.send({ type: "connect", cwd });

      // Clear timeout on success/failure
      const cleanup = () => clearTimeout(timeout);
      Promise.resolve().then(cleanup).catch(cleanup);
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.setStatus("disconnected");
    this.sessionConnected = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Reject all pending commands
    for (const [id, pending] of this.pendingCommands) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Disconnected"));
    }
    this.pendingCommands.clear();
  }

  /**
   * Send a command and wait for response
   */
  async command<T extends RpcCommand>(
    command: Omit<T, "id">,
    timeoutMs = 30000
  ): Promise<RpcResponse> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }

    const id = `cmd_${++this.commandIdCounter}`;
    const commandWithId = { ...command, id } as RpcCommand;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(id);
        reject(new Error(`Command timeout: ${command.type}`));
      }, timeoutMs);

      this.pendingCommands.set(id, { resolve, reject, timeout });
      this.send(commandWithId);
    });
  }

  /**
   * Send a fire-and-forget message (like extension UI responses)
   */
  send(message: WsClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send an extension UI response
   */
  sendExtensionResponse(response: RpcExtensionUIResponse): void {
    this.send(response);
  }

  /**
   * Get the current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Check if connected to a pi session
   */
  isSessionConnected(): boolean {
    return this.sessionConnected;
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.options.onStatusChange(status);
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as WsServerMessage;

      // Handle responses to commands
      if (message.type === "response" && "id" in message && message.id) {
        const pending = this.pendingCommands.get(message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingCommands.delete(message.id);
          pending.resolve(message as RpcResponse);
        }
        return;
      }

      // Handle connection messages
      if (message.type === "connected" || message.type === "disconnected" || message.type === "error") {
        if (message.type === "disconnected") {
          this.sessionConnected = false;
        }
        // These are handled by connectSession or treated as events
        return;
      }

      // Handle events
      this.options.onEvent(message as RpcEvent);
    } catch (error) {
      console.error("Failed to parse message:", data, error);
    }
  }

  private handleReconnect(): void {
    if (!this.options.reconnect || this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        // Will trigger reconnect again via onclose
      });
    }, this.options.reconnectDelay);
  }
}

// Singleton instance
let clientInstance: RpcClient | null = null;

export function getRpcClient(): RpcClient | null {
  return clientInstance;
}

export function createRpcClient(options: RpcClientOptions): RpcClient {
  if (clientInstance) {
    clientInstance.disconnect();
  }
  clientInstance = new RpcClient(options);
  return clientInstance;
}
