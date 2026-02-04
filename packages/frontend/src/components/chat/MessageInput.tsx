import { useState, useRef, useCallback, type KeyboardEvent, type ChangeEvent } from "react";
import { useStore } from "../../store";
import { Button } from "../ui/Button";
import { clsx } from "clsx";

export function MessageInput() {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sendPrompt = useStore((s) => s.sendPrompt);
  const abort = useStore((s) => s.abort);
  const isStreaming = useStore((s) => s.session?.isStreaming ?? false);
  const isConnected = useStore((s) => s.connectionStatus === "connected");

  const handleSubmit = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed || isStreaming) return;

    try {
      setMessage("");
      await sendPrompt(trimmed);
    } catch (error) {
      console.error("Failed to send prompt:", error);
      // Restore message on error
      setMessage(trimmed);
    }
  }, [message, isStreaming, sendPrompt]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter (without Shift)
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
        return;
      }

      // Abort on Escape
      if (e.key === "Escape" && isStreaming) {
        e.preventDefault();
        abort();
        return;
      }
    },
    [handleSubmit, isStreaming, abort]
  );

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  return (
    <div className="border-t border-zinc-700 p-4 bg-zinc-800/50">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? "Type a message... (Enter to send, Shift+Enter for new line)" : "Connect to start..."}
            disabled={!isConnected}
            rows={1}
            className={clsx(
              "w-full px-4 py-3 rounded-xl resize-none",
              "bg-zinc-900 border border-zinc-700",
              "text-zinc-100 placeholder-zinc-500",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors"
            )}
            style={{ minHeight: "48px", maxHeight: "200px" }}
          />
        </div>

        <div className="flex flex-col gap-2">
          {isStreaming ? (
            <Button
              variant="danger"
              onClick={() => abort()}
              title="Stop (Escape)"
              className="h-12 px-4"
            >
              <StopIcon />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!message.trim() || !isConnected}
              title="Send (Enter)"
              className="h-12 px-4"
            >
              <SendIcon />
            </Button>
          )}
        </div>
      </div>

      {/* Hints */}
      <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
        <span>
          <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded">Enter</kbd> Send
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded">Shift+Enter</kbd> New line
        </span>
        {isStreaming && (
          <span>
            <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded">Escape</kbd> Stop
          </span>
        )}
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
