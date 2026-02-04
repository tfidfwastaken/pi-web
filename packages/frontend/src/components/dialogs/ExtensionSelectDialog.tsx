import { useState } from "react";
import { Button } from "../ui/Button";
import { clsx } from "clsx";

interface ExtensionSelectDialogProps {
  id: string;
  title: string;
  options: string[];
  onSelect: (value: string) => void;
  onCancel: () => void;
}

export function ExtensionSelectDialog({
  title,
  options,
  onSelect,
  onCancel,
}: ExtensionSelectDialogProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      onSelect(options[selectedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      autoFocus
    >
      <div className="bg-zinc-800 rounded-xl w-full max-w-md shadow-2xl border border-zinc-700">
        <div className="px-4 py-3 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => onSelect(option)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={clsx(
                "w-full px-4 py-2 text-left text-sm transition-colors",
                index === selectedIndex
                  ? "bg-blue-600 text-white"
                  : "text-zinc-300 hover:bg-zinc-700"
              )}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-700">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onSelect(options[selectedIndex])}>
            Select
          </Button>
        </div>
      </div>
    </div>
  );
}
