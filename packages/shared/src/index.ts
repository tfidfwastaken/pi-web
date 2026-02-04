/**
 * Shared types for pi-web frontend and backend.
 * These mirror the pi coding agent RPC protocol types.
 */

// ============================================================================
// Base Types (from pi-ai)
// ============================================================================

export interface TextContent {
  type: "text";
  text: string;
}

export interface ThinkingContent {
  type: "thinking";
  thinking: string;
}

export interface ImageContent {
  type: "image";
  data: string; // base64 encoded
  mimeType: string;
}

export interface ToolCall {
  type: "toolCall";
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
}

export type StopReason = "stop" | "length" | "toolUse" | "error" | "aborted";

export interface UserMessage {
  role: "user";
  content: string | (TextContent | ImageContent)[];
  timestamp: number;
}

export interface AssistantMessage {
  role: "assistant";
  content: (TextContent | ThinkingContent | ToolCall)[];
  api: string;
  provider: string;
  model: string;
  usage: Usage;
  stopReason: StopReason;
  errorMessage?: string;
  timestamp: number;
}

export interface ToolResultMessage {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: (TextContent | ImageContent)[];
  details?: unknown;
  isError: boolean;
  timestamp: number;
}

// Extended message types from pi-coding-agent
export interface BashExecutionMessage {
  role: "bashExecution";
  command: string;
  output: string;
  exitCode: number | undefined;
  cancelled: boolean;
  truncated: boolean;
  fullOutputPath?: string;
  excludeFromContext?: boolean;
  timestamp: number;
}

export interface CustomMessage {
  role: "custom";
  customType: string;
  content: string | (TextContent | ImageContent)[];
  display: boolean;
  details?: unknown;
  timestamp: number;
}

export interface BranchSummaryMessage {
  role: "branchSummary";
  summary: string;
  fromId: string;
  timestamp: number;
}

export interface CompactionSummaryMessage {
  role: "compactionSummary";
  summary: string;
  tokensBefore: number;
  timestamp: number;
}

export type AgentMessage =
  | UserMessage
  | AssistantMessage
  | ToolResultMessage
  | BashExecutionMessage
  | CustomMessage
  | BranchSummaryMessage
  | CompactionSummaryMessage;

// ============================================================================
// Model Types
// ============================================================================

export interface Model {
  api: string;
  provider: string;
  id: string;
  name?: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  inputPrice?: number;
  outputPrice?: number;
  supportsImages?: boolean;
  supportsThinking?: boolean;
  thinkingBudgets?: ThinkingBudgets;
}

export interface ThinkingBudgets {
  minimal?: number;
  low?: number;
  medium?: number;
  high?: number;
}

export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

// ============================================================================
// Session Types
// ============================================================================

export interface SessionStats {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalCost: number;
  messageCount: number;
  turnCount: number;
}

export interface CompactionResult {
  success: boolean;
  summary?: string;
  tokensBefore?: number;
  tokensAfter?: number;
  error?: string;
}

export interface BashResult {
  output: string;
  exitCode: number | undefined;
  cancelled: boolean;
  truncated: boolean;
  fullOutputPath?: string;
}

// ============================================================================
// RPC State
// ============================================================================

export interface RpcSessionState {
  model?: Model;
  thinkingLevel: ThinkingLevel;
  isStreaming: boolean;
  isCompacting: boolean;
  steeringMode: "all" | "one-at-a-time";
  followUpMode: "all" | "one-at-a-time";
  sessionFile?: string;
  sessionId: string;
  sessionName?: string;
  autoCompactionEnabled: boolean;
  messageCount: number;
  pendingMessageCount: number;
}

// ============================================================================
// RPC Commands (client → server)
// ============================================================================

export type RpcCommand =
  // Prompting
  | { id?: string; type: "prompt"; message: string; images?: ImageContent[]; streamingBehavior?: "steer" | "followUp" }
  | { id?: string; type: "steer"; message: string }
  | { id?: string; type: "follow_up"; message: string }
  | { id?: string; type: "abort" }
  | { id?: string; type: "new_session"; parentSession?: string }

  // State
  | { id?: string; type: "get_state" }

  // Model
  | { id?: string; type: "set_model"; provider: string; modelId: string }
  | { id?: string; type: "cycle_model" }
  | { id?: string; type: "get_available_models" }

  // Thinking
  | { id?: string; type: "set_thinking_level"; level: ThinkingLevel }
  | { id?: string; type: "cycle_thinking_level" }

  // Queue modes
  | { id?: string; type: "set_steering_mode"; mode: "all" | "one-at-a-time" }
  | { id?: string; type: "set_follow_up_mode"; mode: "all" | "one-at-a-time" }

  // Compaction
  | { id?: string; type: "compact"; customInstructions?: string }
  | { id?: string; type: "set_auto_compaction"; enabled: boolean }

  // Retry
  | { id?: string; type: "set_auto_retry"; enabled: boolean }
  | { id?: string; type: "abort_retry" }

  // Bash
  | { id?: string; type: "bash"; command: string }
  | { id?: string; type: "abort_bash" }

  // Session
  | { id?: string; type: "get_session_stats" }
  | { id?: string; type: "export_html"; outputPath?: string }
  | { id?: string; type: "switch_session"; sessionPath: string }
  | { id?: string; type: "fork"; entryId: string }
  | { id?: string; type: "get_fork_messages" }
  | { id?: string; type: "get_last_assistant_text" }
  | { id?: string; type: "set_session_name"; name: string }

  // Messages
  | { id?: string; type: "get_messages" }

  // Commands
  | { id?: string; type: "get_commands" }

  // Session list (custom for web)
  | { id?: string; type: "list_sessions" };

export type RpcCommandType = RpcCommand["type"];

// ============================================================================
// RPC Slash Commands
// ============================================================================

export interface RpcSlashCommand {
  name: string;
  description?: string;
  source: "extension" | "prompt" | "skill";
  location?: "user" | "project" | "path";
  path?: string;
}

// ============================================================================
// RPC Responses (server → client)
// ============================================================================

export type RpcResponse =
  // Prompting
  | { id?: string; type: "response"; command: "prompt"; success: true }
  | { id?: string; type: "response"; command: "steer"; success: true }
  | { id?: string; type: "response"; command: "follow_up"; success: true }
  | { id?: string; type: "response"; command: "abort"; success: true }
  | { id?: string; type: "response"; command: "new_session"; success: true; data: { cancelled: boolean } }

  // State
  | { id?: string; type: "response"; command: "get_state"; success: true; data: RpcSessionState }

  // Model
  | { id?: string; type: "response"; command: "set_model"; success: true; data: Model }
  | {
      id?: string;
      type: "response";
      command: "cycle_model";
      success: true;
      data: { model: Model; thinkingLevel: ThinkingLevel; isScoped: boolean } | null;
    }
  | { id?: string; type: "response"; command: "get_available_models"; success: true; data: { models: Model[] } }

  // Thinking
  | { id?: string; type: "response"; command: "set_thinking_level"; success: true }
  | { id?: string; type: "response"; command: "cycle_thinking_level"; success: true; data: { level: ThinkingLevel } | null }

  // Queue modes
  | { id?: string; type: "response"; command: "set_steering_mode"; success: true }
  | { id?: string; type: "response"; command: "set_follow_up_mode"; success: true }

  // Compaction
  | { id?: string; type: "response"; command: "compact"; success: true; data: CompactionResult }
  | { id?: string; type: "response"; command: "set_auto_compaction"; success: true }

  // Retry
  | { id?: string; type: "response"; command: "set_auto_retry"; success: true }
  | { id?: string; type: "response"; command: "abort_retry"; success: true }

  // Bash
  | { id?: string; type: "response"; command: "bash"; success: true; data: BashResult }
  | { id?: string; type: "response"; command: "abort_bash"; success: true }

  // Session
  | { id?: string; type: "response"; command: "get_session_stats"; success: true; data: SessionStats }
  | { id?: string; type: "response"; command: "export_html"; success: true; data: { path: string } }
  | { id?: string; type: "response"; command: "switch_session"; success: true; data: { cancelled: boolean } }
  | { id?: string; type: "response"; command: "fork"; success: true; data: { text: string; cancelled: boolean } }
  | {
      id?: string;
      type: "response";
      command: "get_fork_messages";
      success: true;
      data: { messages: Array<{ entryId: string; text: string }> };
    }
  | { id?: string; type: "response"; command: "get_last_assistant_text"; success: true; data: { text: string | null } }
  | { id?: string; type: "response"; command: "set_session_name"; success: true }

  // Messages
  | { id?: string; type: "response"; command: "get_messages"; success: true; data: { messages: AgentMessage[] } }

  // Commands
  | { id?: string; type: "response"; command: "get_commands"; success: true; data: { commands: RpcSlashCommand[] } }

  // Session list (custom)
  | { id?: string; type: "response"; command: "list_sessions"; success: true; data: { sessions: SessionInfo[] } }

  // Error
  | { id?: string; type: "response"; command: string; success: false; error: string };

// ============================================================================
// RPC Events (server → client, unprompted)
// ============================================================================

export type RpcEvent =
  // Agent lifecycle
  | { type: "agent_start" }
  | { type: "agent_end"; messages: AgentMessage[] }
  | { type: "turn_start" }
  | { type: "turn_end"; message: AssistantMessage; toolResults: ToolResultMessage[] }

  // Message streaming
  | { type: "message_start"; message: AgentMessage }
  | { type: "message_update"; message: AgentMessage; assistantMessageEvent: AssistantMessageEvent }
  | { type: "message_end"; message: AgentMessage }

  // Tool execution
  | { type: "tool_execution_start"; toolCallId: string; toolName: string; args: unknown }
  | { type: "tool_execution_update"; toolCallId: string; toolName: string; partialResult: unknown }
  | { type: "tool_execution_end"; toolCallId: string; toolName: string; result: unknown; isError: boolean }

  // Compaction
  | { type: "auto_compaction_start"; reason: string }
  | { type: "auto_compaction_end"; result: CompactionResult; aborted: boolean; willRetry: boolean }

  // Retry
  | { type: "auto_retry_start"; attempt: number; maxAttempts: number; delayMs: number; errorMessage: string }
  | { type: "auto_retry_end"; success: boolean; attempt: number; finalError?: string }

  // Extension UI requests
  | RpcExtensionUIRequest

  // Errors
  | { type: "extension_error"; extensionPath: string; event: string; error: string };

// ============================================================================
// Assistant Message Events (for streaming)
// ============================================================================

export type AssistantMessageEvent =
  | { type: "start"; partial: AssistantMessage }
  | { type: "text_start"; contentIndex: number; partial: AssistantMessage }
  | { type: "text_delta"; contentIndex: number; delta: string; partial: AssistantMessage }
  | { type: "text_end"; contentIndex: number; content: string; partial: AssistantMessage }
  | { type: "thinking_start"; contentIndex: number; partial: AssistantMessage }
  | { type: "thinking_delta"; contentIndex: number; delta: string; partial: AssistantMessage }
  | { type: "thinking_end"; contentIndex: number; content: string; partial: AssistantMessage }
  | { type: "tool_call_start"; contentIndex: number; partial: AssistantMessage }
  | { type: "tool_call_delta"; contentIndex: number; argumentsDelta: string; partial: AssistantMessage }
  | { type: "tool_call_end"; contentIndex: number; toolCall: ToolCall; partial: AssistantMessage }
  | { type: "end"; message: AssistantMessage };

// ============================================================================
// Extension UI Types
// ============================================================================

export type RpcExtensionUIRequest =
  | { type: "extension_ui_request"; id: string; method: "select"; title: string; options: string[]; timeout?: number }
  | { type: "extension_ui_request"; id: string; method: "confirm"; title: string; message: string; timeout?: number }
  | { type: "extension_ui_request"; id: string; method: "input"; title: string; placeholder?: string; timeout?: number }
  | { type: "extension_ui_request"; id: string; method: "editor"; title: string; prefill?: string }
  | { type: "extension_ui_request"; id: string; method: "notify"; message: string; notifyType?: "info" | "warning" | "error" }
  | { type: "extension_ui_request"; id: string; method: "setStatus"; statusKey: string; statusText: string | undefined }
  | {
      type: "extension_ui_request";
      id: string;
      method: "setWidget";
      widgetKey: string;
      widgetLines: string[] | undefined;
      widgetPlacement?: "aboveEditor" | "belowEditor";
    }
  | { type: "extension_ui_request"; id: string; method: "setTitle"; title: string }
  | { type: "extension_ui_request"; id: string; method: "set_editor_text"; text: string };

export type RpcExtensionUIResponse =
  | { type: "extension_ui_response"; id: string; value: string }
  | { type: "extension_ui_response"; id: string; confirmed: boolean }
  | { type: "extension_ui_response"; id: string; cancelled: true };

// ============================================================================
// Session Info (for session list)
// ============================================================================

export interface SessionInfo {
  path: string;
  id: string;
  name?: string;
  cwd: string;
  timestamp: string;
  messageCount: number;
  firstMessage?: string;
  lastModified: string;
}

// ============================================================================
// WebSocket Protocol
// ============================================================================

/** Message sent over WebSocket (client → server) */
export type WsClientMessage =
  | RpcCommand
  | RpcExtensionUIResponse
  | { type: "connect"; cwd: string };

/** Message sent over WebSocket (server → client) */
export type WsServerMessage =
  | RpcResponse
  | RpcEvent
  | { type: "connected"; sessionId: string }
  | { type: "disconnected"; reason: string }
  | { type: "error"; message: string };

// ============================================================================
// Type Guards
// ============================================================================

export function isUserMessage(msg: AgentMessage): msg is UserMessage {
  return msg.role === "user";
}

export function isAssistantMessage(msg: AgentMessage): msg is AssistantMessage {
  return msg.role === "assistant";
}

export function isToolResultMessage(msg: AgentMessage): msg is ToolResultMessage {
  return msg.role === "toolResult";
}

export function isBashExecutionMessage(msg: AgentMessage): msg is BashExecutionMessage {
  return msg.role === "bashExecution";
}

export function isCustomMessage(msg: AgentMessage): msg is CustomMessage {
  return msg.role === "custom";
}

export function isCompactionSummaryMessage(msg: AgentMessage): msg is CompactionSummaryMessage {
  return msg.role === "compactionSummary";
}

export function isBranchSummaryMessage(msg: AgentMessage): msg is BranchSummaryMessage {
  return msg.role === "branchSummary";
}

export function isRpcResponse(msg: WsServerMessage): msg is RpcResponse {
  return msg.type === "response";
}

export function isRpcEvent(msg: WsServerMessage): msg is RpcEvent {
  return !isRpcResponse(msg) && msg.type !== "connected" && msg.type !== "disconnected" && msg.type !== "error";
}

export function isExtensionUIRequest(event: RpcEvent): event is RpcExtensionUIRequest {
  return event.type === "extension_ui_request";
}

// ============================================================================
// Utility Types
// ============================================================================

export type MessageRole = AgentMessage["role"];

export function getMessageText(msg: AgentMessage): string {
  if (isUserMessage(msg)) {
    if (typeof msg.content === "string") return msg.content;
    return msg.content
      .filter((c): c is TextContent => c.type === "text")
      .map((c) => c.text)
      .join("\n");
  }
  if (isAssistantMessage(msg)) {
    return msg.content
      .filter((c): c is TextContent => c.type === "text")
      .map((c) => c.text)
      .join("\n");
  }
  if (isToolResultMessage(msg)) {
    return msg.content
      .filter((c): c is TextContent => c.type === "text")
      .map((c) => c.text)
      .join("\n");
  }
  if (isBashExecutionMessage(msg)) {
    return msg.output;
  }
  if (isCustomMessage(msg)) {
    if (typeof msg.content === "string") return msg.content;
    return msg.content
      .filter((c): c is TextContent => c.type === "text")
      .map((c) => c.text)
      .join("\n");
  }
  if (isCompactionSummaryMessage(msg)) {
    return msg.summary;
  }
  if (isBranchSummaryMessage(msg)) {
    return msg.summary;
  }
  return "";
}
