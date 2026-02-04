/**
 * Session Tree Dialog - Visualize and navigate session branches
 */

import { useState, useEffect, useCallback } from "react";
import { useStore } from "../../store";
import { Spinner } from "../ui";
import type { SessionTreeNode, RpcCommand } from "@pi-web/shared";

interface SessionTreeDialogProps {
  onClose: () => void;
}

export function SessionTreeDialog({ onClose }: SessionTreeDialogProps) {
  const rpcClient = useStore((s) => s.rpcClient);
  const refreshMessages = useStore((s) => s.refreshMessages);
  const refreshState = useStore((s) => s.refreshState);

  const [tree, setTree] = useState<SessionTreeNode[]>([]);
  const [currentId, setCurrentId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  // Fetch tree on mount
  useEffect(() => {
    async function fetchTree() {
      if (!rpcClient) return;

      setLoading(true);
      setError(null);

      try {
        const response = await rpcClient.command({ type: "get_session_tree" } as RpcCommand);
        if (response.success && "data" in response) {
          const data = response.data as { tree: SessionTreeNode[]; currentId?: string };
          setTree(data.tree);
          setCurrentId(data.currentId);
          if (data.currentId) {
            setSelectedId(data.currentId);
          }
        } else if (!response.success && "error" in response) {
          setError(response.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch session tree");
      } finally {
        setLoading(false);
      }
    }

    fetchTree();
  }, [rpcClient]);

  // Navigate to a node
  const handleNavigate = useCallback(
    async (nodeId: string) => {
      if (!rpcClient || navigating || nodeId === currentId) return;

      setNavigating(true);
      try {
        // Use fork command to navigate (pi's navigateTree is exposed via fork mechanism)
        const response = await rpcClient.command({
          type: "fork",
          entryId: nodeId,
        } as RpcCommand);

        if (response.success) {
          await refreshState();
          await refreshMessages();
          onClose();
        } else if (!response.success && "error" in response) {
          setError(response.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to navigate");
      } finally {
        setNavigating(false);
      }
    },
    [rpcClient, navigating, currentId, refreshState, refreshMessages, onClose]
  );

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter" && selectedId) {
        e.preventDefault();
        handleNavigate(selectedId);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, selectedId, handleNavigate]);

  // Flatten tree for rendering
  function flattenTree(nodes: SessionTreeNode[], depth = 0): Array<{ node: SessionTreeNode; depth: number }> {
    const result: Array<{ node: SessionTreeNode; depth: number }> = [];
    for (const node of nodes) {
      result.push({ node, depth });
      if (node.children.length > 0) {
        result.push(...flattenTree(node.children, depth + 1));
      }
    }
    return result;
  }

  const flatNodes = flattenTree(tree);

  // Get icon for node type
  function getNodeIcon(type: SessionTreeNode["type"]) {
    switch (type) {
      case "user":
        return (
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        );
      case "assistant":
        return (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        );
      case "branch":
        return (
          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
        );
      case "compaction":
        return (
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case "label":
        return (
          <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        );
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-100">Session Tree</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
              <span className="ml-2 text-zinc-400">Loading tree...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-red-400">{error}</div>
          ) : flatNodes.length === 0 ? (
            <div className="p-4 text-center text-zinc-500">No session tree available</div>
          ) : (
            <div className="font-mono text-sm">
              {flatNodes.map(({ node, depth }) => (
                <div
                  key={node.id}
                  className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors ${
                    selectedId === node.id ? "bg-zinc-800" : "hover:bg-zinc-800/50"
                  } ${node.isCurrent ? "ring-1 ring-blue-500" : ""}`}
                  style={{ paddingLeft: `${depth * 24 + 8}px` }}
                  onClick={() => setSelectedId(node.id)}
                  onDoubleClick={() => handleNavigate(node.id)}
                >
                  {/* Branch line indicators */}
                  {depth > 0 && (
                    <span className="text-zinc-600 select-none">
                      {"│".repeat(depth - 1)}├─
                    </span>
                  )}

                  {/* Icon */}
                  {getNodeIcon(node.type)}

                  {/* Text */}
                  <span
                    className={`flex-1 truncate ${
                      node.isCurrent ? "text-blue-400 font-semibold" : "text-zinc-300"
                    }`}
                  >
                    {node.text}
                  </span>

                  {/* Label badge */}
                  {node.label && (
                    <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">
                      {node.label}
                    </span>
                  )}

                  {/* Current indicator */}
                  {node.isCurrent && (
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">current</span>
                  )}

                  {/* Children count */}
                  {node.children.length > 0 && (
                    <span className="text-xs text-zinc-500">{node.children.length}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t border-zinc-700">
          <div className="text-xs text-zinc-500">
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">Double-click</kbd> to navigate,{" "}
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">Esc</kbd> to close
          </div>
          {selectedId && selectedId !== currentId && (
            <button
              onClick={() => handleNavigate(selectedId)}
              disabled={navigating}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white text-sm rounded transition-colors"
            >
              {navigating ? "Navigating..." : "Go to selected"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
