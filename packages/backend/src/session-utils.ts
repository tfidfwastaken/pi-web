/**
 * Utilities for reading and parsing pi session files
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as readline from "node:readline";
import type { SessionInfo, SessionTreeNode } from "@pi-web/shared";

// ============================================================================
// Session File Types (matching pi-mono structure)
// ============================================================================

interface SessionHeader {
  type: "session";
  version?: number;
  id: string;
  timestamp: string;
  cwd: string;
  parentSession?: string;
}

interface SessionEntryBase {
  type: string;
  id: string;
  parentId: string | null;
  timestamp: string;
}

interface SessionMessageEntry extends SessionEntryBase {
  type: "message";
  message: {
    role: string;
    content: unknown;
    timestamp?: number;
  };
}

interface LabelEntry extends SessionEntryBase {
  type: "label";
  targetId: string;
  labelName: string;
}

interface CompactionEntry extends SessionEntryBase {
  type: "compaction";
  summary: string;
  tokensBefore: number;
  tokensAfter: number;
}

interface BranchSummaryEntry extends SessionEntryBase {
  type: "branch_summary";
  summary: string;
  fromId: string;
}

interface SessionInfoEntry extends SessionEntryBase {
  type: "session_info";
  name?: string;
}

type SessionEntry =
  | SessionMessageEntry
  | LabelEntry
  | CompactionEntry
  | BranchSummaryEntry
  | SessionInfoEntry
  | SessionEntryBase;

type FileEntry = SessionHeader | SessionEntry;

// ============================================================================
// Directory Helpers
// ============================================================================

function getAgentDir(): string {
  return path.join(os.homedir(), ".pi", "agent");
}

function getSessionsDir(): string {
  return path.join(getAgentDir(), "sessions");
}

function getProjectSessionsDir(cwd: string): string {
  return path.join(cwd, ".pi", "sessions");
}

// ============================================================================
// Session Listing
// ============================================================================

/**
 * Convert a cwd path to the directory name used by pi for session storage
 * e.g., /home/user/project -> --home-user-project--
 * Matches pi-mono's getDefaultSessionDir logic
 */
function cwdToSessionDirName(cwd: string): string {
  // Remove leading slash, replace remaining slashes with dashes, wrap with --
  return `--${cwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;
}

/**
 * List all sessions for a given working directory
 */
export async function listSessions(cwd: string): Promise<SessionInfo[]> {
  const sessions: SessionInfo[] = [];

  // Check global sessions directory
  const globalDir = getSessionsDir();
  if (fs.existsSync(globalDir)) {
    // Sessions are stored in subdirectories named after the cwd
    const cwdDirName = cwdToSessionDirName(cwd);
    const cwdSessionDir = path.join(globalDir, cwdDirName);
    
    if (fs.existsSync(cwdSessionDir)) {
      const cwdSessions = await listSessionsFromDir(cwdSessionDir);
      sessions.push(...cwdSessions);
    }
  }

  // Check project-local sessions directory
  const projectDir = getProjectSessionsDir(cwd);
  if (fs.existsSync(projectDir)) {
    const projectSessions = await listSessionsFromDir(projectDir);
    sessions.push(...projectSessions);
  }

  // Sort by last modified (most recent first)
  sessions.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

  return sessions;
}

async function listSessionsFromDir(dir: string): Promise<SessionInfo[]> {
  const sessions: SessionInfo[] = [];

  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const filePath = path.join(dir, entry.name);
      
      // Handle .jsonl files directly in this directory
      if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        try {
          const info = await parseSessionInfo(filePath);
          sessions.push(info);
        } catch (error) {
          // Skip invalid session files
          console.error(`Failed to parse session file ${entry.name}:`, error);
        }
      }
      
      // Also check subdirectories (for nested session organization)
      if (entry.isDirectory()) {
        const subSessions = await listSessionsFromDir(filePath);
        sessions.push(...subSessions);
      }
    }
  } catch (error) {
    console.error(`Failed to read sessions directory ${dir}:`, error);
  }

  return sessions;
}

async function parseSessionInfo(filePath: string): Promise<SessionInfo> {
  const stats = await fs.promises.stat(filePath);

  // Read just the first few lines to get header and first message
  const lines = await readFirstLines(filePath, 50);

  let header: SessionHeader | null = null;
  let firstUserMessage = "";
  let messageCount = 0;
  let sessionName: string | undefined;

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const entry = JSON.parse(line) as FileEntry;

      if (entry.type === "session") {
        header = entry as SessionHeader;
      } else if (entry.type === "message") {
        const msgEntry = entry as SessionMessageEntry;
        messageCount++;
        if (!firstUserMessage && msgEntry.message.role === "user") {
          const content = msgEntry.message.content;
          if (typeof content === "string") {
            firstUserMessage = content.slice(0, 200);
          } else if (Array.isArray(content)) {
            const textPart = content.find((c: unknown) => (c as { type: string }).type === "text");
            if (textPart && "text" in (textPart as object)) {
              firstUserMessage = ((textPart as { text: string }).text || "").slice(0, 200);
            }
          }
        }
      } else if (entry.type === "session_info") {
        const infoEntry = entry as SessionInfoEntry;
        if (infoEntry.name) {
          sessionName = infoEntry.name;
        }
      }
    } catch {
      // Skip malformed lines
    }
  }

  if (!header) {
    throw new Error("No session header found");
  }

  return {
    path: filePath,
    id: header.id,
    name: sessionName,
    cwd: header.cwd || "",
    timestamp: header.timestamp,
    messageCount,
    firstMessage: firstUserMessage || undefined,
    lastModified: stats.mtime.toISOString(),
  };
}

async function readFirstLines(filePath: string, maxLines: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const lines: string[] = [];
    const stream = fs.createReadStream(filePath, { encoding: "utf-8" });
    const rl = readline.createInterface({ input: stream });

    rl.on("line", (line) => {
      lines.push(line);
      if (lines.length >= maxLines) {
        rl.close();
        stream.destroy();
      }
    });

    rl.on("close", () => resolve(lines));
    rl.on("error", reject);
  });
}

// ============================================================================
// Session Tree
// ============================================================================

/**
 * Build a tree representation of the current session
 */
export async function getSessionTree(sessionPath: string): Promise<{ tree: SessionTreeNode[]; currentId?: string }> {
  if (!sessionPath || !fs.existsSync(sessionPath)) {
    return { tree: [] };
  }

  const entries: SessionEntry[] = [];
  const labels = new Map<string, string>();
  let currentId: string | undefined;

  // Read all entries from the session file
  const content = await fs.promises.readFile(sessionPath, "utf-8");
  const lines = content.split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const entry = JSON.parse(line) as FileEntry;

      if (entry.type === "session") {
        // Skip header
        continue;
      }

      if (entry.type === "label") {
        const labelEntry = entry as LabelEntry;
        labels.set(labelEntry.targetId, labelEntry.labelName);
        continue;
      }

      entries.push(entry as SessionEntry);
      currentId = entry.id; // Track last entry as current
    } catch {
      // Skip malformed lines
    }
  }

  // Build tree from entries
  const nodeMap = new Map<string, SessionTreeNode>();
  const roots: SessionTreeNode[] = [];

  // Create nodes
  for (const entry of entries) {
    const node = entryToTreeNode(entry, labels.get(entry.id));
    nodeMap.set(entry.id, node);
  }

  // Build parent-child relationships
  for (const entry of entries) {
    const node = nodeMap.get(entry.id)!;

    if (entry.parentId === null || entry.parentId === entry.id) {
      roots.push(node);
    } else {
      const parent = nodeMap.get(entry.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // Orphan node - add to roots
        roots.push(node);
      }
    }
  }

  // Mark current node
  if (currentId) {
    const currentNode = nodeMap.get(currentId);
    if (currentNode) {
      currentNode.isCurrent = true;
    }
  }

  return { tree: roots, currentId };
}

function entryToTreeNode(entry: SessionEntry, label?: string): SessionTreeNode {
  let type: SessionTreeNode["type"] = "branch";
  let text = "";

  if (entry.type === "message") {
    const msgEntry = entry as SessionMessageEntry;
    const role = msgEntry.message.role;

    if (role === "user") {
      type = "user";
      const content = msgEntry.message.content;
      if (typeof content === "string") {
        text = content.slice(0, 100);
      } else if (Array.isArray(content)) {
        const textPart = content.find((c: unknown) => (c as { type: string }).type === "text");
        if (textPart && "text" in (textPart as object)) {
          text = ((textPart as { text: string }).text || "").slice(0, 100);
        }
      }
    } else if (role === "assistant") {
      type = "assistant";
      const content = msgEntry.message.content;
      if (Array.isArray(content)) {
        const textPart = content.find((c: unknown) => (c as { type: string }).type === "text");
        if (textPart && "text" in (textPart as object)) {
          text = ((textPart as { text: string }).text || "").slice(0, 100);
        }
      }
    } else {
      text = `[${role}]`;
    }
  } else if (entry.type === "compaction") {
    type = "compaction";
    text = "Compaction";
  } else if (entry.type === "branch_summary") {
    type = "branch";
    text = "Branch summary";
  } else if (entry.type === "session_info") {
    type = "label";
    const infoEntry = entry as SessionInfoEntry;
    text = infoEntry.name || "Session info";
  }

  return {
    id: entry.id,
    parentId: entry.parentId,
    type,
    text: text || `[${entry.type}]`,
    timestamp: entry.timestamp,
    label,
    children: [],
  };
}

// ============================================================================
// Session Operations
// ============================================================================

/**
 * Delete a session file
 */
export async function deleteSession(sessionPath: string): Promise<void> {
  if (!fs.existsSync(sessionPath)) {
    throw new Error("Session not found");
  }

  await fs.promises.unlink(sessionPath);
}
