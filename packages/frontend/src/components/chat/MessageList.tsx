import { useEffect, useRef, useMemo } from "react";
import { useStore } from "../../store";
import { UserMessage } from "./UserMessage";
import { AssistantMessage } from "./AssistantMessage";
import { ToolExecutionBlock } from "./ToolExecutionBlock";
import { CompactionSummary } from "./CompactionSummary";
import { BranchSummary } from "./BranchSummary";
import type {
  AgentMessage,
  ToolResultMessage,
  BashExecutionMessage,
  CustomMessage,
  ToolCall,
  UserMessage as UserMessageType,
  AssistantMessage as AssistantMessageType,
  CompactionSummaryMessage,
  BranchSummaryMessage,
} from "@pi-web/shared";
import {
  isUserMessage,
  isAssistantMessage,
  isToolResultMessage,
  isCompactionSummaryMessage,
  isBranchSummaryMessage,
  isBashExecutionMessage,
  isCustomMessage,
} from "@pi-web/shared";

// Represents a grouped display item
type DisplayItem =
  | { type: "user"; message: UserMessageType }
  | { type: "assistant"; message: AssistantMessageType; isStreaming: boolean }
  | { type: "toolExecution"; toolCall: ToolCall; result?: ToolResultMessage }
  | { type: "compaction"; message: CompactionSummaryMessage }
  | { type: "branch"; message: BranchSummaryMessage }
  | { type: "bash"; message: BashExecutionMessage }
  | { type: "custom"; message: CustomMessage }
  | { type: "unknown"; message: AgentMessage };

export function MessageList() {
  const messages = useStore((s) => s.messages);
  const streamingMessage = useStore((s) => s.streamingMessage);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  const allMessages = streamingMessage
    ? [...messages, streamingMessage]
    : messages;

  // Group messages: pair tool calls with their results
  const displayItems = useMemo(() => {
    const items: DisplayItem[] = [];
    const toolResultsById = new Map<string, ToolResultMessage>();

    // First pass: collect all tool results by their toolCallId
    for (const msg of allMessages) {
      if (isToolResultMessage(msg)) {
        toolResultsById.set(msg.toolCallId, msg);
      }
    }

    // Second pass: build display items
    for (let i = 0; i < allMessages.length; i++) {
      const message = allMessages[i];
      const isStreamingMsg = message === streamingMessage;

      if (isUserMessage(message)) {
        items.push({ type: "user", message: message as UserMessageType });
      } else if (isAssistantMessage(message)) {
        const assistantMsg = message as AssistantMessageType;
        // Add assistant message (without tool calls - those are handled separately)
        items.push({ type: "assistant", message: assistantMsg, isStreaming: isStreamingMsg });

        // Extract tool calls and pair with results
        for (const content of assistantMsg.content) {
          if (content.type === "toolCall") {
            const toolCall = content as ToolCall;
            const result = toolResultsById.get(toolCall.id);
            items.push({ type: "toolExecution", toolCall, result });
          }
        }
      } else if (isToolResultMessage(message)) {
        // Skip - already handled above when pairing with tool calls
        continue;
      } else if (isCompactionSummaryMessage(message)) {
        items.push({ type: "compaction", message: message as CompactionSummaryMessage });
      } else if (isBranchSummaryMessage(message)) {
        items.push({ type: "branch", message: message as BranchSummaryMessage });
      } else if (isBashExecutionMessage(message)) {
        items.push({ type: "bash", message: message as BashExecutionMessage });
      } else if (isCustomMessage(message)) {
        const customMsg = message as CustomMessage;
        if (customMsg.display) {
          items.push({ type: "custom", message: customMsg });
        }
      } else {
        items.push({ type: "unknown", message });
      }
    }

    return items;
  }, [allMessages, streamingMessage]);

  if (allMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        <div className="text-center">
          <p className="text-2xl mb-2">π</p>
          <p>Start a conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {displayItems.map((item, index) => (
        <DisplayItemComponent key={index} item={item} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function DisplayItemComponent({ item }: { item: DisplayItem }) {
  switch (item.type) {
    case "user":
      return <UserMessage message={item.message} />;

    case "assistant":
      return <AssistantMessage message={item.message} isStreaming={item.isStreaming} />;

    case "toolExecution":
      return <ToolExecutionBlock toolCall={item.toolCall} result={item.result} />;

    case "compaction":
      return <CompactionSummary message={item.message} />;

    case "branch":
      return <BranchSummary message={item.message} />;

    case "bash":
      return <BashExecutionBlock message={item.message} />;

    case "custom":
      return <CustomMessageBlock message={item.message} />;

    case "unknown":
      return (
        <div className="text-xs text-zinc-500">
          Unknown message type: {(item.message as AgentMessage & { role: string }).role}
        </div>
      );
  }
}

function BashExecutionBlock({ message }: { message: BashExecutionMessage }) {
  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-zinc-800 text-sm">
        <span className="text-yellow-400">$</span>{" "}
        <span className="font-mono text-zinc-300">{message.command}</span>
      </div>
      {message.output && (
        <div className="px-3 py-2 bg-zinc-900 border-t border-zinc-700">
          <pre className="text-xs text-zinc-400 overflow-x-auto whitespace-pre-wrap font-mono">
            {message.output}
          </pre>
        </div>
      )}
      {message.exitCode !== undefined && message.exitCode !== 0 && (
        <div className="px-3 py-1 bg-red-900/20 border-t border-red-500/50 text-xs text-red-400">
          Exit code: {message.exitCode}
        </div>
      )}
    </div>
  );
}

function CustomMessageBlock({ message }: { message: CustomMessage }) {
  const content =
    typeof message.content === "string"
      ? message.content
      : message.content
          .filter((c) => c.type === "text")
          .map((c) => (c as any).text)
          .join("\n");

  return (
    <div className="border border-purple-500/30 rounded-lg px-3 py-2 bg-purple-900/10">
      <div className="text-xs text-purple-400 mb-1">{message.customType}</div>
      <div className="text-sm text-zinc-300 whitespace-pre-wrap">{content}</div>
    </div>
  );
}
