import { useState } from "react";
import type { ToolResultMessage, TextContent, ImageContent } from "@pi-web/shared";
import { clsx } from "clsx";

interface ToolResultBlockProps {
  message: ToolResultMessage;
}

export function ToolResultBlock({ message }: ToolResultBlockProps) {
  const [isExpanded, setIsExpanded] = useState(!message.isError);

  // Extract text content
  const textContent = message.content
    .filter((c): c is TextContent => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  // Extract images
  const images = message.content.filter((c): c is ImageContent => c.type === "image");

  return (
    <div
      className={clsx(
        "border rounded-lg overflow-hidden",
        message.isError ? "border-red-500/50" : "border-zinc-700"
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={clsx(
          "w-full flex items-center justify-between px-3 py-2 transition-colors",
          message.isError
            ? "bg-red-900/20 hover:bg-red-900/30"
            : "bg-zinc-800 hover:bg-zinc-750"
        )}
      >
        <span className="flex items-center gap-2 text-sm">
          <span>{message.isError ? "❌" : "✅"}</span>
          <span className="font-medium text-zinc-200">{message.toolName}</span>
          {message.isError && (
            <span className="text-red-400 text-xs">error</span>
          )}
        </span>
        <svg
          className={clsx(
            "w-4 h-4 text-zinc-400 transition-transform",
            isExpanded && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div
          className={clsx(
            "px-3 py-2 border-t",
            message.isError ? "border-red-500/50 bg-red-900/10" : "border-zinc-700 bg-zinc-900"
          )}
        >
          {/* Tool-specific rendering */}
          <ToolOutput
            toolName={message.toolName}
            content={textContent}
            details={message.details}
            isError={message.isError}
          />

          {/* Images */}
          {images.length > 0 && (
            <div className="mt-2 space-y-2">
              {images.map((img, i) => (
                <img
                  key={i}
                  src={`data:${img.mimeType};base64,${img.data}`}
                  alt="Tool output"
                  className="max-w-full rounded-lg"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ToolOutputProps {
  toolName: string;
  content: string;
  details: unknown;
  isError: boolean;
}

function ToolOutput({ toolName, content, details, isError }: ToolOutputProps) {
  // Render based on tool name
  switch (toolName.toLowerCase()) {
    case "bash":
      return <BashOutput content={content} details={details} />;
    case "read":
      return <ReadOutput content={content} details={details} />;
    case "edit":
      return <EditOutput content={content} details={details} />;
    case "write":
      return <WriteOutput content={content} details={details} />;
    default:
      return (
        <pre className="text-xs text-zinc-400 overflow-x-auto whitespace-pre-wrap">
          {content}
        </pre>
      );
  }
}

function BashOutput({ content, details }: { content: string; details: unknown }) {
  const d = details as { exitCode?: number; command?: string } | undefined;

  return (
    <div className="space-y-2">
      {d?.command && (
        <div className="text-xs text-zinc-500 font-mono">$ {d.command}</div>
      )}
      <pre className="text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap font-mono bg-black/30 p-2 rounded">
        {content}
      </pre>
      {d?.exitCode !== undefined && d.exitCode !== 0 && (
        <div className="text-xs text-red-400">Exit code: {d.exitCode}</div>
      )}
    </div>
  );
}

function ReadOutput({ content, details }: { content: string; details: unknown }) {
  const d = details as { path?: string; language?: string } | undefined;

  return (
    <div className="space-y-2">
      {d?.path && (
        <div className="text-xs text-zinc-500 font-mono">📄 {d.path}</div>
      )}
      <pre className="text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap font-mono bg-black/30 p-2 rounded max-h-96 overflow-y-auto">
        {content}
      </pre>
    </div>
  );
}

function EditOutput({ content, details }: { content: string; details: unknown }) {
  const d = details as { path?: string } | undefined;

  return (
    <div className="space-y-2">
      {d?.path && (
        <div className="text-xs text-zinc-500 font-mono">✏️ {d.path}</div>
      )}
      <pre className="text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap font-mono bg-black/30 p-2 rounded">
        {content}
      </pre>
    </div>
  );
}

function WriteOutput({ content, details }: { content: string; details: unknown }) {
  const d = details as { path?: string } | undefined;

  return (
    <div className="space-y-2">
      {d?.path && (
        <div className="text-xs text-zinc-500 font-mono">📝 {d.path}</div>
      )}
      <pre className="text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap font-mono bg-black/30 p-2 rounded max-h-96 overflow-y-auto">
        {content}
      </pre>
    </div>
  );
}
