/**
 * Zustand store for application state
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  AgentMessage,
  RpcSessionState,
  RpcEvent,
  RpcCommand,
  Model,
  ThinkingLevel,
  RpcExtensionUIRequest,
  AssistantMessage,
  ToolResultMessage,
} from "@pi-web/shared";
import { createRpcClient, type ConnectionStatus, type RpcClient } from "../rpc/client";

// ============================================================================
// State Types
// ============================================================================

interface ConnectionState {
  status: ConnectionStatus;
  error: string | null;
  cwd: string;
}

interface SessionState {
  model?: Model;
  thinkingLevel: ThinkingLevel;
  isStreaming: boolean;
  isCompacting: boolean;
  sessionId: string;
  sessionName?: string;
  sessionFile?: string;
  autoCompactionEnabled: boolean;
  messageCount: number;
  pendingMessageCount: number;
}

interface UIState {
  sidebarOpen: boolean;
  activeDialog: string | null;
  extensionDialogs: RpcExtensionUIRequest[];
  toolsCollapsed: boolean;
  thinkingCollapsed: boolean;
}

interface AppState {
  // Connection
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  cwd: string;

  // Session
  session: SessionState | null;
  messages: AgentMessage[];
  streamingMessage: AgentMessage | null;

  // UI
  ui: UIState;

  // Event subscribers
  eventListeners: Set<(event: RpcEvent) => void>;

  // RPC client reference
  rpcClient: RpcClient | null;
}

interface AppActions {
  // Connection actions
  connect: (wsUrl: string, cwd: string) => Promise<void>;
  disconnect: () => void;
  setConnectionStatus: (status: ConnectionStatus, error?: string | null) => void;

  // Session actions
  setSession: (state: RpcSessionState) => void;
  setMessages: (messages: AgentMessage[]) => void;
  addMessage: (message: AgentMessage) => void;
  updateStreamingMessage: (message: AgentMessage | null) => void;
  clearMessages: () => void;

  // Prompt actions
  sendPrompt: (message: string) => Promise<void>;
  abort: () => Promise<void>;

  // Model actions
  setModel: (provider: string, modelId: string) => Promise<void>;
  cycleModel: () => Promise<void>;

  // Thinking actions
  setThinkingLevel: (level: ThinkingLevel) => Promise<void>;
  cycleThinkingLevel: () => Promise<void>;

  // UI actions
  toggleSidebar: () => void;
  setActiveDialog: (dialog: string | null) => void;
  addExtensionDialog: (request: RpcExtensionUIRequest) => void;
  removeExtensionDialog: (id: string) => void;
  toggleToolsCollapsed: () => void;
  toggleThinkingCollapsed: () => void;

  // Event handling
  handleEvent: (event: RpcEvent) => void;
  subscribeToEvents: (listener: (event: RpcEvent) => void) => () => void;

  // Refresh state from server
  refreshState: () => Promise<void>;
  refreshMessages: () => Promise<void>;
}

type Store = AppState & AppActions;

// ============================================================================
// Store Implementation
// ============================================================================

export const useStore = create<Store>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    connectionStatus: "disconnected",
    connectionError: null,
    cwd: "",

    session: null,
    messages: [],
    streamingMessage: null,

    ui: {
      sidebarOpen: false,
      activeDialog: null,
      extensionDialogs: [],
      toolsCollapsed: false,
      thinkingCollapsed: false,
    },

    eventListeners: new Set(),
    rpcClient: null,

    // Connection actions
    connect: async (wsUrl: string, cwd: string) => {
      const client = createRpcClient({
        url: wsUrl,
        onStatusChange: (status) => {
          get().setConnectionStatus(status);
        },
        onEvent: (event) => {
          get().handleEvent(event);
        },
        onError: (error) => {
          set({ connectionError: error.message });
        },
      });

      set({ rpcClient: client, cwd });

      try {
        await client.connect();
        await client.connectSession(cwd);
        await get().refreshState();
        await get().refreshMessages();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Connection failed";
        set({ connectionError: message, connectionStatus: "error" });
        throw error;
      }
    },

    disconnect: () => {
      const { rpcClient } = get();
      if (rpcClient) {
        rpcClient.disconnect();
      }
      set({
        rpcClient: null,
        connectionStatus: "disconnected",
        connectionError: null,
        session: null,
        messages: [],
        streamingMessage: null,
      });
    },

    setConnectionStatus: (status, error = null) => {
      set({ connectionStatus: status, connectionError: error });
    },

    // Session actions
    setSession: (state) => {
      set({
        session: {
          model: state.model,
          thinkingLevel: state.thinkingLevel,
          isStreaming: state.isStreaming,
          isCompacting: state.isCompacting,
          sessionId: state.sessionId,
          sessionName: state.sessionName,
          sessionFile: state.sessionFile,
          autoCompactionEnabled: state.autoCompactionEnabled,
          messageCount: state.messageCount,
          pendingMessageCount: state.pendingMessageCount,
        },
      });
    },

    setMessages: (messages) => {
      set({ messages });
    },

    addMessage: (message) => {
      set((state) => ({ messages: [...state.messages, message] }));
    },

    updateStreamingMessage: (message) => {
      set({ streamingMessage: message });
    },

    clearMessages: () => {
      set({ messages: [], streamingMessage: null });
    },

    // Prompt actions
    sendPrompt: async (message) => {
      const { rpcClient } = get();
      if (!rpcClient) throw new Error("Not connected");

      await rpcClient.command({ type: "prompt", message } as RpcCommand);
    },

    abort: async () => {
      const { rpcClient } = get();
      if (!rpcClient) throw new Error("Not connected");

      await rpcClient.command({ type: "abort" } as RpcCommand);
    },

    // Model actions
    setModel: async (provider, modelId) => {
      const { rpcClient } = get();
      if (!rpcClient) throw new Error("Not connected");

      const response = await rpcClient.command({ type: "set_model", provider, modelId } as RpcCommand);
      if (response.success && "data" in response) {
        set((state) => ({
          session: state.session ? { ...state.session, model: response.data as Model } : null,
        }));
      }
    },

    cycleModel: async () => {
      const { rpcClient } = get();
      if (!rpcClient) throw new Error("Not connected");

      const response = await rpcClient.command({ type: "cycle_model" } as RpcCommand);
      if (response.success && "data" in response && response.data) {
        const data = response.data as { model: Model; thinkingLevel: ThinkingLevel };
        set((state) => ({
          session: state.session
            ? { ...state.session, model: data.model, thinkingLevel: data.thinkingLevel }
            : null,
        }));
      }
    },

    // Thinking actions
    setThinkingLevel: async (level) => {
      const { rpcClient } = get();
      if (!rpcClient) throw new Error("Not connected");

      await rpcClient.command({ type: "set_thinking_level", level } as RpcCommand);
      set((state) => ({
        session: state.session ? { ...state.session, thinkingLevel: level } : null,
      }));
    },

    cycleThinkingLevel: async () => {
      const { rpcClient } = get();
      if (!rpcClient) throw new Error("Not connected");

      const response = await rpcClient.command({ type: "cycle_thinking_level" } as RpcCommand);
      if (response.success && "data" in response && response.data) {
        const data = response.data as { level: ThinkingLevel };
        set((state) => ({
          session: state.session ? { ...state.session, thinkingLevel: data.level } : null,
        }));
      }
    },

    // UI actions
    toggleSidebar: () => {
      set((state) => ({ ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen } }));
    },

    setActiveDialog: (dialog) => {
      set((state) => ({ ui: { ...state.ui, activeDialog: dialog } }));
    },

    addExtensionDialog: (request) => {
      set((state) => ({
        ui: { ...state.ui, extensionDialogs: [...state.ui.extensionDialogs, request] },
      }));
    },

    removeExtensionDialog: (id) => {
      set((state) => ({
        ui: {
          ...state.ui,
          extensionDialogs: state.ui.extensionDialogs.filter((d) => d.id !== id),
        },
      }));
    },

    toggleToolsCollapsed: () => {
      set((state) => ({ ui: { ...state.ui, toolsCollapsed: !state.ui.toolsCollapsed } }));
    },

    toggleThinkingCollapsed: () => {
      set((state) => ({ ui: { ...state.ui, thinkingCollapsed: !state.ui.thinkingCollapsed } }));
    },

    // Event handling
    handleEvent: (event) => {
      const { eventListeners } = get();

      // Notify all listeners
      for (const listener of eventListeners) {
        listener(event);
      }

      // Handle specific events
      switch (event.type) {
        case "agent_start":
          set((state) => ({
            session: state.session ? { ...state.session, isStreaming: true } : null,
          }));
          break;

        case "agent_end":
          set((state) => ({
            session: state.session ? { ...state.session, isStreaming: false } : null,
            messages: event.messages,
            streamingMessage: null,
          }));
          break;

        case "message_start":
          set({ streamingMessage: event.message });
          break;

        case "message_update":
          set({ streamingMessage: event.message });
          break;

        case "message_end":
          set((state) => ({
            messages: [...state.messages, event.message],
            streamingMessage: null,
          }));
          break;

        case "turn_end":
          // Update messages with the turn's message and tool results
          set((state) => {
            const newMessages = [...state.messages];
            // The turn_end contains the assistant message and tool results
            // which should already be in messages via message_end events
            return { messages: newMessages };
          });
          break;

        case "extension_ui_request":
          // Handle fire-and-forget methods immediately
          if (event.method === "notify" || event.method === "setStatus" || event.method === "setWidget" || event.method === "setTitle") {
            // These are handled elsewhere (notifications, status bar, etc.)
            return;
          }
          // Queue dialog requests
          get().addExtensionDialog(event);
          break;

        case "auto_compaction_start":
          set((state) => ({
            session: state.session ? { ...state.session, isCompacting: true } : null,
          }));
          break;

        case "auto_compaction_end":
          set((state) => ({
            session: state.session ? { ...state.session, isCompacting: false } : null,
          }));
          break;
      }
    },

    subscribeToEvents: (listener) => {
      const { eventListeners } = get();
      eventListeners.add(listener);
      return () => {
        eventListeners.delete(listener);
      };
    },

    // Refresh from server
    refreshState: async () => {
      const { rpcClient } = get();
      if (!rpcClient) return;

      const response = await rpcClient.command({ type: "get_state" } as RpcCommand);
      if (response.success && "data" in response) {
        get().setSession(response.data as RpcSessionState);
      }
    },

    refreshMessages: async () => {
      const { rpcClient } = get();
      if (!rpcClient) return;

      const response = await rpcClient.command({ type: "get_messages" } as RpcCommand);
      if (response.success && "data" in response) {
        const data = response.data as { messages: AgentMessage[] };
        set({ messages: data.messages });
      }
    },
  }))
);
