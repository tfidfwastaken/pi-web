import { Button } from "../ui/Button";

interface ExtensionConfirmDialogProps {
  id: string;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExtensionConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: ExtensionConfirmDialogProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onConfirm();
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
      <div className="bg-zinc-800 rounded-xl w-full max-w-md shadow-2xl border border-zinc-700 p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-2">{title}</h2>
        <p className="text-zinc-300 mb-6">{message}</p>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </div>
  );
}
