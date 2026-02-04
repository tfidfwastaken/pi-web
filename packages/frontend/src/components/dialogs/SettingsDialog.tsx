/**
 * Settings Dialog - Display settings, keyboard shortcuts, and controls
 */

import { useState } from "react";
import { useStore } from "../../store";
import type { ThinkingLevel, RpcCommand } from "@pi-web/shared";

interface SettingsDialogProps {
  onClose: () => void;
}

type Tab = "general" | "shortcuts" | "about";

const thinkingLevels: { value: ThinkingLevel; label: string; color: string }[] = [
  { value: "off", label: "Off", color: "text-zinc-400" },
  { value: "minimal", label: "Minimal", color: "text-blue-400" },
  { value: "low", label: "Low", color: "text-green-400" },
  { value: "medium", label: "Medium", color: "text-yellow-400" },
  { value: "high", label: "High", color: "text-orange-400" },
  { value: "xhigh", label: "Extra High", color: "text-red-400" },
];

const shortcuts = [
  { key: "Enter", action: "Send message" },
  { key: "Shift+Enter", action: "New line in input" },
  { key: "Escape", action: "Abort streaming / Close dialog" },
  { key: "Ctrl+P", action: "Cycle model" },
  { key: "Ctrl+L", action: "Open model selector" },
  { key: "Shift+Tab", action: "Cycle thinking level" },
  { key: "Ctrl+O", action: "Toggle tools collapsed" },
  { key: "Ctrl+Shift+O", action: "Toggle thinking collapsed" },
  { key: "Ctrl+R", action: "Open session selector (resume)" },
  { key: "Ctrl+T", action: "Open session tree" },
  { key: "Ctrl+F", action: "Fork session" },
  { key: "Ctrl+N", action: "New session" },
  { key: "Ctrl+,", action: "Open settings" },
];

export function SettingsDialog({ onClose }: SettingsDialogProps) {
  const rpcClient = useStore((s) => s.rpcClient);
  const session = useStore((s) => s.session);
  const cwd = useStore((s) => s.cwd);

  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [saving, setSaving] = useState(false);

  async function handleThinkingLevelChange(level: ThinkingLevel) {
    if (!rpcClient || saving) return;

    setSaving(true);
    try {
      await rpcClient.command({
        type: "set_thinking_level",
        level,
      } as RpcCommand);
    } catch (err) {
      console.error("Failed to set thinking level:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAutoCompaction() {
    if (!rpcClient || saving || !session) return;

    setSaving(true);
    try {
      await rpcClient.command({
        type: "set_auto_compaction",
        enabled: !session.autoCompactionEnabled,
      } as RpcCommand);
    } catch (err) {
      console.error("Failed to toggle auto compaction:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleRenameSession(newName: string) {
    if (!rpcClient || !newName.trim()) return;

    try {
      await rpcClient.command({
        type: "set_session_name",
        name: newName.trim(),
      } as RpcCommand);
    } catch (err) {
      console.error("Failed to rename session:", err);
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
          <h2 className="text-lg font-semibold text-zinc-100">Settings</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          {(["general", "shortcuts", "about"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "general" && (
            <div className="space-y-6">
              {/* Session Info */}
              <section>
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">Session</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Session Name</span>
                    <input
                      type="text"
                      defaultValue={session?.sessionName || ""}
                      placeholder="Untitled"
                      onBlur={(e) => handleRenameSession(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100 w-48 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Working Directory</span>
                    <span className="text-sm text-zinc-300 font-mono truncate max-w-xs" title={cwd}>
                      {cwd}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Session ID</span>
                    <span className="text-sm text-zinc-500 font-mono">{session?.sessionId || "—"}</span>
                  </div>
                </div>
              </section>

              {/* Model */}
              <section>
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">Model</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Current Model</span>
                    <span className="text-sm text-zinc-300">
                      {session?.model?.name || session?.model?.id || "Not set"}
                    </span>
                  </div>
                </div>
              </section>

              {/* Thinking Level */}
              <section>
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">Thinking Level</h3>
                <div className="grid grid-cols-3 gap-2">
                  {thinkingLevels.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => handleThinkingLevelChange(level.value)}
                      disabled={saving}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        session?.thinkingLevel === level.value
                          ? `bg-zinc-700 ${level.color} ring-1 ring-zinc-600`
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Compaction */}
              <section>
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">Compaction</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-zinc-400">Auto Compaction</span>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Automatically compact conversation when context is full
                    </p>
                  </div>
                  <button
                    onClick={handleToggleAutoCompaction}
                    disabled={saving}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      session?.autoCompactionEnabled ? "bg-blue-600" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        session?.autoCompactionEnabled ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === "shortcuts" && (
            <div>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-zinc-500 uppercase tracking-wide">
                    <th className="pb-2">Shortcut</th>
                    <th className="pb-2">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {shortcuts.map((shortcut) => (
                    <tr key={shortcut.key} className="border-t border-zinc-800">
                      <td className="py-2">
                        <kbd className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded font-mono text-xs">
                          {shortcut.key}
                        </kbd>
                      </td>
                      <td className="py-2 text-zinc-400">{shortcut.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "about" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">Pi Web Frontend</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  A web-based interface for the pi coding agent with full feature parity to the terminal TUI.
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Frontend</span>
                  <span className="text-zinc-300">React + TypeScript + Tailwind</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Backend</span>
                  <span className="text-zinc-300">Node.js + WebSocket</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Protocol</span>
                  <span className="text-zinc-300">JSON-RPC over WebSocket</span>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-500">
                  Built with pi coding agent. See{" "}
                  <a
                    href="https://github.com/badlogic/pi-mono"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    github.com/badlogic/pi-mono
                  </a>{" "}
                  for more information.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-700 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
