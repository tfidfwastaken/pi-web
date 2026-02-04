import { useState, useEffect } from "react";
import { useStore } from "./store";
import { AppShell } from "./components/layout";
import { ChatPanel } from "./components/chat";
import { ConnectDialog, ExtensionDialogManager } from "./components/dialogs";
import { ToastContainer, addToast } from "./components/ui";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useRpcEvent } from "./rpc";

export function App() {
  const connectionStatus = useStore((s) => s.connectionStatus);
  const [showConnect, setShowConnect] = useState(true);

  // Register keyboard shortcuts
  useKeyboardShortcuts();

  // Handle extension notifications
  useRpcEvent((event) => {
    if (event.type === "extension_ui_request" && event.method === "notify") {
      addToast(event.message, event.notifyType ?? "info");
    }
  });

  // Hide connect dialog once connected
  useEffect(() => {
    if (connectionStatus === "connected") {
      setShowConnect(false);
    }
  }, [connectionStatus]);

  // Show connect dialog if disconnected
  useEffect(() => {
    if (connectionStatus === "disconnected" || connectionStatus === "error") {
      setShowConnect(true);
    }
  }, [connectionStatus]);

  return (
    <>
      <AppShell>
        <ChatPanel />
      </AppShell>

      {/* Extension dialogs */}
      <ExtensionDialogManager />

      {/* Connect dialog */}
      {showConnect && connectionStatus !== "connected" && (
        <ConnectDialog onConnect={() => setShowConnect(false)} />
      )}

      {/* Toast notifications */}
      <ToastContainer />
    </>
  );
}
