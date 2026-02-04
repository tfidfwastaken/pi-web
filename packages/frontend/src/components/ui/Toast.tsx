import { useEffect, useState } from "react";
import { clsx } from "clsx";

export interface ToastData {
  id: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
}

interface ToastProps extends ToastData {
  onDismiss: (id: string) => void;
}

export function Toast({ id, message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div
      className={clsx(
        "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg",
        "animate-in slide-in-from-right",
        type === "info" && "bg-blue-900/90 border border-blue-500/50",
        type === "warning" && "bg-yellow-900/90 border border-yellow-500/50",
        type === "error" && "bg-red-900/90 border border-red-500/50",
        type === "success" && "bg-green-900/90 border border-green-500/50"
      )}
    >
      <span
        className={clsx(
          "flex-shrink-0",
          type === "info" && "text-blue-400",
          type === "warning" && "text-yellow-400",
          type === "error" && "text-red-400",
          type === "success" && "text-green-400"
        )}
      >
        {type === "info" && "ℹ️"}
        {type === "warning" && "⚠️"}
        {type === "error" && "❌"}
        {type === "success" && "✅"}
      </span>
      <span className="text-sm text-zinc-100">{message}</span>
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 text-zinc-400 hover:text-zinc-200"
      >
        ✕
      </button>
    </div>
  );
}

// Toast container with state management
let toastSubscribers: ((toasts: ToastData[]) => void)[] = [];
let toastList: ToastData[] = [];

export function addToast(message: string, type: ToastData["type"] = "info") {
  const toast: ToastData = {
    id: crypto.randomUUID(),
    message,
    type,
  };
  toastList = [...toastList, toast];
  toastSubscribers.forEach((fn) => fn(toastList));
}

export function removeToast(id: string) {
  toastList = toastList.filter((t) => t.id !== id);
  toastSubscribers.forEach((fn) => fn(toastList));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    toastSubscribers.push(setToasts);
    return () => {
      toastSubscribers = toastSubscribers.filter((fn) => fn !== setToasts);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={removeToast} />
      ))}
    </div>
  );
}
