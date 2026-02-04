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
  const cycleModel = useStore((s) => s.cycleModel);
  const cycleThinkingLevel = useStore((s) => s.cycleThinkingLevel);

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-zinc-700 bg-zinc-800/50">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-zinc-100">
          <span className="text-blue-400">π</span> Web
        </h1>

        {session?.sessionName && (
          <span className="text-sm text-zinc-400">{session.sessionName}</span>
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
          <span className="text-xs text-zinc-400 capitalize">{connectionStatus}</span>
        </div>

        {session && (
          <>
            {/* Model Selector */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => cycleModel()}
              title="Cycle Model (Ctrl+P)"
            >
              {session.model?.id ?? "No model"}
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
              <span className="capitalize">{session.thinkingLevel}</span>
            </Button>

            {/* Streaming Indicator */}
            {session.isStreaming && (
              <span className="text-xs text-blue-400 animate-pulse">Streaming...</span>
            )}

            {/* Compacting Indicator */}
            {session.isCompacting && (
              <span className="text-xs text-yellow-400 animate-pulse">Compacting...</span>
            )}
          </>
        )}
      </div>
    </header>
  );
}
