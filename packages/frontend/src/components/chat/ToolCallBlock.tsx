import { useState } from "react";
import type { ToolCall } from "@pi-web/shared";
import { clsx } from "clsx";

interface ToolCallBlockProps {
  toolCall: ToolCall;
}

export function ToolCallBlock({ toolCall }: ToolCallBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-zinc-800 hover:bg-zinc-750 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm">
          <span className="text-yellow-400">🔧</span>
          <span className="font-medium text-zinc-200">{toolCall.name}</span>
        </span>
        <svg
          className={clsx(
            "w-4 h-4 text-zinc-400 transition-transform",
            isExpanded && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-3 py-2 bg-zinc-900 border-t border-zinc-700">
          <pre className="text-xs text-zinc-400 overflow-x-auto">
            {JSON.stringify(toolCall.arguments, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
