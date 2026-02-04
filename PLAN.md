# Pi Web Frontend - Implementation Plan

A web application frontend that connects to a pi coding agent backend instance with full feature parity to the TUI.

## Overview

This project creates a web-based interface for the pi coding agent that communicates with a backend pi instance via the RPC protocol over WebSocket. The goal is to achieve complete feature parity with the existing terminal TUI.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Web Frontend (Browser)                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                        React/Preact App                         │ │
│  │  ┌──────────────────┐  ┌──────────────────────────────────────┐│ │
│  │  │   Chat Panel     │  │         Sidebar                      ││ │
│  │  │  - Message List  │  │  - Session Tree Navigator            ││ │
│  │  │  - Streaming     │  │  - Session Selector                  ││ │
│  │  │  - Tool Output   │  │  - Settings Panel                    ││ │
│  │  │  - Editor Input  │  │  - Model Selector                    ││ │
│  │  └──────────────────┘  └──────────────────────────────────────┘│ │
│  │                                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │                    Status Bar / Footer                    │  │ │
│  │  │  - Model Info | Thinking Level | Token Stats | Git Branch │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                │                                     │
│                                ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     RPC Client (WebSocket)                      │ │
│  │  - Command serialization/deserialization                        │ │
│  │  - Event streaming                                              │ │
│  │  - Extension UI protocol handling                               │ │
│  │  - Connection management & reconnection                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Backend (Node.js Server)                         │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                  WebSocket → stdio Bridge                       │ │
│  │  - Spawns pi --mode rpc process                                 │ │
│  │  - Bridges WebSocket ↔ stdin/stdout                             │ │
│  │  - Session management (multiple clients)                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                │                                     │
│                                ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    pi --mode rpc                                │ │
│  │  - Full coding agent functionality                              │ │
│  │  - Tool execution (bash, read, edit, write)                     │ │
│  │  - Extensions                                                   │ │
│  │  - Session persistence                                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand (lightweight, simple)
- **Code Editor**: Monaco Editor (for input, code blocks)
- **Markdown Rendering**: @uiw/react-markdown-preview or similar
- **Syntax Highlighting**: Shiki (consistent with TUI)
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js / Bun
- **WebSocket**: ws library
- **Process Management**: Spawn pi --mode rpc

### Shared
- **Types**: Import from @mariozechner/pi-coding-agent
- **Protocol**: JSON-RPC over WebSocket

## Feature Parity Matrix

### Core Chat Features

| TUI Feature | Web Implementation | Priority |
|-------------|-------------------|----------|
| Message streaming | WebSocket events → React state updates | P0 |
| Thinking blocks (collapsible) | Expandable component with syntax highlighting | P0 |
| Tool call/result display | Collapsible cards with syntax highlighting | P0 |
| User message display | Styled message bubbles with edit capability | P0 |
| Assistant message display | Markdown rendering with code blocks | P0 |
| Image attachments | Drag-drop, paste, file picker; thumbnail preview | P0 |
| Diff display (edit tool) | Monaco diff viewer or custom diff component | P1 |

### Input & Editor

| TUI Feature | Web Implementation | Priority |
|-------------|-------------------|----------|
| Multi-line input | Monaco/CodeMirror editor with auto-resize | P0 |
| Submit (Enter) | Submit button + keyboard shortcut | P0 |
| New line (Shift+Enter) | Native behavior | P0 |
| Slash commands autocomplete | Typeahead dropdown with fuzzy search | P0 |
| Image paste (Ctrl+V) | Clipboard API integration | P0 |
| Kill ring / undo | Browser native + custom implementation | P2 |
| External editor (Ctrl+G) | N/A (browser limitation) | N/A |
| Vim/Emacs bindings | Monaco keybinding modes | P2 |

### Session Management

| TUI Feature | Web Implementation | Priority |
|-------------|-------------------|----------|
| Session list (/resume) | Dialog/sidebar with search, sort | P0 |
| New session (/new) | Command + button | P0 |
| Session name (/name) | Inline rename in session list | P1 |
| Fork (/fork) | Fork dialog with message selection | P1 |
| Tree navigator (/tree) | Visual tree component with navigation | P1 |
| Session delete | Delete button with confirmation | P1 |
| Branch navigation | Click-to-navigate in tree view | P1 |
| Session export (HTML) | Download button | P2 |

### Model & Thinking

| TUI Feature | Web Implementation | Priority |
|-------------|-------------------|----------|
| Model selector (Ctrl+L) | Dropdown/dialog with search | P0 |
| Model cycling (Ctrl+P) | Keyboard shortcut + button | P0 |
| Thinking level selector | Dropdown with levels | P0 |
| Thinking level cycling (Shift+Tab) | Keyboard shortcut | P1 |
| Scoped models | Configure in settings | P2 |

### Streaming Control

| TUI Feature | Web Implementation | Priority |
|-------------|-------------------|----------|
| Abort (Escape) | Stop button + Escape key | P0 |
| Steer (interrupt) | Send during streaming with behavior flag | P1 |
| Follow-up queue (Alt+Enter) | Queue indicator + keyboard shortcut | P1 |
| Dequeue (Alt+Up) | Keyboard shortcut + button | P2 |

### Compaction

| TUI Feature | Web Implementation | Priority |
|-------------|-------------------|----------|
| Manual compaction | Command/button | P1 |
| Auto-compaction indicator | Status indicator | P1 |
| Compaction summary display | Special message type in chat | P1 |

### Tools Display

| TUI Feature | Web Implementation | Priority |
|-------------|-------------------|----------|
| Bash output streaming | Live-updating terminal component | P0 |
| File read with line numbers | Syntax-highlighted code block | P0 |
| File edit with diff | Side-by-side or unified diff view | P0 |
| File write preview | Syntax-highlighted with file path | P0 |
| Tool collapse/expand (Ctrl+O) | Toggle button + keyboard shortcut | P1 |
| Custom tool rendering | Pluggable renderer system | P2 |

### Extension UI

| TUI Feature | Web Implementation | Priority |
|-------------|-------------------|----------|
| Select dialog | Modal with options list | P0 |
| Confirm dialog | Modal with yes/no buttons | P0 |
| Input dialog | Modal with text input | P0 |
| Editor dialog | Modal with Monaco editor | P1 |
| Notifications | Toast notifications | P0 |
| Status bar entries | Footer status indicators | P1 |
| Widgets (above/below editor) | Positioned components | P2 |

### Settings

| TUI Feature | Web Implementation | Priority |
|-------------|-------------------|----------|
| Settings viewer (/settings) | Settings dialog/page | P1 |
| Theme selection (/theme) | Theme picker + live preview | P1 |
| Keybindings display | Keybindings reference panel | P2 |

### Footer/Status Bar

| TUI Feature | Web Implementation | Priority |
|-------------|-------------------|----------|
| Current model display | Always visible | P0 |
| Thinking level indicator | Color-coded badge | P0 |
| Token usage | Counter with cost estimate | P1 |
| Git branch | Display current branch | P2 |
| Extension statuses | Dynamic status items | P2 |

## Phase 1: Foundation (MVP)

### 1.1 Project Setup
- [ ] Initialize monorepo structure
  ```
  pi-web/
  ├── packages/
  │   ├── frontend/          # React web app
  │   ├── backend/           # WebSocket server
  │   └── shared/            # Shared types
  ├── package.json           # Workspace root
  └── turbo.json             # Build orchestration
  ```
- [ ] Set up TypeScript configuration
- [ ] Configure Vite for frontend
- [ ] Set up Tailwind CSS v4
- [ ] Configure ESLint/Prettier

### 1.2 Backend: WebSocket Bridge
- [ ] Create WebSocket server
- [ ] Implement pi process spawning (`pi --mode rpc`)
- [ ] Bridge WebSocket messages ↔ stdio
- [ ] Handle process lifecycle (start, restart, cleanup)
- [ ] Implement basic connection management

```typescript
// packages/backend/src/server.ts
interface PiSession {
  process: ChildProcess;
  ws: WebSocket;
  cwd: string;
}

// Spawn pi for each connection
function createSession(ws: WebSocket, cwd: string): PiSession {
  const proc = spawn('pi', ['--mode', 'rpc'], { cwd });
  
  // Bridge stdout → WebSocket
  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach(line => ws.send(line));
  });
  
  // Bridge WebSocket → stdin
  ws.on('message', (msg) => {
    proc.stdin.write(msg + '\n');
  });
  
  return { process: proc, ws, cwd };
}
```

### 1.3 Frontend: RPC Client
- [ ] WebSocket connection management
- [ ] Command sending with ID tracking
- [ ] Event stream parsing
- [ ] Promise-based command responses
- [ ] Reconnection logic

```typescript
// packages/frontend/src/rpc/client.ts
class RpcClient {
  private ws: WebSocket;
  private pendingCommands: Map<string, { resolve, reject }>;
  private eventListeners: ((event: RpcEvent) => void)[];
  
  async connect(url: string): Promise<void>;
  async send<T>(command: RpcCommand): Promise<T>;
  subscribe(listener: (event: RpcEvent) => void): () => void;
  disconnect(): void;
}
```

### 1.4 Frontend: Core UI Components
- [ ] App shell with layout (chat panel, sidebar, footer)
- [ ] Message list component with virtualization
- [ ] Message input editor (basic)
- [ ] Submit button and keyboard handling
- [ ] Loading/streaming indicators

### 1.5 Frontend: Message Rendering
- [ ] User message component
- [ ] Assistant message component with Markdown
- [ ] Thinking block component (collapsible)
- [ ] Basic tool result component

### 1.6 Frontend: State Management
- [ ] Zustand store for:
  - Connection state
  - Messages array
  - Streaming state
  - Current model/thinking level
  - Session info

## Phase 2: Tool Display

### 2.1 Tool Execution Components
- [ ] Bash tool component with:
  - Streaming output display
  - Exit code indicator
  - Truncation handling
  - Copy button
- [ ] Read tool component with:
  - Syntax highlighting
  - Line numbers
  - File path header
- [ ] Edit tool component with:
  - Diff view (Monaco or custom)
  - Old/new comparison
  - Added/removed line highlighting
- [ ] Write tool component with:
  - Syntax highlighting
  - File path header
  - Preview of created content

### 2.2 Tool Display Controls
- [ ] Collapse/expand toggle (global)
- [ ] Per-tool collapse state
- [ ] Keyboard shortcut (Ctrl+O)

## Phase 3: Session Management

### 3.1 Session Selector
- [ ] Session list dialog/panel
- [ ] Fetch session list via RPC
- [ ] Search/filter functionality
- [ ] Sort options (recent, name)
- [ ] Session preview (first message, message count)
- [ ] Load session on select

### 3.2 Session Operations
- [ ] New session command
- [ ] Session rename
- [ ] Session delete with confirmation
- [ ] Fork session (select message to fork from)

### 3.3 Session Tree Navigator
- [ ] Tree visualization component
- [ ] Node display (user messages as nodes)
- [ ] Branch indicators
- [ ] Labels display
- [ ] Click-to-navigate
- [ ] Summary generation on branch switch

## Phase 4: Model & Settings

### 4.1 Model Selector
- [ ] Model picker dialog
- [ ] Available models list
- [ ] Search/filter
- [ ] Current model indicator
- [ ] Model cycling (keyboard shortcut)

### 4.2 Thinking Level
- [ ] Thinking level selector dropdown
- [ ] Level indicators with colors
- [ ] Cycle through levels

### 4.3 Settings Panel
- [ ] Settings dialog
- [ ] Display current settings
- [ ] Theme selector
- [ ] Keybindings reference

## Phase 5: Extension UI

### 5.1 Extension Dialogs
- [ ] Select dialog component
- [ ] Confirm dialog component
- [ ] Input dialog component
- [ ] Editor dialog component
- [ ] Dialog queue management

### 5.2 Extension Status
- [ ] Status bar extension entries
- [ ] Widget components (above/below editor)
- [ ] Notification toast system

### 5.3 Extension UI Protocol
- [ ] Handle `extension_ui_request` events
- [ ] Send `extension_ui_response` commands
- [ ] Timeout handling

## Phase 6: Advanced Features

### 6.1 Streaming Control
- [ ] Steer (interrupt) functionality
- [ ] Follow-up queue
- [ ] Message queue indicator
- [ ] Dequeue functionality

### 6.2 Compaction
- [ ] Manual compaction trigger
- [ ] Auto-compaction indicator
- [ ] Compaction summary display

### 6.3 Input Enhancements
- [ ] Slash command autocomplete
- [ ] Fuzzy search for commands
- [ ] Image paste handling
- [ ] Drag-drop images

### 6.4 Export & Sharing
- [ ] Export session to HTML
- [ ] Copy message content

## Phase 7: Polish

### 7.1 Theming
- [ ] Light/dark mode toggle
- [ ] Custom color themes
- [ ] Theme persistence

### 7.2 Keyboard Shortcuts
- [ ] Comprehensive keyboard navigation
- [ ] Shortcuts help overlay
- [ ] Customizable bindings (future)

### 7.3 Responsive Design
- [ ] Mobile-friendly layout
- [ ] Touch interactions
- [ ] Collapsible sidebar

### 7.4 Performance
- [ ] Message list virtualization
- [ ] Lazy loading for long sessions
- [ ] Code splitting

## RPC Commands Reference

### Commands to Implement

```typescript
// Prompting
{ type: "prompt", message: string, images?: ImageContent[], streamingBehavior?: "steer" | "followUp" }
{ type: "steer", message: string }
{ type: "follow_up", message: string }
{ type: "abort" }
{ type: "new_session", parentSession?: string }

// State
{ type: "get_state" }
{ type: "get_messages" }

// Model
{ type: "set_model", provider: string, modelId: string }
{ type: "cycle_model" }
{ type: "get_available_models" }

// Thinking
{ type: "set_thinking_level", level: ThinkingLevel }
{ type: "cycle_thinking_level" }

// Queue Modes
{ type: "set_steering_mode", mode: "all" | "one-at-a-time" }
{ type: "set_follow_up_mode", mode: "all" | "one-at-a-time" }

// Compaction
{ type: "compact", customInstructions?: string }
{ type: "set_auto_compaction", enabled: boolean }

// Retry
{ type: "set_auto_retry", enabled: boolean }
{ type: "abort_retry" }

// Bash
{ type: "bash", command: string }
{ type: "abort_bash" }

// Session
{ type: "get_session_stats" }
{ type: "export_html", outputPath?: string }
{ type: "switch_session", sessionPath: string }
{ type: "fork", entryId: string }
{ type: "get_fork_messages" }
{ type: "get_last_assistant_text" }
{ type: "set_session_name", name: string }

// Commands
{ type: "get_commands" }
```

### Events to Handle

```typescript
// Agent lifecycle
{ type: "agent_start" }
{ type: "agent_end", messages: AgentMessage[] }
{ type: "turn_start" }
{ type: "turn_end", message: AssistantMessage, toolResults: ToolResultMessage[] }

// Message streaming
{ type: "message_start", message: AgentMessage }
{ type: "message_update", message: AgentMessage, assistantMessageEvent: StreamingEvent }
{ type: "message_end", message: AgentMessage }

// Tool execution
{ type: "tool_execution_start", toolCallId: string, toolName: string, args: any }
{ type: "tool_execution_update", toolCallId: string, toolName: string, partialResult: any }
{ type: "tool_execution_end", toolCallId: string, toolName: string, result: any, isError: boolean }

// Compaction
{ type: "auto_compaction_start", reason: string }
{ type: "auto_compaction_end", result: CompactionResult, aborted: boolean, willRetry: boolean }

// Retry
{ type: "auto_retry_start", attempt: number, maxAttempts: number, delayMs: number, errorMessage: string }
{ type: "auto_retry_end", success: boolean, attempt: number, finalError?: string }

// Extension UI
{ type: "extension_ui_request", id: string, method: string, ... }

// Errors
{ type: "extension_error", extensionPath: string, event: string, error: string }
```

## File Structure

```
pi-web/
├── packages/
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── chat/
│   │   │   │   │   ├── ChatPanel.tsx
│   │   │   │   │   ├── MessageList.tsx
│   │   │   │   │   ├── MessageInput.tsx
│   │   │   │   │   ├── UserMessage.tsx
│   │   │   │   │   ├── AssistantMessage.tsx
│   │   │   │   │   └── ThinkingBlock.tsx
│   │   │   │   ├── tools/
│   │   │   │   │   ├── ToolResult.tsx
│   │   │   │   │   ├── BashTool.tsx
│   │   │   │   │   ├── ReadTool.tsx
│   │   │   │   │   ├── EditTool.tsx
│   │   │   │   │   └── WriteTool.tsx
│   │   │   │   ├── session/
│   │   │   │   │   ├── SessionSelector.tsx
│   │   │   │   │   ├── SessionTree.tsx
│   │   │   │   │   └── ForkDialog.tsx
│   │   │   │   ├── dialogs/
│   │   │   │   │   ├── ModelSelector.tsx
│   │   │   │   │   ├── SettingsDialog.tsx
│   │   │   │   │   ├── ExtensionSelect.tsx
│   │   │   │   │   ├── ExtensionConfirm.tsx
│   │   │   │   │   └── ExtensionInput.tsx
│   │   │   │   ├── layout/
│   │   │   │   │   ├── AppShell.tsx
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   └── Footer.tsx
│   │   │   │   └── ui/
│   │   │   │       ├── Button.tsx
│   │   │   │       ├── Dialog.tsx
│   │   │   │       ├── Dropdown.tsx
│   │   │   │       └── Toast.tsx
│   │   │   ├── rpc/
│   │   │   │   ├── client.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── hooks.ts
│   │   │   ├── store/
│   │   │   │   ├── index.ts
│   │   │   │   ├── session.ts
│   │   │   │   ├── ui.ts
│   │   │   │   └── connection.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useRpc.ts
│   │   │   │   ├── useMessages.ts
│   │   │   │   └── useKeyboard.ts
│   │   │   ├── utils/
│   │   │   │   ├── markdown.ts
│   │   │   │   ├── syntax.ts
│   │   │   │   └── diff.ts
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── index.css
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   ├── backend/
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── session-manager.ts
│   │   │   └── bridge.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/
│       ├── src/
│       │   └── types.ts
│       ├── package.json
│       └── tsconfig.json
│
├── package.json
├── turbo.json
├── pnpm-workspace.yaml
├── README.md
├── PLAN.md
└── .gitignore
```

## Implementation Notes

### WebSocket Protocol
- Each message is a single JSON line
- Commands include optional `id` for correlation
- Responses have `type: "response"` with matching `id`
- Events stream independently without `id`

### State Synchronization
- Initial state fetched via `get_state` and `get_messages`
- Updates via event subscription
- Optimistic UI updates where appropriate

### Error Handling
- Connection errors → reconnection with backoff
- Command errors → display to user
- Extension errors → notification

### Security Considerations
- Backend validates workspace paths
- No direct shell access from frontend
- CORS configuration for WebSocket

## Open Questions

1. **Multi-user support**: Should multiple users connect to the same session?
2. **Authentication**: How to secure the WebSocket connection?
3. **File system access**: How to handle file picker for images?
4. **Persistent settings**: Store in localStorage or backend?
5. **Offline support**: Cache messages locally?

## References

- [RPC Documentation](../pi-mono/packages/coding-agent/docs/rpc.md)
- [TUI Components](../pi-mono/packages/coding-agent/docs/tui.md)
- [SDK Documentation](../pi-mono/packages/coding-agent/docs/sdk.md)
- [Session Format](../pi-mono/packages/coding-agent/docs/session.md)
- [Extensions](../pi-mono/packages/coding-agent/docs/extensions.md)
- [Keybindings](../pi-mono/packages/coding-agent/docs/keybindings.md)
