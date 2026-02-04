import { useEffect, useRef } from "react";
import { useStore } from "../../store";
import { UserMessage } from "./UserMessage";
import { AssistantMessage } from "./AssistantMessage";
import { ToolResultBlock } from "./ToolResultBlock";
import { CompactionSummary } from "./CompactionSummary";
import { BranchSummary } from "./BranchSummary";
import type {
  AgentMessage,
  UserMessage as UserMessageType,
  AssistantMessage as AssistantMessageType,
  ToolResultMessage,
  CompactionSummaryMessage,
  BranchSummaryMessage,
  BashExecutionMessage,
  CustomMessage,
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
      {allMessages.map((message, index) => (
        <MessageItem
          key={index}
          message={message}
          isStreaming={message === streamingMessage}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

interface MessageItemProps {
  message: AgentMessage;
  isStreaming?: boolean;
}

function MessageItem({ message, isStreaming }: MessageItemProps) {
  if (isUserMessage(message)) {
    return <UserMessage message={message} />;
  }

  if (isAssistantMessage(message)) {
    return <AssistantMessage message={message} isStreaming={isStreaming} />;
  }

  if (isToolResultMessage(message)) {
    return <ToolResultBlock message={message} />;
  }

  if (isCompactionSummaryMessage(message)) {
    return <CompactionSummary message={message} />;
  }

  if (isBranchSummaryMessage(message)) {
    return <BranchSummary message={message} />;
  }

  if (isBashExecutionMessage(message)) {
    return <BashExecutionBlock message={message} />;
  }

  if (isCustomMessage(message)) {
    if (!message.display) return null;
    return <CustomMessageBlock message={message} />;
  }

  // Unknown message type
  return (
    <div className="text-xs text-zinc-500">
      Unknown message type: {(message as any).role}
    </div>
  );
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
