import { useState } from "react";
import { clsx } from "clsx";

interface ThinkingBlockProps {
  thinking: string;
  isStreaming?: boolean;
}

export function ThinkingBlock({ thinking, isStreaming }: ThinkingBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!thinking) return null;

  return (
    <div className="my-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={clsx(
          "flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors",
          isStreaming && "animate-pulse-subtle"
        )}
      >
        <svg
          className={clsx(
            "w-4 h-4 transition-transform",
            isExpanded && "rotate-90"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span className="flex items-center gap-2">
          💭 Thinking
          {isStreaming && <span className="text-xs">(streaming...)</span>}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 pl-6 border-l-2 border-zinc-700">
          <pre className="text-sm text-zinc-400 whitespace-pre-wrap font-mono">
            {thinking}
          </pre>
        </div>
      )}
    </div>
  );
}
