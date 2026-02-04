import { useState, useCallback } from "react";
import { useStore } from "../../store";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";

interface ConnectDialogProps {
  onConnect?: () => void;
}

export function ConnectDialog({ onConnect }: ConnectDialogProps) {
  const [wsUrl, setWsUrl] = useState(
    localStorage.getItem("pi-web-ws-url") ?? "ws://localhost:3001"
  );
  const [cwd, setCwd] = useState(
    localStorage.getItem("pi-web-cwd") ?? ""
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useStore((s) => s.connect);

  const handleConnect = useCallback(async () => {
    if (!cwd.trim()) {
      setError("Working directory is required");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Save to localStorage for next time
      localStorage.setItem("pi-web-ws-url", wsUrl);
      localStorage.setItem("pi-web-cwd", cwd);

      await connect(wsUrl, cwd);
      onConnect?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, [wsUrl, cwd, connect, onConnect]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl border border-zinc-700">
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">
          Connect to Pi Agent
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              WebSocket URL
            </label>
            <input
              type="text"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              placeholder="ws://localhost:3001"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Working Directory
            </label>
            <input
              type="text"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="/path/to/your/project"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-zinc-500">
              The directory where pi agent will execute commands
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-sm text-red-300">
              {error}
            </div>
          )}

          <Button
            onClick={handleConnect}
            disabled={isConnecting || !cwd.trim()}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Connecting...
              </>
            ) : (
              "Connect"
            )}
          </Button>
        </div>

        <p className="mt-4 text-xs text-zinc-500 text-center">
          Make sure the pi-web server is running:{" "}
          <code className="bg-zinc-700 px-1 rounded">npm run dev -w @pi-web/backend</code>
        </p>
      </div>
    </div>
  );
}
