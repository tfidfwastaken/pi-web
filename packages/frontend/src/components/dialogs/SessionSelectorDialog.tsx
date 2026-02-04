/**
 * Session Selector Dialog - List and select sessions
 */

import { useState, useEffect, useMemo } from "react";
import { useStore } from "../../store";
import { Button, Spinner } from "../ui";
import type { SessionInfo, RpcCommand } from "@pi-web/shared";

interface SessionSelectorDialogProps {
  onClose: () => void;
}

export function SessionSelectorDialog({ onClose }: SessionSelectorDialogProps) {
  const rpcClient = useStore((s) => s.rpcClient);
  const refreshMessages = useStore((s) => s.refreshMessages);
  const refreshState = useStore((s) => s.refreshState);

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "name">("recent");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [switching, setSwitching] = useState(false);

  // Fetch sessions on mount
  useEffect(() => {
    async function fetchSessions() {
      if (!rpcClient) return;

      setLoading(true);
      setError(null);

      try {
        const response = await rpcClient.command({ type: "list_sessions" } as RpcCommand);
        if (response.success && "data" in response) {
          setSessions((response.data as { sessions: SessionInfo[] }).sessions);
        } else if (!response.success && "error" in response) {
          setError(response.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch sessions");
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [rpcClient]);

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    let result = sessions;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name?.toLowerCase().includes(query) ||
          s.firstMessage?.toLowerCase().includes(query) ||
          s.id.toLowerCase().includes(query)
      );
    }

    // Sort
    if (sortBy === "name") {
      result = [...result].sort((a, b) => {
        const nameA = a.name || a.firstMessage || a.id;
        const nameB = b.name || b.firstMessage || b.id;
        return nameA.localeCompare(nameB);
      });
    }
    // "recent" is already the default sort from backend

    return result;
  }, [sessions, searchQuery, sortBy]);

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= filteredSessions.length) {
      setSelectedIndex(Math.max(0, filteredSessions.length - 1));
    }
  }, [filteredSessions.length, selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredSessions.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredSessions[selectedIndex]) {
            handleSelectSession(filteredSessions[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredSessions, selectedIndex, onClose]);

  async function handleSelectSession(session: SessionInfo) {
    if (!rpcClient || switching) return;

    setSwitching(true);
    try {
      const response = await rpcClient.command({
        type: "switch_session",
        sessionPath: session.path,
      } as RpcCommand);

      if (response.success) {
        await refreshState();
        await refreshMessages();
        onClose();
      } else if (!response.success && "error" in response) {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch session");
    } finally {
      setSwitching(false);
    }
  }

  async function handleDeleteSession(session: SessionInfo, e: React.MouseEvent) {
    e.stopPropagation();

    if (!rpcClient) return;
    if (!confirm(`Delete session "${session.name || session.firstMessage?.slice(0, 50) || session.id}"?`)) {
      return;
    }

    try {
      const response = await rpcClient.command({
        type: "delete_session",
        sessionPath: session.path,
      } as RpcCommand);

      if (response.success) {
        setSessions((prev) => prev.filter((s) => s.path !== session.path));
      } else if (!response.success && "error" in response) {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session");
    }
  }

  async function handleNewSession() {
    if (!rpcClient) return;

    setSwitching(true);
    try {
      const response = await rpcClient.command({ type: "new_session" } as RpcCommand);
      if (response.success) {
        await refreshState();
        await refreshMessages();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create new session");
    } finally {
      setSwitching(false);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-100">Sessions</h2>
          <div className="flex items-center gap-2">
            <Button onClick={handleNewSession} disabled={switching} variant="primary" size="sm">
              New Session
            </Button>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="flex items-center gap-2 p-3 border-b border-zinc-800">
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "recent" | "name")}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-blue-500"
          >
            <option value="recent">Recent</option>
            <option value="name">Name</option>
          </select>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
              <span className="ml-2 text-zinc-400">Loading sessions...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-red-400">{error}</div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-4 text-center text-zinc-500">
              {searchQuery ? "No sessions match your search" : "No sessions found"}
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {filteredSessions.map((session, index) => (
                <div
                  key={session.path}
                  className={`p-3 cursor-pointer hover:bg-zinc-800 transition-colors ${
                    index === selectedIndex ? "bg-zinc-800" : ""
                  }`}
                  onClick={() => handleSelectSession(session)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-100 truncate">
                          {session.name || session.firstMessage?.slice(0, 60) || "Untitled"}
                        </span>
                        <span className="text-xs text-zinc-500">{session.messageCount} msgs</span>
                      </div>
                      {session.name && session.firstMessage && (
                        <p className="text-sm text-zinc-400 truncate mt-0.5">{session.firstMessage.slice(0, 80)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-zinc-500">{formatDate(session.lastModified)}</span>
                      <button
                        onClick={(e) => handleDeleteSession(session, e)}
                        className="text-zinc-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 hover:opacity-100"
                        title="Delete session"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-700 text-xs text-zinc-500">
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↑↓</kbd> to navigate,{" "}
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">Enter</kbd> to select,{" "}
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}
