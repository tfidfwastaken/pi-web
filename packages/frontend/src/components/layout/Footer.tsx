import { useStore } from "../../store";

export function Footer() {
  const session = useStore((s) => s.session);
  const cwd = useStore((s) => s.cwd);

  return (
    <footer className="flex items-center justify-between px-4 py-1.5 border-t border-zinc-700 bg-zinc-800/50 text-xs text-zinc-400">
      <div className="flex items-center gap-4">
        {cwd && <span title="Working Directory">📁 {cwd}</span>}
      </div>

      <div className="flex items-center gap-4">
        {session && (
          <>
            <span title="Messages">{session.messageCount} messages</span>
            {session.pendingMessageCount > 0 && (
              <span className="text-yellow-400" title="Pending Messages">
                +{session.pendingMessageCount} queued
              </span>
            )}
          </>
        )}
      </div>
    </footer>
  );
}
