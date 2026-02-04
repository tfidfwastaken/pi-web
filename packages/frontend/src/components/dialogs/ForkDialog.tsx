/**
 * Fork Dialog - Select a message to fork from
 */

import { useState, useEffect } from "react";
import { useStore } from "../../store";
import { Spinner } from "../ui";
import type { RpcCommand } from "@pi-web/shared";

interface ForkMessage {
  entryId: string;
  text: string;
}

interface ForkDialogProps {
  onClose: () => void;
}

export function ForkDialog({ onClose }: ForkDialogProps) {
  const rpcClient = useStore((s) => s.rpcClient);
  const refreshMessages = useStore((s) => s.refreshMessages);
  const refreshState = useStore((s) => s.refreshState);

  const [messages, setMessages] = useState<ForkMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [forking, setForking] = useState(false);

  // Fetch fork messages on mount
  useEffect(() => {
    async function fetchMessages() {
      if (!rpcClient) return;

      setLoading(true);
      setError(null);

      try {
        const response = await rpcClient.command({ type: "get_fork_messages" } as RpcCommand);
        if (response.success && "data" in response) {
          const data = response.data as { messages: ForkMessage[] };
          setMessages(data.messages);
          // Select the last message by default (most recent)
          if (data.messages.length > 0) {
            setSelectedIndex(data.messages.length - 1);
          }
        } else if (!response.success && "error" in response) {
          setError(response.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch messages");
      } finally {
        setLoading(false);
      }
    }

    fetchMessages();
  }, [rpcClient]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, messages.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (messages[selectedIndex]) {
            handleFork(messages[selectedIndex].entryId);
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
  }, [messages, selectedIndex, onClose]);

  async function handleFork(entryId: string) {
    if (!rpcClient || forking) return;

    setForking(true);
    try {
      const response = await rpcClient.command({
        type: "fork",
        entryId,
      } as RpcCommand);

      if (response.success) {
        await refreshState();
        await refreshMessages();
        onClose();
      } else if (!response.success && "error" in response) {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fork session");
    } finally {
      setForking(false);
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
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Fork Session</h2>
            <p className="text-sm text-zinc-400 mt-0.5">Select a message to create a new branch from</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
              <span className="ml-2 text-zinc-400">Loading messages...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-red-400">{error}</div>
          ) : messages.length === 0 ? (
            <div className="p-4 text-center text-zinc-500">No messages available to fork from</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {messages.map((msg, index) => (
                <div
                  key={msg.entryId}
                  className={`p-4 cursor-pointer hover:bg-zinc-800 transition-colors ${
                    index === selectedIndex ? "bg-zinc-800" : ""
                  }`}
                  onClick={() => setSelectedIndex(index)}
                  onDoubleClick={() => handleFork(msg.entryId)}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-zinc-100">User</span>
                        <span className="text-xs text-zinc-500">Message {index + 1}</span>
                      </div>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">
                        {msg.text.length > 500 ? msg.text.slice(0, 500) + "..." : msg.text}
                      </p>
                    </div>
                    {index === selectedIndex && (
                      <div className="shrink-0">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t border-zinc-700">
          <div className="text-xs text-zinc-500">
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↑↓</kbd> to navigate,{" "}
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">Enter</kbd> to fork,{" "}
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">Esc</kbd> to close
          </div>
          <button
            onClick={() => messages[selectedIndex] && handleFork(messages[selectedIndex].entryId)}
            disabled={forking || messages.length === 0}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm rounded transition-colors"
          >
            {forking ? "Forking..." : "Fork from selected"}
          </button>
        </div>
      </div>
    </div>
  );
}
