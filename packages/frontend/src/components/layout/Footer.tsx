import { useMemo } from "react";
import { useStore } from "../../store";
import { isAssistantMessage } from "@pi-web/shared";

export function Footer() {
  const session = useStore((s) => s.session);
  const messages = useStore((s) => s.messages);
  const cwd = useStore((s) => s.cwd);

  // Calculate cumulative token usage and cost from all assistant messages
  const stats = useMemo(() => {
    let totalTokens = 0;
    let totalCost = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheRead = 0;
    let cacheWrite = 0;

    for (const msg of messages) {
      if (isAssistantMessage(msg) && msg.usage) {
        inputTokens += msg.usage.input || 0;
        outputTokens += msg.usage.output || 0;
        cacheRead += msg.usage.cacheRead || 0;
        cacheWrite += msg.usage.cacheWrite || 0;
        totalTokens += msg.usage.totalTokens || (msg.usage.input + msg.usage.output);
        totalCost += msg.usage.cost?.total || 0;
      }
    }

    return { totalTokens, totalCost, inputTokens, outputTokens, cacheRead, cacheWrite };
  }, [messages]);

  // Format token count with K/M suffix
  function formatTokens(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  }

  // Format cost
  function formatCost(cost: number): string {
    if (cost === 0) return "";
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  }

  // Shorten path for display
  function shortenPath(path: string): string {
    if (path.length <= 40) return path;
    const parts = path.split("/");
    if (parts.length <= 3) return path;
    return `.../${parts.slice(-2).join("/")}`;
  }

  return (
    <footer className="flex items-center justify-between px-4 py-1.5 border-t border-zinc-700 bg-zinc-800/50 text-xs text-zinc-400">
      {/* Left side: working directory */}
      <div className="flex items-center gap-4 min-w-0">
        {cwd && (
          <span className="truncate" title={cwd}>
            📁 {shortenPath(cwd)}
          </span>
        )}
      </div>

      {/* Right side: model, tokens, cost */}
      <div className="flex items-center gap-3 shrink-0">
        {session && (
          <>
            {/* Model */}
            <span className="text-zinc-300" title="Current Model">
              {session.model?.name || session.model?.id || "No model"}
            </span>

            <span className="text-zinc-600">│</span>

            {/* Tokens */}
            <span title={`Input: ${stats.inputTokens} | Output: ${stats.outputTokens}${stats.cacheRead ? ` | Cache read: ${stats.cacheRead}` : ""}`}>
              {formatTokens(stats.totalTokens)} tokens
            </span>

            {/* Cost */}
            {stats.totalCost > 0 && (
              <>
                <span className="text-zinc-600">│</span>
                <span className="text-emerald-400" title="Total Cost">
                  {formatCost(stats.totalCost)}
                </span>
              </>
            )}

            {/* Pending messages indicator */}
            {session.pendingMessageCount > 0 && (
              <>
                <span className="text-zinc-600">│</span>
                <span className="text-yellow-400" title="Queued Messages">
                  +{session.pendingMessageCount} queued
                </span>
              </>
            )}
          </>
        )}
      </div>
    </footer>
  );
}
