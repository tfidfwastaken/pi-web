/**
 * React hooks for RPC client
 */

import { useCallback, useEffect, useRef } from "react";
import { useStore } from "../store";
import { getRpcClient } from "./client";
import type { RpcCommand, RpcResponse, RpcEvent } from "@pi-web/shared";

/**
 * Hook to send RPC commands
 */
export function useRpcCommand() {
  const store = useStore();

  const sendCommand = useCallback(
    async <T extends RpcCommand>(command: Omit<T, "id">): Promise<RpcResponse> => {
      const client = getRpcClient();
      if (!client) {
        throw new Error("RPC client not initialized");
      }
      return client.command(command);
    },
    []
  );

  return { sendCommand };
}

/**
 * Hook to subscribe to RPC events
 */
export function useRpcEvent(handler: (event: RpcEvent) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const subscribe = useStore((state) => state.subscribeToEvents);

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      handlerRef.current(event);
    });
    return unsubscribe;
  }, [subscribe]);
}

/**
 * Hook to subscribe to specific event types
 */
export function useRpcEventType<T extends RpcEvent["type"]>(
  eventType: T,
  handler: (event: Extract<RpcEvent, { type: T }>) => void
) {
  useRpcEvent((event) => {
    if (event.type === eventType) {
      handler(event as Extract<RpcEvent, { type: T }>);
    }
  });
}

/**
 * Hook to get connection status
 */
export function useConnectionStatus() {
  return useStore((state) => state.connectionStatus);
}

/**
 * Hook to get streaming state
 */
export function useIsStreaming() {
  return useStore((state) => state.session?.isStreaming ?? false);
}
