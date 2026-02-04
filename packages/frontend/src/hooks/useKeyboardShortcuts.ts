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
  const isStreaming = useStore((s) => s.session?.isStreaming ?? false);
  const connectionStatus = useStore((s) => s.connectionStatus);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when in input fields (except specific ones)
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Escape - abort streaming (works everywhere)
      if (e.key === "Escape" && isStreaming) {
        e.preventDefault();
        abort();
        return;
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

      // Shift+Tab - Cycle thinking level
      if (e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        cycleThinkingLevel();
        return;
      }

      // Ctrl+O - Toggle tools collapsed
      if (e.ctrlKey && e.key === "o") {
        e.preventDefault();
        toggleToolsCollapsed();
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
    isStreaming,
    connectionStatus,
  ]);
}
