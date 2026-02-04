/**
 * Tool Execution Block - Renders tool calls with their results in TUI style
 */

import { useState, useMemo } from "react";
import type { ToolCall, ToolResultMessage, TextContent, ImageContent } from "@pi-web/shared";
import { clsx } from "clsx";

interface ToolExecutionBlockProps {
  toolCall: ToolCall;
  result?: ToolResultMessage;
  defaultExpanded?: boolean;
}

// Shorten path using ~ for home directory
function shortenPath(path: string): string {
  const home = typeof window !== "undefined" ? "" : process.env.HOME || "";
  // In browser, we can't know the home dir, but paths often start with /home/user
  // Try to detect and shorten common patterns
  const homeMatch = path.match(/^\/home\/[^/]+/);
  if (homeMatch) {
    return path.replace(homeMatch[0], "~");
  }
  return path;
}

export function ToolExecutionBlock({ toolCall, result, defaultExpanded = false }: ToolExecutionBlockProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const isPending = !result;
  const isError = result?.isError ?? false;

  // Extract text content from result
  const textContent = useMemo(() => {
    if (!result) return "";
    return result.content
      .filter((c): c is TextContent => c.type === "text")
      .map((c) => c.text)
      .join("\n");
  }, [result]);

  // Extract images from result
  const images = useMemo(() => {
    if (!result) return [];
    return result.content.filter((c): c is ImageContent => c.type === "image");
  }, [result]);

  // Get the appropriate renderer based on tool name
  const { header, content } = useMemo(() => {
    return renderToolContent(toolCall, result, textContent, isExpanded);
  }, [toolCall, result, textContent, isExpanded]);

  return (
    <div
      className={clsx(
        "rounded-lg overflow-hidden font-mono text-sm my-2",
        isPending && "bg-yellow-900/20 border border-yellow-700/30",
        !isPending && !isError && "bg-emerald-900/20 border border-emerald-700/30",
        isError && "bg-red-900/20 border border-red-700/30"
      )}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={clsx(
          "w-full flex items-center justify-between px-3 py-2 text-left transition-colors",
          isPending && "hover:bg-yellow-900/30",
          !isPending && !isError && "hover:bg-emerald-900/30",
          isError && "hover:bg-red-900/30"
        )}
      >
        <div className="flex-1 min-w-0">
          {header}
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          {isPending && (
            <span className="text-yellow-400 text-xs animate-pulse">running...</span>
          )}
          <svg
            className={clsx(
              "w-4 h-4 transition-transform",
              isPending ? "text-yellow-500" : isError ? "text-red-500" : "text-emerald-500",
              isExpanded && "rotate-180"
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Content - expandable */}
      {isExpanded && content && (
        <div className={clsx(
          "px-3 py-2 border-t",
          isPending && "border-yellow-700/30",
          !isPending && !isError && "border-emerald-700/30",
          isError && "border-red-700/30"
        )}>
          {content}

          {/* Images */}
          {images.length > 0 && (
            <div className="mt-3 space-y-2">
              {images.map((img, i) => (
                <img
                  key={i}
                  src={`data:${img.mimeType};base64,${img.data}`}
                  alt="Tool output"
                  className="max-w-full max-h-96 rounded border border-zinc-700"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function renderToolContent(
  toolCall: ToolCall,
  result: ToolResultMessage | undefined,
  textContent: string,
  expanded: boolean
): { header: React.ReactNode; content: React.ReactNode } {
  const args = toolCall.arguments as Record<string, unknown>;
  const details = result?.details as Record<string, unknown> | undefined;

  switch (toolCall.name) {
    case "Bash":
    case "bash":
      return renderBash(args, textContent, details, expanded, result?.isError);

    case "Read":
    case "read":
      return renderRead(args, textContent, details, expanded);

    case "Write":
    case "write":
      return renderWrite(args, textContent, details, expanded, result?.isError);

    case "Edit":
    case "edit":
      return renderEdit(args, textContent, details, expanded, result?.isError);

    case "subagent":
      return renderSubagent(args, textContent, expanded);

    default:
      return renderGeneric(toolCall.name, args, textContent, expanded);
  }
}

// ============================================================================
// Bash Tool
// ============================================================================

function renderBash(
  args: Record<string, unknown>,
  output: string,
  details: Record<string, unknown> | undefined,
  expanded: boolean,
  isError?: boolean
): { header: React.ReactNode; content: React.ReactNode } {
  const command = (args.command as string) || "";
  const timeout = args.timeout as number | undefined;

  const header = (
    <div className="flex items-center gap-2 truncate">
      <span className="text-emerald-400 font-bold">$</span>
      <span className="text-zinc-200 truncate">{command || "..."}</span>
      {timeout && <span className="text-zinc-500 text-xs">(timeout {timeout}s)</span>}
    </div>
  );

  const lines = output.trim().split("\n");
  const maxLines = expanded ? lines.length : 8;
  const displayLines = lines.slice(0, maxLines);
  const remaining = lines.length - maxLines;

  const exitCode = details?.exitCode as number | undefined;
  const truncation = details?.truncation as { truncated?: boolean; outputLines?: number; totalLines?: number } | undefined;

  const content = output.trim() ? (
    <div className="space-y-2">
      <pre className={clsx(
        "text-xs overflow-x-auto whitespace-pre-wrap",
        isError ? "text-red-300" : "text-zinc-300"
      )}>
        {displayLines.join("\n")}
      </pre>
      {remaining > 0 && (
        <div className="text-xs text-zinc-500">
          ... ({remaining} more lines, click to expand)
        </div>
      )}
      {exitCode !== undefined && exitCode !== 0 && (
        <div className="text-xs text-red-400">Exit code: {exitCode}</div>
      )}
      {truncation?.truncated && (
        <div className="text-xs text-yellow-500">
          [Truncated: showing {truncation.outputLines} of {truncation.totalLines} lines]
        </div>
      )}
    </div>
  ) : null;

  return { header, content };
}

// ============================================================================
// Read Tool
// ============================================================================

function renderRead(
  args: Record<string, unknown>,
  output: string,
  details: Record<string, unknown> | undefined,
  expanded: boolean
): { header: React.ReactNode; content: React.ReactNode } {
  const path = shortenPath((args.path as string) || (args.file_path as string) || "");
  const offset = args.offset as number | undefined;
  const limit = args.limit as number | undefined;

  // Build path display with line range
  let pathDisplay = path || "...";
  if (offset !== undefined || limit !== undefined) {
    const startLine = offset ?? 1;
    const endLine = limit !== undefined ? startLine + limit - 1 : "";
    pathDisplay += `:${startLine}${endLine ? `-${endLine}` : ""}`;
  }

  const header = (
    <div className="flex items-center gap-2 truncate">
      <span className="text-blue-400 font-bold">read</span>
      <span className="text-cyan-400 truncate">{pathDisplay}</span>
    </div>
  );

  const lines = output.split("\n");
  const maxLines = expanded ? lines.length : 15;
  const displayLines = lines.slice(0, maxLines);
  const remaining = lines.length - maxLines;

  const truncation = details?.truncation as { truncated?: boolean; outputLines?: number; totalLines?: number; maxLines?: number } | undefined;

  const content = output ? (
    <div className="space-y-2">
      <pre className="text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-[500px] overflow-y-auto">
        {displayLines.map((line, i) => (
          <div key={i} className="flex">
            <span className="text-zinc-600 select-none w-10 text-right pr-3 shrink-0">
              {(offset ?? 1) + i}
            </span>
            <span className="flex-1">{line || " "}</span>
          </div>
        ))}
      </pre>
      {remaining > 0 && (
        <div className="text-xs text-zinc-500">
          ... ({remaining} more lines, click to expand)
        </div>
      )}
      {truncation?.truncated && (
        <div className="text-xs text-yellow-500">
          [Truncated: showing {truncation.outputLines} of {truncation.totalLines} lines]
        </div>
      )}
    </div>
  ) : null;

  return { header, content };
}

// ============================================================================
// Write Tool
// ============================================================================

function renderWrite(
  args: Record<string, unknown>,
  output: string,
  details: Record<string, unknown> | undefined,
  expanded: boolean,
  isError?: boolean
): { header: React.ReactNode; content: React.ReactNode } {
  const path = shortenPath((args.path as string) || (args.file_path as string) || "");
  const fileContent = (args.content as string) || "";

  const header = (
    <div className="flex items-center gap-2 truncate">
      <span className="text-purple-400 font-bold">write</span>
      <span className="text-cyan-400 truncate">{path || "..."}</span>
    </div>
  );

  const lines = fileContent.split("\n");
  const maxLines = expanded ? lines.length : 15;
  const displayLines = lines.slice(0, maxLines);
  const remaining = lines.length - maxLines;

  const content = (
    <div className="space-y-2">
      {fileContent && (
        <>
          <pre className="text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-[500px] overflow-y-auto">
            {displayLines.map((line, i) => (
              <div key={i} className="flex">
                <span className="text-zinc-600 select-none w-10 text-right pr-3 shrink-0">{i + 1}</span>
                <span className="flex-1">{line || " "}</span>
              </div>
            ))}
          </pre>
          {remaining > 0 && (
            <div className="text-xs text-zinc-500">
              ... ({remaining} more lines, {lines.length} total, click to expand)
            </div>
          )}
        </>
      )}
      {isError && output && (
        <div className="text-xs text-red-400 mt-2">{output}</div>
      )}
      {!isError && output && (
        <div className="text-xs text-emerald-400 mt-2">{output}</div>
      )}
    </div>
  );

  return { header, content };
}

// ============================================================================
// Edit Tool
// ============================================================================

function renderEdit(
  args: Record<string, unknown>,
  output: string,
  details: Record<string, unknown> | undefined,
  expanded: boolean,
  isError?: boolean
): { header: React.ReactNode; content: React.ReactNode } {
  const path = shortenPath((args.path as string) || (args.file_path as string) || "");
  const oldText = (args.oldText as string) || "";
  const newText = (args.newText as string) || "";
  const firstChangedLine = details?.firstChangedLine as number | undefined;
  const diff = details?.diff as string | undefined;

  // Build path display with line number
  let pathDisplay = path || "...";
  if (firstChangedLine) {
    pathDisplay += `:${firstChangedLine}`;
  }

  const header = (
    <div className="flex items-center gap-2 truncate">
      <span className="text-orange-400 font-bold">edit</span>
      <span className="text-cyan-400 truncate">{pathDisplay}</span>
    </div>
  );

  // Render diff if available
  const content = (
    <div className="space-y-2">
      {isError && output ? (
        <div className="text-xs text-red-400">{output}</div>
      ) : diff ? (
        <DiffView diff={diff} expanded={expanded} />
      ) : (
        // Fallback: show old/new text comparison
        <div className="space-y-3">
          {oldText && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">Old:</div>
              <pre className="text-xs text-red-300 bg-red-900/20 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                {truncateText(oldText, expanded ? 100 : 10)}
              </pre>
            </div>
          )}
          {newText && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">New:</div>
              <pre className="text-xs text-emerald-300 bg-emerald-900/20 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                {truncateText(newText, expanded ? 100 : 10)}
              </pre>
            </div>
          )}
          {output && !isError && (
            <div className="text-xs text-emerald-400">{output}</div>
          )}
        </div>
      )}
    </div>
  );

  return { header, content };
}

// ============================================================================
// Subagent Tool
// ============================================================================

function renderSubagent(
  args: Record<string, unknown>,
  output: string,
  expanded: boolean
): { header: React.ReactNode; content: React.ReactNode } {
  const agent = (args.agent as string) || "";
  const task = (args.task as string) || "";

  const header = (
    <div className="flex items-center gap-2 truncate">
      <span className="text-pink-400 font-bold">subagent</span>
      <span className="text-zinc-200">{agent || "..."}</span>
    </div>
  );

  const content = (
    <div className="space-y-2">
      {task && (
        <div>
          <div className="text-xs text-zinc-500 mb-1">Task:</div>
          <pre className="text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap">{task}</pre>
        </div>
      )}
      {output && (
        <div>
          <div className="text-xs text-zinc-500 mb-1">Output:</div>
          <pre className="text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
            {truncateText(output, expanded ? 200 : 20)}
          </pre>
        </div>
      )}
    </div>
  );

  return { header, content };
}

// ============================================================================
// Generic Tool
// ============================================================================

function renderGeneric(
  toolName: string,
  args: Record<string, unknown>,
  output: string,
  expanded: boolean
): { header: React.ReactNode; content: React.ReactNode } {
  // Try to extract a meaningful summary from args
  const argSummary = Object.entries(args)
    .slice(0, 2)
    .map(([k, v]) => {
      const val = typeof v === "string" ? v.slice(0, 30) : JSON.stringify(v).slice(0, 30);
      return `${k}=${val}${(typeof v === "string" && v.length > 30) || (typeof v !== "string" && JSON.stringify(v).length > 30) ? "..." : ""}`;
    })
    .join(", ");

  const header = (
    <div className="flex items-center gap-2 truncate">
      <span className="text-zinc-400 font-bold">{toolName}</span>
      {argSummary && <span className="text-zinc-500 truncate text-xs">{argSummary}</span>}
    </div>
  );

  const content = (
    <div className="space-y-2">
      {Object.keys(args).length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 mb-1">Arguments:</div>
          <pre className="text-xs text-zinc-400 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(args, null, 2)}
          </pre>
        </div>
      )}
      {output && (
        <div>
          <div className="text-xs text-zinc-500 mb-1">Output:</div>
          <pre className="text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
            {truncateText(output, expanded ? 200 : 20)}
          </pre>
        </div>
      )}
    </div>
  );

  return { header, content };
}

// ============================================================================
// Helper Components
// ============================================================================

function DiffView({ diff, expanded }: { diff: string; expanded: boolean }) {
  const lines = diff.split("\n");
  const maxLines = expanded ? lines.length : 20;
  const displayLines = lines.slice(0, maxLines);
  const remaining = lines.length - maxLines;

  return (
    <div className="space-y-1">
      <pre className="text-xs overflow-x-auto whitespace-pre">
        {displayLines.map((line, i) => {
          let className = "text-zinc-400";
          if (line.startsWith("+") && !line.startsWith("+++")) {
            className = "text-emerald-400 bg-emerald-900/20";
          } else if (line.startsWith("-") && !line.startsWith("---")) {
            className = "text-red-400 bg-red-900/20";
          } else if (line.startsWith("@@")) {
            className = "text-cyan-400";
          } else if (line.startsWith("diff") || line.startsWith("index")) {
            className = "text-zinc-500";
          }
          return (
            <div key={i} className={className}>
              {line || " "}
            </div>
          );
        })}
      </pre>
      {remaining > 0 && (
        <div className="text-xs text-zinc-500">
          ... ({remaining} more lines, click to expand)
        </div>
      )}
    </div>
  );
}

function truncateText(text: string, maxLines: number): string {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return text;
  return lines.slice(0, maxLines).join("\n") + `\n... (${lines.length - maxLines} more lines)`;
}
