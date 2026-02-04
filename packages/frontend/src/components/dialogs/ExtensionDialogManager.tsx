import { useStore } from "../../store";
import { getRpcClient } from "../../rpc/client";
import { ExtensionSelectDialog } from "./ExtensionSelectDialog";
import { ExtensionConfirmDialog } from "./ExtensionConfirmDialog";
import { ExtensionInputDialog } from "./ExtensionInputDialog";
import type { RpcExtensionUIRequest } from "@pi-web/shared";

export function ExtensionDialogManager() {
  const dialogs = useStore((s) => s.ui.extensionDialogs);
  const removeExtensionDialog = useStore((s) => s.removeExtensionDialog);

  if (dialogs.length === 0) return null;

  const currentDialog = dialogs[0];

  const sendResponse = (response: { value?: string; confirmed?: boolean; cancelled?: boolean }) => {
    const client = getRpcClient();
    if (client) {
      client.sendExtensionResponse({
        type: "extension_ui_response",
        id: currentDialog.id,
        ...response,
      } as any);
    }
    removeExtensionDialog(currentDialog.id);
  };

  return <ExtensionDialog dialog={currentDialog} onRespond={sendResponse} />;
}

interface ExtensionDialogProps {
  dialog: RpcExtensionUIRequest;
  onRespond: (response: { value?: string; confirmed?: boolean; cancelled?: boolean }) => void;
}

function ExtensionDialog({ dialog, onRespond }: ExtensionDialogProps) {
  switch (dialog.method) {
    case "select":
      return (
        <ExtensionSelectDialog
          id={dialog.id}
          title={dialog.title}
          options={dialog.options}
          onSelect={(value) => onRespond({ value })}
          onCancel={() => onRespond({ cancelled: true })}
        />
      );

    case "confirm":
      return (
        <ExtensionConfirmDialog
          id={dialog.id}
          title={dialog.title}
          message={dialog.message}
          onConfirm={() => onRespond({ confirmed: true })}
          onCancel={() => onRespond({ confirmed: false })}
        />
      );

    case "input":
      return (
        <ExtensionInputDialog
          id={dialog.id}
          title={dialog.title}
          placeholder={dialog.placeholder}
          onSubmit={(value) => onRespond({ value })}
          onCancel={() => onRespond({ cancelled: true })}
        />
      );

    case "editor":
      // For now, use input dialog for editor (could use Monaco later)
      return (
        <ExtensionInputDialog
          id={dialog.id}
          title={dialog.title}
          placeholder="Enter text..."
          onSubmit={(value) => onRespond({ value })}
          onCancel={() => onRespond({ cancelled: true })}
        />
      );

    default:
      return null;
  }
}
