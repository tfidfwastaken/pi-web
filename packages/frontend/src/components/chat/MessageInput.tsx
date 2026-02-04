import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type ChangeEvent, type ClipboardEvent, type DragEvent } from "react";
import { useStore } from "../../store";
import { Button } from "../ui/Button";
import { SlashCommandAutocomplete } from "./SlashCommandAutocomplete";
import { clsx } from "clsx";
import type { ImageContent } from "@pi-web/shared";

interface AttachedImage {
  data: string;
  mimeType: string;
  preview: string;
}

export function MessageInput() {
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sendPrompt = useStore((s) => s.sendPrompt);
  const sendPromptWithImages = useStore((s) => s.sendPromptWithImages);
  const abort = useStore((s) => s.abort);
  const isStreaming = useStore((s) => s.session?.isStreaming ?? false);
  const isConnected = useStore((s) => s.connectionStatus === "connected");

  // Check for slash command autocomplete
  useEffect(() => {
    if (message.startsWith("/")) {
      const query = message.slice(1).split(/\s/)[0]; // Get text after / until first space
      if (!message.includes(" ") || message.indexOf(" ") > message.indexOf("/") + 1) {
        setAutocompleteQuery(query);
        setShowAutocomplete(true);
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  }, [message]);

  const handleSubmit = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed || isStreaming) return;

    try {
      setMessage("");
      const attachedImages = images;
      setImages([]);

      if (attachedImages.length > 0) {
        const imageContents: ImageContent[] = attachedImages.map((img) => ({
          type: "image",
          data: img.data,
          mimeType: img.mimeType,
        }));
        await sendPromptWithImages(trimmed, imageContents);
      } else {
        await sendPrompt(trimmed);
      }
    } catch (error) {
      console.error("Failed to send prompt:", error);
      // Restore message on error
      setMessage(trimmed);
    }
  }, [message, images, isStreaming, sendPrompt, sendPromptWithImages]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Don't handle if autocomplete is showing (it handles its own keys)
      if (showAutocomplete) {
        if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Tab") {
          return; // Let autocomplete handle these
        }
      }

      // Submit on Enter (without Shift)
      if (e.key === "Enter" && !e.shiftKey && !showAutocomplete) {
        e.preventDefault();
        handleSubmit();
        return;
      }

      // Abort on Escape
      if (e.key === "Escape") {
        if (showAutocomplete) {
          setShowAutocomplete(false);
          return;
        }
        if (isStreaming) {
          e.preventDefault();
          abort();
          return;
        }
      }
    },
    [handleSubmit, isStreaming, abort, showAutocomplete]
  );

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  // Handle slash command selection
  const handleSelectCommand = useCallback((commandName: string) => {
    setMessage(`/${commandName} `);
    setShowAutocomplete(false);
    textareaRef.current?.focus();
  }, []);

  // Handle image paste
  const handlePaste = useCallback(async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await addImageFile(file);
        }
        break;
      }
    }
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer?.files;
    if (!files) return;

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        await addImageFile(file);
      }
    }
  }, []);

  // Add an image file
  async function addImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      const preview = dataUrl;

      setImages((prev) => [
        ...prev,
        {
          data: base64,
          mimeType: file.type,
          preview,
        },
      ]);
    };
    reader.readAsDataURL(file);
  }

  // Remove an image
  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div
      ref={containerRef}
      className="border-t border-zinc-700 p-4 bg-zinc-800/50"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Attached Images */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {images.map((img, index) => (
            <div key={index} className="relative group">
              <img
                src={img.preview}
                alt={`Attachment ${index + 1}`}
                className="h-16 w-16 object-cover rounded-lg border border-zinc-700"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1 relative">
          {/* Slash Command Autocomplete */}
          {showAutocomplete && (
            <SlashCommandAutocomplete
              query={autocompleteQuery}
              onSelect={handleSelectCommand}
              onClose={() => setShowAutocomplete(false)}
              inputRect={textareaRef.current?.getBoundingClientRect()}
            />
          )}

          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isConnected ? "Type a message... (Enter to send, / for commands)" : "Connect to start..."}
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
              disabled={(!message.trim() && images.length === 0) || !isConnected}
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
          <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded">/</kbd> Commands
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded">Ctrl+V</kbd> Paste image
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
