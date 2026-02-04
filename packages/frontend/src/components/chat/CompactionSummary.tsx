import type { CompactionSummaryMessage } from "@pi-web/shared";

interface CompactionSummaryProps {
  message: CompactionSummaryMessage;
}

export function CompactionSummary({ message }: CompactionSummaryProps) {
  return (
    <div className="border border-yellow-500/30 rounded-lg px-4 py-3 bg-yellow-900/10">
      <div className="flex items-center gap-2 text-sm text-yellow-400 mb-2">
        <span>📦</span>
        <span>Context Compacted</span>
        <span className="text-xs text-yellow-500">
          ({message.tokensBefore.toLocaleString()} tokens summarized)
        </span>
      </div>
      <div className="text-sm text-zinc-300 whitespace-pre-wrap">
        {message.summary}
      </div>
    </div>
  );
}
