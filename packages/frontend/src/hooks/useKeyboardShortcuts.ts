import { useEffect } from "react";
import { useStore } from "../store";

/**
 * Global keyboard shortcuts for the application
 */
export function useKeyboardShortcuts() {
  const cycleModel = useStore((s) => s.cycleModel);
  const cycleThinkingLevel = useStore((s) => s.cycleThinkingLevel);
  const abort = useStore((s) => s.abort);
  const toggleToolsCollapsed = useStore((s) => s.toggleToolsCollapsed);
  const toggleThinkingCollapsed = useStore((s) => s.toggleThinkingCollapsed);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const setActiveDialog = useStore((s) => s.setActiveDialog);
  const activeDialog = useStore((s) => s.ui.activeDialog);
  const isStreaming = useStore((s) => s.session?.isStreaming ?? false);
  const connectionStatus = useStore((s) => s.connectionStatus);
  const rpcClient = useStore((s) => s.rpcClient);
  const refreshState = useStore((s) => s.refreshState);
  const refreshMessages = useStore((s) => s.refreshMessages);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't handle shortcuts when in input fields (except specific ones)
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Escape - abort streaming or close dialog (works everywhere)
      if (e.key === "Escape") {
        if (activeDialog) {
          e.preventDefault();
          setActiveDialog(null);
          return;
        }
        if (isStreaming) {
          e.preventDefault();
          abort();
          return;
        }
      }

      // Don't handle other shortcuts in input fields
      if (isInput) return;

      // Don't handle shortcuts when not connected
      if (connectionStatus !== "connected") return;

      // Ctrl+P - Cycle model
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        cycleModel();
        return;
      }

      // Ctrl+L - Open model selector
      if (e.ctrlKey && e.key === "l") {
        e.preventDefault();
        setActiveDialog("modelSelector");
        return;
      }

      // Shift+Tab - Cycle thinking level
      if (e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        cycleThinkingLevel();
        return;
      }

      // Ctrl+O - Toggle tools collapsed
      if (e.ctrlKey && !e.shiftKey && e.key === "o") {
        e.preventDefault();
        toggleToolsCollapsed();
        return;
      }

      // Ctrl+Shift+O - Toggle thinking collapsed
      if (e.ctrlKey && e.shiftKey && e.key === "O") {
        e.preventDefault();
        toggleThinkingCollapsed();
        return;
      }

      // Ctrl+R - Open session selector (resume)
      if (e.ctrlKey && e.key === "r") {
        e.preventDefault();
        setActiveDialog("sessionSelector");
        return;
      }

      // Ctrl+T - Open session tree
      if (e.ctrlKey && e.key === "t") {
        e.preventDefault();
        setActiveDialog("sessionTree");
        return;
      }

      // Ctrl+F - Fork session
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        setActiveDialog("fork");
        return;
      }

      // Ctrl+N - New session
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        if (rpcClient) {
          try {
            await rpcClient.command({ type: "new_session" });
            await refreshState();
            await refreshMessages();
          } catch (err) {
            console.error("Failed to create new session:", err);
          }
        }
        return;
      }

      // Ctrl+, - Open settings
      if (e.ctrlKey && e.key === ",") {
        e.preventDefault();
        setActiveDialog("settings");
        return;
      }

      // Ctrl+B - Toggle sidebar
      if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    cycleModel,
    cycleThinkingLevel,
    abort,
    toggleToolsCollapsed,
    toggleThinkingCollapsed,
    toggleSidebar,
    setActiveDialog,
    activeDialog,
    isStreaming,
    connectionStatus,
    rpcClient,
    refreshState,
    refreshMessages,
  ]);
}
