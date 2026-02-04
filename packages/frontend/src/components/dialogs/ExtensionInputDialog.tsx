import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/Button";

interface ExtensionInputDialogProps {
  id: string;
  title: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function ExtensionInputDialog({
  title,
  placeholder,
  onSubmit,
  onCancel,
}: ExtensionInputDialogProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit(value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-zinc-800 rounded-xl w-full max-w-md shadow-2xl border border-zinc-700 p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">{title}</h2>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(value)}>Submit</Button>
        </div>
      </div>
    </div>
  );
}
