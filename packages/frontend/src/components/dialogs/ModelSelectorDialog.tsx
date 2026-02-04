/**
 * Model Selector Dialog - Pick model with search
 */

import { useState, useEffect, useMemo } from "react";
import { useStore } from "../../store";
import { Spinner } from "../ui";
import type { Model, RpcCommand } from "@pi-web/shared";

interface ModelSelectorDialogProps {
  onClose: () => void;
}

export function ModelSelectorDialog({ onClose }: ModelSelectorDialogProps) {
  const rpcClient = useStore((s) => s.rpcClient);
  const session = useStore((s) => s.session);
  const refreshState = useStore((s) => s.refreshState);

  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [switching, setSwitching] = useState(false);

  const currentModel = session?.model;

  // Fetch models on mount
  useEffect(() => {
    async function fetchModels() {
      if (!rpcClient) return;

      setLoading(true);
      setError(null);

      try {
        const response = await rpcClient.command({ type: "get_available_models" } as RpcCommand);
        if (response.success && "data" in response) {
          const data = response.data as { models: Model[] };
          setModels(data.models);

          // Select current model by default
          if (currentModel) {
            const currentIndex = data.models.findIndex(
              (m) => m.provider === currentModel.provider && m.id === currentModel.id
            );
            if (currentIndex >= 0) {
              setSelectedIndex(currentIndex);
            }
          }
        } else if (!response.success && "error" in response) {
          setError(response.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch models");
      } finally {
        setLoading(false);
      }
    }

    fetchModels();
  }, [rpcClient, currentModel]);

  // Filter models by search query
  const filteredModels = useMemo(() => {
    if (!searchQuery) return models;

    const query = searchQuery.toLowerCase();
    return models.filter(
      (m) =>
        m.id.toLowerCase().includes(query) ||
        m.name?.toLowerCase().includes(query) ||
        m.provider.toLowerCase().includes(query) ||
        m.api.toLowerCase().includes(query)
    );
  }, [models, searchQuery]);

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= filteredModels.length) {
      setSelectedIndex(Math.max(0, filteredModels.length - 1));
    }
  }, [filteredModels.length, selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredModels.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredModels[selectedIndex]) {
            handleSelectModel(filteredModels[selectedIndex]);
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
  }, [filteredModels, selectedIndex, onClose]);

  async function handleSelectModel(model: Model) {
    if (!rpcClient || switching) return;

    // Don't switch if already selected
    if (currentModel?.provider === model.provider && currentModel?.id === model.id) {
      onClose();
      return;
    }

    setSwitching(true);
    try {
      const response = await rpcClient.command({
        type: "set_model",
        provider: model.provider,
        modelId: model.id,
      } as RpcCommand);

      if (response.success) {
        await refreshState();
        onClose();
      } else if (!response.success && "error" in response) {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch model");
    } finally {
      setSwitching(false);
    }
  }

  function formatPrice(price?: number) {
    if (price === undefined) return "—";
    if (price === 0) return "Free";
    return `$${price.toFixed(2)}/M`;
  }

  function formatContext(contextWindow?: number) {
    if (!contextWindow) return "—";
    if (contextWindow >= 1000000) {
      return `${(contextWindow / 1000000).toFixed(1)}M`;
    }
    return `${(contextWindow / 1000).toFixed(0)}K`;
  }

  // Group models by provider
  const groupedModels = useMemo(() => {
    const groups = new Map<string, Model[]>();
    for (const model of filteredModels) {
      const key = `${model.api}/${model.provider}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(model);
    }
    return groups;
  }, [filteredModels]);

  function isCurrentModel(model: Model) {
    return currentModel?.provider === model.provider && currentModel?.id === model.id;
  }

  // Calculate flat index for grouped display
  let flatIndex = 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Select Model</h2>
            {currentModel && (
              <p className="text-sm text-zinc-400 mt-0.5">
                Current: {currentModel.name || currentModel.id}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-zinc-800">
          <input
            type="text"
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            autoFocus
          />
        </div>

        {/* Model List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
              <span className="ml-2 text-zinc-400">Loading models...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-red-400">{error}</div>
          ) : filteredModels.length === 0 ? (
            <div className="p-4 text-center text-zinc-500">
              {searchQuery ? "No models match your search" : "No models available"}
            </div>
          ) : (
            <div>
              {Array.from(groupedModels.entries()).map(([groupKey, groupModels]) => (
                <div key={groupKey}>
                  {/* Group Header */}
                  <div className="px-4 py-2 bg-zinc-800/50 text-xs font-semibold text-zinc-400 uppercase tracking-wide sticky top-0">
                    {groupKey}
                  </div>

                  {/* Group Models */}
                  {groupModels.map((model) => {
                    const currentFlatIndex = flatIndex++;
                    const isSelected = currentFlatIndex === selectedIndex;
                    const isCurrent = isCurrentModel(model);

                    return (
                      <div
                        key={`${model.provider}-${model.id}`}
                        className={`p-3 cursor-pointer hover:bg-zinc-800 transition-colors border-l-2 ${
                          isCurrent
                            ? "border-blue-500 bg-blue-500/10"
                            : isSelected
                            ? "border-zinc-500 bg-zinc-800"
                            : "border-transparent"
                        }`}
                        onClick={() => handleSelectModel(model)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-zinc-100">{model.name || model.id}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                                  current
                                </span>
                              )}
                              {model.supportsThinking && (
                                <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                                  thinking
                                </span>
                              )}
                              {model.supportsImages && (
                                <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                  vision
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5">{model.id}</p>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-zinc-400 shrink-0">
                            <div className="text-right">
                              <div>In: {formatPrice(model.inputPrice)}</div>
                              <div>Out: {formatPrice(model.outputPrice)}</div>
                            </div>
                            <div className="w-16 text-right">
                              <div>{formatContext(model.contextWindow)}</div>
                              <div className="text-zinc-500">context</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
