/**
 * Slash Command Autocomplete - Shows command suggestions when typing /
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useStore } from "../../store";
import type { RpcSlashCommand, RpcCommand } from "@pi-web/shared";

interface SlashCommandAutocompleteProps {
  query: string; // The text after "/"
  onSelect: (command: string) => void;
  onClose: () => void;
  inputRect?: DOMRect; // Position of the input element
}

export function SlashCommandAutocomplete({
  query,
  onSelect,
  onClose,
  inputRect,
}: SlashCommandAutocompleteProps) {
  const rpcClient = useStore((s) => s.rpcClient);
  const [commands, setCommands] = useState<RpcSlashCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch commands on mount
  useEffect(() => {
    async function fetchCommands() {
      if (!rpcClient) return;

      setLoading(true);
      try {
        const response = await rpcClient.command({ type: "get_commands" } as RpcCommand);
        if (response.success && "data" in response) {
          const data = response.data as { commands: RpcSlashCommand[] };
          setCommands(data.commands);
        }
      } catch (err) {
        console.error("Failed to fetch commands:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCommands();
  }, [rpcClient]);

  // Filter commands by query (fuzzy match)
  const filteredCommands = useMemo(() => {
    if (!query) return commands;

    const lowerQuery = query.toLowerCase();
    return commands.filter((cmd) => {
      // Match command name
      if (cmd.name.toLowerCase().includes(lowerQuery)) return true;
      // Match description
      if (cmd.description?.toLowerCase().includes(lowerQuery)) return true;
      return false;
    });
  }, [commands, query]);

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(Math.max(0, filteredCommands.length - 1));
    }
  }, [filteredCommands.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          e.stopPropagation();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          e.stopPropagation();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
        case "Tab":
          e.preventDefault();
          e.stopPropagation();
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex].name);
          }
          break;
        case "Escape":
          e.preventDefault();
          e.stopPropagation();
          onClose();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [filteredCommands, selectedIndex, onSelect, onClose]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (loading) {
    return (
      <div
        className="absolute bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-2 px-3 text-sm text-zinc-400"
        style={{
          bottom: inputRect ? `calc(100% - ${inputRect.top}px + 8px)` : "100%",
          left: inputRect?.left ?? 0,
          maxWidth: "400px",
        }}
      >
        Loading commands...
      </div>
    );
  }

  if (filteredCommands.length === 0) {
    return (
      <div
        className="absolute bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-2 px-3 text-sm text-zinc-500"
        style={{
          bottom: inputRect ? `calc(100% - ${inputRect.top}px + 8px)` : "100%",
          left: inputRect?.left ?? 0,
          maxWidth: "400px",
        }}
      >
        No commands found
      </div>
    );
  }

  function getSourceBadge(source: RpcSlashCommand["source"]) {
    switch (source) {
      case "extension":
        return <span className="px-1 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">ext</span>;
      case "prompt":
        return <span className="px-1 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">prompt</span>;
      case "skill":
        return <span className="px-1 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">skill</span>;
      default:
        return null;
    }
  }

  return (
    <div
      ref={listRef}
      className="absolute bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto"
      style={{
        bottom: inputRect ? `calc(100% - ${inputRect.top}px + 8px)` : "100%",
        left: inputRect?.left ?? 0,
        minWidth: "300px",
        maxWidth: "500px",
      }}
    >
      {filteredCommands.map((cmd, index) => (
        <div
          key={cmd.name}
          className={`px-3 py-2 cursor-pointer transition-colors ${
            index === selectedIndex ? "bg-zinc-800" : "hover:bg-zinc-800/50"
          }`}
          onClick={() => onSelect(cmd.name)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-blue-400">/{cmd.name}</span>
            {getSourceBadge(cmd.source)}
          </div>
          {cmd.description && (
            <p className="text-xs text-zinc-500 mt-0.5 truncate">{cmd.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
