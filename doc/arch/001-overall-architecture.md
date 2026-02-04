# ADR 001: Overall Architecture

**Status**: Accepted  
**Date**: 2026-02-04  
**Authors**: Initial architecture design

## Context

We need to build a web frontend for the pi coding agent that achieves full feature parity with the terminal TUI. The pi coding agent is a sophisticated AI coding assistant that:

- Executes real shell commands (bash) on the server
- Reads, edits, and writes files on the filesystem
- Runs TypeScript extensions with full Node.js API access
- Persists sessions to disk in a tree-based JSONL format
- Supports compaction, branching, forking, and complex session navigation

The existing `@mariozechner/pi-web-ui` package runs the Agent directly in the browser with browser-safe tools (JavaScript REPL, document extraction). This is fundamentally incompatible with our requirements for server-side tool execution.

We need to make several key architectural decisions:

1. How does the web frontend communicate with the pi agent?
2. What frontend framework and state management to use?
3. How to structure the codebase?
4. How to handle the various UI components (editor, tools, dialogs)?

## Decision

### 1. WebSocket Bridge to RPC Subprocess

**Decision**: Create a Node.js backend that spawns `pi --mode rpc` and bridges WebSocket ↔ stdio.

```
Browser (React) ←—WebSocket—→ Node.js Server ←—stdio—→ pi --mode rpc
```

**Alternatives Considered**:

| Alternative | Why Rejected |
|-------------|--------------|
| SDK directly in browser | Tools require filesystem/shell access; extensions need Node.js |
| Embed SDK in Node.js backend | Duplicates complex AgentSession logic; misses RPC protocol benefits |
| HTTP polling | High latency; doesn't fit streaming event model |
| Server-Sent Events | Unidirectional; commands need request-response |

**Rationale**:

- **RPC mode is battle-tested**: It's the official headless interface, already handling all edge cases
- **Automatic updates**: When pi updates, we inherit new features without code changes
- **WebSocket fits the protocol**: RPC uses line-based JSON streaming; WebSocket provides bidirectional streaming with low latency
- **Clean separation**: Frontend is purely UI; all agent logic stays in pi

### 2. React 19 + Zustand for Frontend

**Decision**: Use React 19 with Zustand for state management.

**Alternatives Considered**:

| Alternative | Why Rejected |
|-------------|--------------|
| Vue 3 | Smaller ecosystem for complex components (Monaco, virtualization) |
| Svelte | Less mature ecosystem; smaller community for enterprise patterns |
| Solid | Newer, less ecosystem support |
| Redux | Too much boilerplate for our state domains |
| MobX | More complex mental model than needed |
| Jotai/Recoil | Atomic state overkill for our clear state domains |

**Rationale**:

- **React ecosystem**: Best support for Monaco Editor, react-window (virtualization), markdown renderers
- **React 19 concurrent features**: Help with streaming updates without blocking UI
- **Zustand simplicity**: ~1KB, minimal boilerplate, perfect for our state domains:
  ```typescript
  // Connection state
  { connected: boolean, reconnecting: boolean }
  
  // Session state  
  { messages: AgentMessage[], isStreaming: boolean, model: Model }
  
  // UI state
  { sidebarOpen: boolean, activeDialog: DialogType }
  ```

### 3. Monorepo with Three Packages

**Decision**: Structure as a monorepo with `frontend`, `backend`, and `shared` packages.

```
pi-web/
├── packages/
│   ├── frontend/     # React app (browser)
│   ├── backend/      # WebSocket server (Node.js)
│   └── shared/       # TypeScript types
```

**Alternatives Considered**:

| Alternative | Why Rejected |
|-------------|--------------|
| Single package | Mixing browser/Node.js code causes bundling issues |
| Separate repos | Harder to keep types in sync; more CI complexity |

**Rationale**:

- **Clear boundaries**: Frontend never imports Node.js APIs, backend never imports React
- **Shared types**: RPC command/event types defined once, imported by both
- **Independent deployment**: Frontend can go to CDN, backend to different server
- **TypeScript configs**: Each package has appropriate lib settings (DOM vs Node)

### 4. Monaco Editor for Input and Diffs

**Decision**: Use Monaco Editor for the message input and diff viewing.

**Alternatives Considered**:

| Alternative | Why Rejected |
|-------------|--------------|
| Plain textarea | No syntax highlighting, poor multi-line UX |
| CodeMirror 6 | Lighter but less feature-rich; no built-in diff |
| Ace Editor | Older, less maintained |

**Rationale**:

- **Syntax highlighting**: Users often paste code snippets
- **Multi-line editing**: Proper cursor handling, selection, undo
- **Autocomplete infrastructure**: Slash command completion
- **Diff viewer built-in**: Essential for displaying edit tool results
- **Familiar UX**: Same editor as VS Code

**Trade-off acknowledged**: Monaco is ~2MB. Mitigation: lazy-load on first focus, show simple textarea initially.

### 5. Tailwind CSS v4

**Decision**: Use Tailwind CSS v4 for styling.

**Alternatives Considered**:

| Alternative | Why Rejected |
|-------------|--------------|
| CSS Modules | More files, slower iteration |
| styled-components | Runtime overhead, harder to see final CSS |
| Emotion | Same issues as styled-components |
| Plain CSS | Inconsistent design system, more code |

**Rationale**:

- **Rapid prototyping**: Style directly in JSX
- **Consistent design system**: Predefined spacing, colors, typography
- **Small production bundle**: Tree-shaking removes unused utilities
- **v4 improvements**: CSS-native (no PostCSS), faster builds, better dark mode via `@custom-media`

### 6. Promise-based RPC Client with Event Subscription

**Decision**: Design the RPC client with two interfaces:

```typescript
class RpcClient {
  // Request-response for commands
  async send<T>(command: RpcCommand): Promise<T>;
  
  // Push-based for events
  subscribe(listener: (event: RpcEvent) => void): () => void;
}
```

**Rationale**:

This mirrors the RPC protocol exactly:

- **Commands are request-response**: `set_model`, `compact`, `get_state` - send command, await response
- **Events are streaming**: `message_update`, `tool_execution_update` - arrive continuously during agent execution
- **ID correlation**: Commands include optional `id` field; responses include matching `id`

```typescript
// Usage
const state = await rpc.send({ type: 'get_state' });

const unsubscribe = rpc.subscribe((event) => {
  if (event.type === 'message_update') {
    updateMessages(event.message);
  }
});
```

### 7. Virtual Scrolling for Message List

**Decision**: Use virtualized rendering (react-window or @tanstack/virtual) for the message list.

**Rationale**:

- Sessions can contain **hundreds of messages**
- Tool outputs (especially bash) can be **very large**
- Without virtualization, scrolling becomes janky with 50+ messages
- Virtual rendering only creates DOM nodes for visible items

**Trade-off**: More implementation complexity, but essential for usability.

### 8. Modal Dialogs for Extension UI

**Decision**: Implement extension UI requests (select, confirm, input, editor) as modal dialogs.

**Rationale**:

- Extensions expect **blocking behavior**: `await ctx.ui.confirm(...)` waits for response
- Modals naturally block interaction with the rest of the app
- Maps directly to TUI behavior (full-screen dialogs)
- Clear user focus on the decision at hand

**Implementation**:

```typescript
// On extension_ui_request event
function handleExtensionUI(request: ExtensionUIRequest) {
  switch (request.method) {
    case 'confirm':
      showConfirmDialog(request.title, request.message)
        .then(confirmed => sendResponse(request.id, { confirmed }));
      break;
    // ... other methods
  }
}
```

### 9. Dedicated Session Tree Visualization

**Decision**: Build a tree visualization component for session navigation.

**Rationale**:

- Pi's session model is **tree-based**, not linear
- Users can branch at any message, creating alternate exploration paths
- TUI has `/tree` command - web needs a visual equivalent
- Tree view enables:
  - Understanding session structure at a glance
  - Click-to-navigate between branches
  - Viewing labels on nodes
  - Understanding where compactions/summaries occurred

**Implementation approach**: Use a tree layout library (D3.js tree layout or React Flow) with:
- User messages as branch-point nodes
- Edges representing parent-child relationships
- Visual indicators for current position, labels, summaries

### 10. Not Extending Existing pi-web-ui

**Decision**: Build a new codebase rather than extending `@mariozechner/pi-web-ui`.

**Rationale**:

The existing package has a fundamentally different architecture:

| Aspect | pi-web-ui | pi-web (ours) |
|--------|-----------|---------------|
| Agent execution | Browser | Server (via RPC) |
| Tools | JavaScript REPL, doc extraction | bash, read, edit, write |
| Session storage | IndexedDB | Server filesystem |
| Extensions | Not supported | Full support |
| Use case | Embed chat in web apps | Remote pi interface |

Attempting to retrofit would require:
- Ripping out the browser-based Agent
- Replacing all tools
- Adding RPC client
- Adding session tree support
- Adding extension UI protocol

Building fresh is cleaner and avoids legacy constraints.

## Consequences

### Positive

- **Full feature parity**: RPC mode provides complete pi functionality
- **Future-proof**: Updates to pi automatically available
- **Clean architecture**: Clear separation between UI and agent logic
- **Familiar stack**: React/TypeScript/Tailwind widely known
- **Scalable**: Virtualization handles large sessions

### Negative

- **Network dependency**: Requires WebSocket connection to backend
- **Bundle size**: Monaco Editor adds ~2MB (mitigated by lazy loading)
- **Implementation effort**: Building tree visualization, extension UI from scratch
- **No code reuse**: Can't leverage pi-web-ui components

### Risks

| Risk | Mitigation |
|------|------------|
| WebSocket disconnects | Implement reconnection with exponential backoff; queue commands during disconnect |
| RPC protocol changes | Pin pi version; add protocol version negotiation |
| Monaco performance | Lazy load; consider CodeMirror fallback for mobile |
| Large session performance | Virtualization; pagination; lazy message loading |

## References

- [Pi RPC Documentation](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/rpc.md)
- [Pi TUI Documentation](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/tui.md)
- [Pi Session Format](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/session.md)
- [Pi Extensions](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md)
- [Zustand](https://github.com/pmndrs/zustand)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4)
