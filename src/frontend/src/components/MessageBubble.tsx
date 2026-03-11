import {
  AlertCircle,
  Check,
  Copy,
  FileText,
  Image as ImageIcon,
  User,
} from "lucide-react";
import { motion } from "motion/react";
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
  level?: number;
  ordered?: boolean;
  lang?: string;
  rows?: string[][];
  headers?: string[];
}

function tokenizeMarkdown(md: string): MarkdownToken[] {
  const lines = md.split("\n");
  const tokens: MarkdownToken[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      tokens.push({ type: "code_block", content: codeLines.join("\n"), lang });
      continue;
    }

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

    if (/^[-*_]{3,}\s*$/.test(line)) {
      tokens.push({ type: "hr", content: "" });
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const bqLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        bqLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      tokens.push({ type: "blockquote", content: bqLines.join("\n") });
      continue;
    }

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
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /\|/.test(lines[i])) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      tokens.push({ type: "table", content: "", headers, rows });
      continue;
    }

    if (/^\s*$/.test(line)) {
      tokens.push({ type: "blank", content: "" });
      i++;
      continue;
    }

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

function InlineMarkdown({ text }: { text: string }) {
  const parts = useMemo(() => {
    const result: React.ReactNode[] = [];
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
        <div className="max-w-xs rounded-xl overflow-hidden border border-black/10 shadow-sm bg-zinc-100">
          <img
            src={part.image_url.url}
            alt={part.fileName || "Attached image"}
            className="w-full h-auto max-h-64 object-contain block"
          />
        </div>
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
      <div
        className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border"
        style={{
          background: "oklch(0.85 0.005 220 / 0.5)",
          borderColor: "oklch(0.80 0.005 220)",
        }}
      >
        <FileText
          className="w-4 h-4 shrink-0"
          style={{ color: "oklch(0.35 0.01 220)" }}
        />
        <div className="min-w-0">
          <p
            className="text-xs font-medium truncate"
            style={{ color: "oklch(0.2 0.01 220)" }}
          >
            {part.fileName}
          </p>
          <p className="text-xs" style={{ color: "oklch(0.45 0.005 220)" }}>
            Document attached
          </p>
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
    return <Markdown isStreaming={message.isStreaming}>{content}</Markdown>;
  }

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

  if (message.error !== undefined) {
    if (!message.error) return null;
    return (
      <motion.div
        className="flex justify-start px-4 mb-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="flex items-start gap-3 max-w-[80%] md:max-w-[70%]">
          <div className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex-1 bg-red-50 border border-red-100 rounded-2xl rounded-tl-sm px-4 py-3">
            <p className="text-sm text-red-700 font-medium">{message.error}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`flex px-4 mb-4 ${isUser ? "justify-end" : "justify-start"}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
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
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-sm"
          style={
            isUser
              ? {
                  background: "oklch(0.88 0.005 220)",
                  color: "oklch(0.25 0.01 220)",
                }
              : {
                  background: "white",
                  border: "1px solid oklch(0.91 0.005 200)",
                  boxShadow: "0 1px 3px oklch(0 0 0 / 0.06)",
                }
          }
        >
          {isUser ? <User className="w-4 h-4" /> : "🐼"}
        </div>

        {/* Bubble */}
        <div
          className={`flex-1 rounded-2xl px-4 py-3 ${
            isUser ? "rounded-tr-sm" : "rounded-tl-sm bg-transparent"
          }`}
          style={
            isUser
              ? {
                  background: "oklch(0.92 0.005 220)",
                  color: "oklch(0.2 0.01 220)",
                }
              : {}
          }
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
    </motion.div>
  );
}
