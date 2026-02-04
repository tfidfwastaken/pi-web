import type { BranchSummaryMessage } from "@pi-web/shared";

interface BranchSummaryProps {
  message: BranchSummaryMessage;
}

export function BranchSummary({ message }: BranchSummaryProps) {
  return (
    <div className="border border-blue-500/30 rounded-lg px-4 py-3 bg-blue-900/10">
      <div className="flex items-center gap-2 text-sm text-blue-400 mb-2">
        <span>🌿</span>
        <span>Branch Summary</span>
      </div>
      <div className="text-sm text-zinc-300 whitespace-pre-wrap">
        {message.summary}
      </div>
    </div>
  );
}
