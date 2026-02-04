# Pi Web Frontend

A web application frontend for the [pi coding agent](https://github.com/badlogic/pi-mono) with full feature parity to the terminal TUI.

## Status

🚧 **In Development** - See [PLAN.md](./PLAN.md) for the implementation roadmap.

## Overview

Pi Web provides a browser-based interface to interact with a pi coding agent backend instance. It communicates via WebSocket using the pi RPC protocol, enabling:

- Full chat interface with streaming responses
- Tool execution display (bash, read, edit, write)
- Session management (tree-based branching, forking)
- Model and thinking level selection
- Extension UI support (dialogs, notifications, widgets)
- Theming and keyboard shortcuts

## Architecture

```
Browser                          Server
┌──────────────┐                ┌──────────────┐
│  React App   │  WebSocket     │  Node.js     │
│  - Chat UI   │ ──────────────▶│  - WS Server │
│  - Dialogs   │                │  - Bridge    │
│  - Settings  │◀────────────── │  - Process   │
└──────────────┘                └──────────────┘
                                      │
                                      │ stdio
                                      ▼
                                ┌──────────────┐
                                │ pi --mode rpc│
                                │  - Agent     │
                                │  - Tools     │
                                │  - Sessions  │
                                └──────────────┘
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server (frontend + backend)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Configuration

Create a `.env` file:

```env
# Backend port
PORT=3001

# Frontend WebSocket URL
VITE_WS_URL=ws://localhost:3001

# Default working directory for pi
PI_CWD=/path/to/project
```

## Features

### Implemented
- [ ] WebSocket connection to backend
- [ ] Chat message display
- [ ] Message streaming
- [ ] Tool result rendering
- [ ] Model selection
- [ ] Session management
- [ ] Extension UI dialogs

See [PLAN.md](./PLAN.md) for the complete feature matrix and implementation status.

## Development

### Project Structure

```
pi-web/
├── packages/
│   ├── frontend/     # React web application
│   ├── backend/      # WebSocket server
│   └── shared/       # Shared TypeScript types
├── PLAN.md           # Implementation roadmap
└── README.md         # This file
```

### Key Technologies

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Zustand, Vite
- **Backend**: Node.js, WebSocket (ws)
- **Protocol**: JSON-RPC over WebSocket

## Related Projects

- [pi-mono](https://github.com/badlogic/pi-mono) - Pi coding agent monorepo
- [@mariozechner/pi-coding-agent](https://www.npmjs.com/package/@mariozechner/pi-coding-agent) - Pi CLI
- [@mariozechner/pi-web-ui](https://www.npmjs.com/package/@mariozechner/pi-web-ui) - Browser-based chat UI (different scope)

## License

MIT
