/**
 * Collapsible Sidebar - Session list and navigation
 */

import { useState, useEffect, useMemo } from "react";
import { useStore } from "../../store";
import { Spinner } from "../ui";
import type { SessionInfo, RpcCommand } from "@pi-web/shared";

export function Sidebar() {
  const rpcClient = useStore((s) => s.rpcClient);
  const sidebarOpen = useStore((s) => s.ui.sidebarOpen);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const refreshMessages = useStore((s) => s.refreshMessages);
  const refreshState = useStore((s) => s.refreshState);
  const setActiveDialog = useStore((s) => s.setActiveDialog);
  const currentSessionId = useStore((s) => s.session?.sessionId);

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch sessions when sidebar opens
  useEffect(() => {
    if (sidebarOpen && rpcClient) {
      fetchSessions();
    }
  }, [sidebarOpen, rpcClient]);

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

  // Filter sessions by search
  const filteredSessions = useMemo(() => {
    if (!searchQuery) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.name?.toLowerCase().includes(query) ||
        s.firstMessage?.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query)
    );
  }, [sessions, searchQuery]);

  async function handleSelectSession(session: SessionInfo) {
    if (!rpcClient) return;

    try {
      const response = await rpcClient.command({
        type: "switch_session",
        sessionPath: session.path,
      } as RpcCommand);

      if (response.success) {
        await refreshState();
        await refreshMessages();
      }
    } catch (err) {
      console.error("Failed to switch session:", err);
    }
  }

  async function handleNewSession() {
    if (!rpcClient) return;

    try {
      const response = await rpcClient.command({ type: "new_session" } as RpcCommand);
      if (response.success) {
        await refreshState();
        await refreshMessages();
        fetchSessions(); // Refresh list
      }
    } catch (err) {
      console.error("Failed to create new session:", err);
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
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
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
    <>
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-zinc-900 border-r border-zinc-700 z-40 transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "300px" }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-zinc-700">
            <h2 className="font-semibold text-zinc-100">Sessions</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={handleNewSession}
                className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded"
                title="New Session (Ctrl+N)"
              >
                <PlusIcon />
              </button>
              <button
                onClick={() => setActiveDialog("sessionTree")}
                className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded"
                title="Session Tree (Ctrl+T)"
              >
                <TreeIcon />
              </button>
              <button
                onClick={() => setActiveDialog("fork")}
                className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded"
                title="Fork (Ctrl+F)"
              >
                <ForkIcon />
              </button>
              <button
                onClick={toggleSidebar}
                className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded ml-1"
                title="Close Sidebar"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="p-2 border-b border-zinc-800">
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : error ? (
              <div className="p-3 text-sm text-red-400">{error}</div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-3 text-sm text-zinc-500 text-center">
                {searchQuery ? "No sessions match" : "No sessions"}
              </div>
            ) : (
              <div className="py-1">
                {filteredSessions.map((session) => (
                  <div
                    key={session.path}
                    className={`group px-3 py-2 cursor-pointer hover:bg-zinc-800 transition-colors ${
                      session.id === currentSessionId ? "bg-zinc-800 border-l-2 border-blue-500" : ""
                    }`}
                    onClick={() => handleSelectSession(session)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-200 truncate">
                          {session.name || session.firstMessage?.slice(0, 40) || "Untitled"}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-zinc-500">{formatDate(session.lastModified)}</span>
                          <span className="text-xs text-zinc-600">•</span>
                          <span className="text-xs text-zinc-500">{session.messageCount} msgs</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(session, e)}
                        className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-zinc-700 text-xs text-zinc-500 text-center">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </div>
        </div>
      </aside>

      {/* Overlay when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function TreeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  );
}

function ForkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
