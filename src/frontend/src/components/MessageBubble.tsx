import { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/github-dark.css";
import {
  AlertCircle,
  Check,
  Copy,
  FileText,
  Image as ImageIcon,
  User,
} from "lucide-react";
import type { ContentPart, Message } from "../hooks/useChatStore";

interface MessageBubbleProps {
  message: Message;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-all"
      title="Copy code"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          Copy
        </>
      )}
    </button>
  );
}

// Code block with copy button
function CodeBlock({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const codeText = typeof children === "string" ? children : "";
  const isInline = !className;

  if (isInline) {
    return <code className={className}>{children}</code>;
  }

  return (
    <div className="relative group rounded-xl overflow-hidden my-3 border border-zinc-700/50">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/80 border-b border-zinc-700/50">
        <span className="text-xs text-zinc-400 font-mono">
          {className?.replace("hljs language-", "") || "code"}
        </span>
        <CopyButton text={codeText.trim()} />
      </div>
      <code className={className}>{children}</code>
    </div>
  );
}

function AttachmentPreview({ part }: { part: ContentPart }) {
  if (part.type === "image_url" && part.image_url) {
    return (
      <div className="mt-2 mb-1">
        <img
          src={part.image_url.url}
          alt={part.fileName || "Attached image"}
          className="max-w-xs max-h-64 rounded-xl object-cover border border-white/20 shadow-sm"
        />
        {part.fileName && (
          <p className="text-xs opacity-70 mt-1 flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            {part.fileName}
          </p>
        )}
      </div>
    );
  }

  if (part.type === "document") {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg border border-white/20">
        <FileText className="w-4 h-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{part.fileName}</p>
          <p className="text-xs opacity-70">Document attached</p>
        </div>
      </div>
    );
  }

  return null;
}

type PreProps = React.HTMLAttributes<HTMLPreElement> & {
  children?: React.ReactNode;
};
function PassthroughPre({ children }: PreProps) {
  return <>{children}</>;
}

function MessageContent({ message }: { message: Message }) {
  const content = message.content;

  if (typeof content === "string") {
    if (message.role === "user") {
      return (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      );
    }

    // Assistant message with markdown
    return (
      <div
        className={`prose prose-sm max-w-none text-foreground ${
          message.isStreaming ? "streaming-cursor" : ""
        }`}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            code: ({ className, children }) => (
              <CodeBlock className={className}>{children}</CodeBlock>
            ),
            pre: PassthroughPre,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  // Content parts
  const textParts = content.filter((p) => p.type === "text");
  const mediaParts = content.filter(
    (p) => p.type === "image_url" || p.type === "document",
  );
  const textContent = textParts.map((p) => p.text || "").join("\n");

  return (
    <div>
      {mediaParts.map((part, i) => {
        const key = `${part.type}-${part.fileName ?? i}`;
        return <AttachmentPreview key={key} part={part} />;
      })}
      {textContent && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap mt-1">
          {textContent}
        </p>
      )}
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [showTime, setShowTime] = useState(false);
  const isUser = message.role === "user";

  const timeStr = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (message.error) {
    return (
      <div className="flex justify-start px-4 mb-4 message-enter">
        <div className="flex items-start gap-3 max-w-[80%] md:max-w-[70%]">
          <div className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex-1 bg-red-50 border border-red-100 rounded-2xl rounded-tl-sm px-4 py-3">
            <p className="text-sm text-red-700 font-medium">{message.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex px-4 mb-4 message-enter ${
        isUser ? "justify-end" : "justify-start"
      }`}
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
    >
      <div
        className={`flex items-start gap-3 max-w-[85%] md:max-w-[72%] ${
          isUser ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-sm ${
            isUser
              ? "bg-teal-600 text-white"
              : "bg-white border border-border shadow-xs text-lg"
          }`}
        >
          {isUser ? <User className="w-4 h-4" /> : "🐼"}
        </div>

        {/* Bubble */}
        <div
          className={`flex-1 rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-teal-600 text-white rounded-tr-sm"
              : "bg-white border border-border shadow-xs rounded-tl-sm"
          }`}
        >
          <MessageContent message={message} />

          {/* Model label for assistant */}
          {!isUser && message.model && !message.isStreaming && (
            <div className="mt-2 flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground/60 bg-muted/40 px-1.5 py-0.5 rounded-full font-mono">
                {message.model.split("/").pop()?.replace(":free", "") ||
                  message.model}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Timestamp on hover */}
      {showTime && (
        <div
          className={`absolute text-[10px] text-muted-foreground mt-1 ${
            isUser ? "right-16" : "left-16"
          }`}
          style={{ bottom: "-16px" }}
        >
          {timeStr}
        </div>
      )}
    </div>
  );
}
