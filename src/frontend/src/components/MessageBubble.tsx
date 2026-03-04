import {
  AlertCircle,
  Check,
  Copy,
  FileText,
  Image as ImageIcon,
  User,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
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

// ─── Lightweight Markdown Renderer ───────────────────────────────────────────
// Parses common markdown patterns without external deps.

interface MarkdownToken {
  type:
    | "heading"
    | "code_block"
    | "blockquote"
    | "hr"
    | "ul_item"
    | "ol_item"
    | "table"
    | "paragraph"
    | "blank";
  content: string;
  level?: number; // for headings
  ordered?: boolean;
  lang?: string; // for code blocks
  rows?: string[][]; // for tables
  headers?: string[]; // for tables
}

function tokenizeMarkdown(md: string): MarkdownToken[] {
  const lines = md.split("\n");
  const tokens: MarkdownToken[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // consume closing ```
      tokens.push({ type: "code_block", content: codeLines.join("\n"), lang });
      continue;
    }

    // Heading
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      tokens.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2],
      });
      i++;
      continue;
    }

    // HR
    if (/^[-*_]{3,}\s*$/.test(line)) {
      tokens.push({ type: "hr", content: "" });
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const bqLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        bqLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      tokens.push({ type: "blockquote", content: bqLines.join("\n") });
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const itemLines: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        itemLines.push(lines[i].replace(/^[-*+]\s/, ""));
        i++;
      }
      for (const item of itemLines) {
        tokens.push({ type: "ul_item", content: item });
      }
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const itemLines: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        itemLines.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      for (const item of itemLines) {
        tokens.push({ type: "ol_item", content: item });
      }
      continue;
    }

    // Table (pipe-separated)
    if (
      /\|/.test(line) &&
      i + 1 < lines.length &&
      /^\|?[-:| ]+\|?$/.test(lines[i + 1])
    ) {
      const parseRow = (r: string) =>
        r
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim());
      const headers = parseRow(line);
      i += 2; // skip separator row
      const rows: string[][] = [];
      while (i < lines.length && /\|/.test(lines[i])) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      tokens.push({ type: "table", content: "", headers, rows });
      continue;
    }

    // Blank line
    if (/^\s*$/.test(line)) {
      tokens.push({ type: "blank", content: "" });
      i++;
      continue;
    }

    // Paragraph – accumulate consecutive non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^[-*+]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^[-*_]{3,}\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      tokens.push({ type: "paragraph", content: paraLines.join("\n") });
    }
  }

  return tokens;
}

// Render inline markdown: bold, italic, inline code, links, strikethrough
function InlineMarkdown({ text }: { text: string }) {
  const parts = useMemo(() => {
    const result: React.ReactNode[] = [];
    // Split on inline code first
    const segments = text.split(/(`[^`]+`)/);
    let key = 0;

    for (const seg of segments) {
      if (seg.startsWith("`") && seg.endsWith("`") && seg.length > 2) {
        result.push(
          <code
            key={key++}
            className="px-1.5 py-0.5 rounded bg-zinc-100 text-teal-700 font-mono text-[0.85em] border border-zinc-200"
          >
            {seg.slice(1, -1)}
          </code>,
        );
      } else {
        // Process bold/italic/strikethrough/links inside non-code segments
        const inner = seg
          .replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener" class="text-teal-600 underline hover:text-teal-800">$1</a>',
          )
          .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
          .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
          .replace(/\*([^*]+)\*/g, "<em>$1</em>")
          .replace(/~~([^~]+)~~/g, "<del>$1</del>")
          .replace(/__([^_]+)__/g, "<strong>$1</strong>")
          .replace(/_([^_]+)_/g, "<em>$1</em>");

        result.push(
          <span
            key={key++}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled markdown-to-HTML conversion
            dangerouslySetInnerHTML={{ __html: inner }}
          />,
        );
      }
    }

    return result;
  }, [text]);

  return <>{parts}</>;
}

interface MarkdownProps {
  children: string;
  isStreaming?: boolean;
}

function Markdown({ children, isStreaming }: MarkdownProps) {
  const tokens = useMemo(() => tokenizeMarkdown(children), [children]);

  // Build stable keys using token type + position — position is stable for
  // a given markdown string (these are never reordered at runtime).
  const makeKey = (type: string, idx: number) => `${type}-${idx}`;

  const elements: React.ReactNode[] = [];
  let ulItems: string[] = [];
  let olItems: string[] = [];

  const flushUl = (k: number) => {
    if (ulItems.length === 0) return null;
    const captured = [...ulItems];
    ulItems = [];
    return (
      <ul key={`ul-${k}`} className="list-disc list-inside space-y-1 my-2 ml-2">
        {captured.map((item, j) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static parsed list — never reordered
          <li key={`li-${k}-${j}`} className="text-sm leading-relaxed">
            <InlineMarkdown text={item} />
          </li>
        ))}
      </ul>
    );
  };

  const flushOl = (k: number) => {
    if (olItems.length === 0) return null;
    const captured = [...olItems];
    olItems = [];
    return (
      <ol
        key={`ol-${k}`}
        className="list-decimal list-inside space-y-1 my-2 ml-2"
      >
        {captured.map((item, j) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static parsed list — never reordered
          <li key={`oli-${k}-${j}`} className="text-sm leading-relaxed">
            <InlineMarkdown text={item} />
          </li>
        ))}
      </ol>
    );
  };

  tokens.forEach((token, idx) => {
    if (token.type !== "ul_item" && ulItems.length > 0) {
      const el = flushUl(idx);
      if (el) elements.push(el);
    }
    if (token.type !== "ol_item" && olItems.length > 0) {
      const el = flushOl(idx);
      if (el) elements.push(el);
    }

    const k = makeKey(token.type, idx);

    switch (token.type) {
      case "heading": {
        const sizeMap: Record<number, string> = {
          1: "text-xl font-bold mt-4 mb-2",
          2: "text-lg font-bold mt-3 mb-2",
          3: "text-base font-semibold mt-3 mb-1",
          4: "text-sm font-semibold mt-2 mb-1",
          5: "text-sm font-medium mt-2 mb-1",
          6: "text-xs font-medium mt-1 mb-1",
        };
        const lvl = token.level ?? 1;
        const cls = sizeMap[lvl] ?? "font-bold";
        const hc = <InlineMarkdown text={token.content} />;
        elements.push(
          lvl === 1 ? (
            <h1 key={k} className={cls}>
              {hc}
            </h1>
          ) : lvl === 2 ? (
            <h2 key={k} className={cls}>
              {hc}
            </h2>
          ) : lvl === 3 ? (
            <h3 key={k} className={cls}>
              {hc}
            </h3>
          ) : lvl === 4 ? (
            <h4 key={k} className={cls}>
              {hc}
            </h4>
          ) : lvl === 5 ? (
            <h5 key={k} className={cls}>
              {hc}
            </h5>
          ) : (
            <h6 key={k} className={cls}>
              {hc}
            </h6>
          ),
        );
        break;
      }

      case "code_block": {
        elements.push(
          <div
            key={k}
            className="relative group rounded-xl overflow-hidden my-3 border border-zinc-700/50"
          >
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/90 border-b border-zinc-700/50">
              <span className="text-xs text-zinc-400 font-mono">
                {token.lang || "code"}
              </span>
              <CopyButton text={token.content.trim()} />
            </div>
            <pre className="bg-zinc-900 px-4 py-3 overflow-x-auto text-xs leading-relaxed">
              <code className="text-zinc-100 font-mono">{token.content}</code>
            </pre>
          </div>,
        );
        break;
      }

      case "blockquote":
        elements.push(
          <blockquote
            key={k}
            className="border-l-4 border-teal-400 pl-4 my-2 text-sm italic text-zinc-600 bg-zinc-50 py-1 rounded-r-md"
          >
            <InlineMarkdown text={token.content} />
          </blockquote>,
        );
        break;

      case "hr":
        elements.push(<hr key={k} className="border-zinc-200 my-4" />);
        break;

      case "ul_item":
        ulItems.push(token.content);
        break;

      case "ol_item":
        olItems.push(token.content);
        break;

      case "table": {
        const { headers = [], rows = [] } = token;
        elements.push(
          <div key={k} className="overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-100">
                  {headers.map((h, j) => {
                    const thKey = `${k}-th-${j}`;
                    return (
                      <th
                        key={thKey}
                        className="border border-zinc-300 px-3 py-1.5 text-left font-semibold text-xs"
                      >
                        <InlineMarkdown text={h} />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => {
                  const trKey = `${k}-tr-${ri}`;
                  return (
                    <tr key={trKey} className="even:bg-zinc-50">
                      {row.map((cell, ci) => {
                        const tdKey = `${k}-td-${ri}-${ci}`;
                        return (
                          <td
                            key={tdKey}
                            className="border border-zinc-300 px-3 py-1.5 text-xs"
                          >
                            <InlineMarkdown text={cell} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>,
        );
        break;
      }

      case "paragraph":
        if (token.content.trim()) {
          elements.push(
            <p key={k} className="text-sm leading-relaxed my-1.5">
              <InlineMarkdown text={token.content} />
            </p>,
          );
        }
        break;

      case "blank":
        break;

      default:
        break;
    }
  });

  // Flush any trailing list items
  const ulEl = flushUl(tokens.length);
  if (ulEl) elements.push(ulEl);
  const olEl = flushOl(tokens.length + 1);
  if (olEl) elements.push(olEl);

  return (
    <div className={`min-w-0 ${isStreaming ? "streaming-cursor" : ""}`}>
      {elements}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

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

function MessageContent({ message }: { message: Message }) {
  const content = message.content;

  if (typeof content === "string") {
    if (message.role === "user") {
      return (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      );
    }

    // Assistant message with markdown
    return <Markdown isStreaming={message.isStreaming}>{content}</Markdown>;
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

  // Silently skip empty error messages (e.g. from aborted requests)
  if (message.error !== undefined) {
    if (!message.error) return null;
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
