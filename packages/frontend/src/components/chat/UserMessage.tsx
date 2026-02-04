import type { UserMessage as UserMessageType, TextContent, ImageContent } from "@pi-web/shared";

interface UserMessageProps {
  message: UserMessageType;
}

export function UserMessage({ message }: UserMessageProps) {
  const content = message.content;

  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-2">
        {typeof content === "string" ? (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        ) : (
          <div className="space-y-2">
            {content.map((block, i) => {
              if (block.type === "text") {
                return (
                  <p key={i} className="whitespace-pre-wrap break-words">
                    {(block as TextContent).text}
                  </p>
                );
              }
              if (block.type === "image") {
                const img = block as ImageContent;
                return (
                  <img
                    key={i}
                    src={`data:${img.mimeType};base64,${img.data}`}
                    alt="Attached image"
                    className="max-w-full rounded-lg"
                  />
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
