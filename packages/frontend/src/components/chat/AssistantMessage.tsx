import type {
  AssistantMessage as AssistantMessageType,
  TextContent,
  ThinkingContent,
} from "@pi-web/shared";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ThinkingBlock } from "./ThinkingBlock";

interface AssistantMessageProps {
  message: AssistantMessageType;
  isStreaming?: boolean;
}

export function AssistantMessage({ message, isStreaming }: AssistantMessageProps) {
  // Separate content by type (tool calls are rendered separately by MessageList)
  const thinking: ThinkingContent[] = [];
  const text: TextContent[] = [];

  for (const block of message.content) {
    if (block.type === "thinking") {
      thinking.push(block as ThinkingContent);
    } else if (block.type === "text") {
      text.push(block as TextContent);
    }
  }

  const combinedThinking = thinking.map((t) => t.thinking).join("\n\n");
  const combinedText = text.map((t) => t.text).join("\n");

  // Don't render if there's no text/thinking content (only tool calls)
  const hasVisibleContent = combinedThinking || combinedText || message.stopReason === "error";
  if (!hasVisibleContent && !isStreaming) {
    return null;
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-2">
        {/* Thinking Block */}
        {combinedThinking && (
          <ThinkingBlock thinking={combinedThinking} isStreaming={isStreaming} />
        )}

        {/* Text Content */}
        {combinedText && (
          <div className="bg-zinc-800 rounded-2xl rounded-bl-md px-4 py-3">
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code className="bg-zinc-700 px-1.5 py-0.5 rounded text-sm" {...props}>
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre({ children }) {
                    return (
                      <pre className="bg-zinc-900 rounded-lg p-4 overflow-x-auto">
                        {children}
                      </pre>
                    );
                  },
                }}
              >
                {combinedText}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Error display */}
        {message.stopReason === "error" && message.errorMessage && (
          <div className="text-sm text-red-400 px-1">
            Error: {message.errorMessage}
          </div>
        )}

        {/* Aborted display */}
        {message.stopReason === "aborted" && (
          <div className="text-sm text-yellow-400 px-1">
            {message.errorMessage || "Operation aborted"}
          </div>
        )}
      </div>
    </div>
  );
}
