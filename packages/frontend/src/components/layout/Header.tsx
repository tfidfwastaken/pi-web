import { useStore } from "../../store";
import { Button } from "../ui/Button";
import { clsx } from "clsx";

const thinkingLevelColors: Record<string, string> = {
  off: "bg-zinc-600",
  minimal: "bg-green-600",
  low: "bg-blue-600",
  medium: "bg-yellow-600",
  high: "bg-orange-600",
  xhigh: "bg-red-600",
};

export function Header() {
  const session = useStore((s) => s.session);
  const connectionStatus = useStore((s) => s.connectionStatus);
  const cycleThinkingLevel = useStore((s) => s.cycleThinkingLevel);
  const setActiveDialog = useStore((s) => s.setActiveDialog);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const sidebarOpen = useStore((s) => s.ui.sidebarOpen);

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-zinc-700 bg-zinc-800/50">
      <div className="flex items-center gap-3">
        {/* Sidebar Toggle */}
        {connectionStatus === "connected" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            title={sidebarOpen ? "Close Sidebar" : "Open Sidebar (Ctrl+B)"}
            className="p-1.5"
          >
            <MenuIcon />
          </Button>
        )}

        <h1 className="text-lg font-semibold text-zinc-100">
          <span className="text-blue-400">π</span> Web
        </h1>

        {session?.sessionName && (
          <span className="text-sm text-zinc-400 hidden sm:inline">{session.sessionName}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              "w-2 h-2 rounded-full",
              connectionStatus === "connected" && "bg-green-500",
              connectionStatus === "connecting" && "bg-yellow-500 animate-pulse",
              connectionStatus === "disconnected" && "bg-zinc-500",
              connectionStatus === "error" && "bg-red-500"
            )}
          />
          <span className="text-xs text-zinc-400 capitalize hidden sm:inline">{connectionStatus}</span>
        </div>

        {session && (
          <>
            {/* Model Selector */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveDialog("modelSelector")}
              title="Select Model (Ctrl+L)"
              className="border-l border-zinc-700 pl-3"
            >
              <span className="hidden sm:inline">{session.model?.name || session.model?.id || "No model"}</span>
              <span className="sm:hidden"><ModelIcon /></span>
            </Button>

            {/* Thinking Level */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => cycleThinkingLevel()}
              title="Cycle Thinking Level (Shift+Tab)"
              className="flex items-center gap-2"
            >
              <span
                className={clsx(
                  "w-2 h-2 rounded-full",
                  thinkingLevelColors[session.thinkingLevel] ?? "bg-zinc-600"
                )}
              />
              <span className="capitalize hidden sm:inline">{session.thinkingLevel}</span>
            </Button>

            {/* Streaming Indicator */}
            {session.isStreaming && (
              <span className="text-xs text-blue-400 animate-pulse">Streaming...</span>
            )}

            {/* Compacting Indicator */}
            {session.isCompacting && (
              <span className="text-xs text-yellow-400 animate-pulse">Compacting...</span>
            )}

            {/* Settings */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveDialog("settings")}
              title="Settings (Ctrl+,)"
              className="border-l border-zinc-700 pl-3"
            >
              <SettingsIcon />
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

function MenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function ModelIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
