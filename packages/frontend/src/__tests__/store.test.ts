import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../store";

describe("Store", () => {
  beforeEach(() => {
    // Reset store between tests
    useStore.setState({
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
    });
  });

  it("has correct initial state", () => {
    const state = useStore.getState();
    expect(state.connectionStatus).toBe("disconnected");
    expect(state.messages).toEqual([]);
    expect(state.session).toBeNull();
  });

  it("can toggle sidebar", () => {
    const { toggleSidebar } = useStore.getState();
    expect(useStore.getState().ui.sidebarOpen).toBe(false);

    toggleSidebar();
    expect(useStore.getState().ui.sidebarOpen).toBe(true);

    toggleSidebar();
    expect(useStore.getState().ui.sidebarOpen).toBe(false);
  });

  it("can toggle tools collapsed", () => {
    const { toggleToolsCollapsed } = useStore.getState();
    expect(useStore.getState().ui.toolsCollapsed).toBe(false);

    toggleToolsCollapsed();
    expect(useStore.getState().ui.toolsCollapsed).toBe(true);
  });

  it("can set active dialog", () => {
    const { setActiveDialog } = useStore.getState();

    setActiveDialog("settings");
    expect(useStore.getState().ui.activeDialog).toBe("settings");

    setActiveDialog(null);
    expect(useStore.getState().ui.activeDialog).toBeNull();
  });

  it("can add and remove messages", () => {
    const { addMessage, setMessages, clearMessages } = useStore.getState();

    const testMessage = {
      role: "user" as const,
      content: "Hello",
      timestamp: Date.now(),
    };

    addMessage(testMessage);
    expect(useStore.getState().messages).toHaveLength(1);

    setMessages([]);
    expect(useStore.getState().messages).toHaveLength(0);

    addMessage(testMessage);
    clearMessages();
    expect(useStore.getState().messages).toHaveLength(0);
  });

  it("can subscribe to events", () => {
    const { subscribeToEvents, handleEvent } = useStore.getState();
    const events: unknown[] = [];

    const unsubscribe = subscribeToEvents((event) => {
      events.push(event);
    });

    handleEvent({ type: "agent_start" });
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "agent_start" });

    unsubscribe();

    handleEvent({ type: "agent_end", messages: [] });
    expect(events).toHaveLength(1); // No new events after unsubscribe
  });
});
