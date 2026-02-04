import type {
  AssistantMessage as AssistantMessageType,
  TextContent,
  ThinkingContent,
  ToolCall,
} from "@pi-web/shared";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolCallBlock } from "./ToolCallBlock";

interface AssistantMessageProps {
  message: AssistantMessageType;
  isStreaming?: boolean;
}

export function AssistantMessage({ message, isStreaming }: AssistantMessageProps) {
  // Separate content by type
  const thinking: ThinkingContent[] = [];
  const text: TextContent[] = [];
  const toolCalls: ToolCall[] = [];

  for (const block of message.content) {
    if (block.type === "thinking") {
      thinking.push(block as ThinkingContent);
    } else if (block.type === "text") {
      text.push(block as TextContent);
    } else if (block.type === "toolCall") {
      toolCalls.push(block as ToolCall);
    }
  }

  const combinedThinking = thinking.map((t) => t.thinking).join("\n\n");
  const combinedText = text.map((t) => t.text).join("\n");

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

        {/* Tool Calls */}
        {toolCalls.map((toolCall) => (
          <ToolCallBlock key={toolCall.id} toolCall={toolCall} />
        ))}

        {/* Message Metadata */}
        {!isStreaming && (
          <div className="flex items-center gap-3 text-xs text-zinc-500 px-1">
            <span>{message.model}</span>
            {message.usage && (
              <>
                <span>•</span>
                <span>
                  {message.usage.input + message.usage.output} tokens
                  {message.usage.cost?.total > 0 && (
                    <span className="ml-1">
                      (${message.usage.cost.total.toFixed(4)})
                    </span>
                  )}
                </span>
              </>
            )}
            {message.stopReason === "error" && message.errorMessage && (
              <>
                <span>•</span>
                <span className="text-red-400">{message.errorMessage}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
