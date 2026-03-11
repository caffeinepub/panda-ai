import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useChatStore } from "../hooks/useChatStore";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
].join(",");

const MAX_FILE_SIZE = 20 * 1024 * 1024;

interface AttachedFile {
  file: File;
  preview?: string;
  id: string;
}

function FileChip({
  attached,
  onRemove,
}: {
  attached: AttachedFile;
  onRemove: () => void;
}) {
  const isImage = attached.file.type.startsWith("image/");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: 4 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium max-w-[200px]"
      style={{
        background: "oklch(0.97 0.02 195)",
        border: "1px solid oklch(0.87 0.07 195)",
        color: "oklch(0.45 0.12 195)",
      }}
    >
      {isImage ? (
        attached.preview ? (
          <img
            src={attached.preview}
            alt=""
            className="w-4 h-4 rounded object-cover shrink-0"
          />
        ) : (
          <ImageIcon className="w-3.5 h-3.5 shrink-0" />
        )
      ) : (
        <FileText className="w-3.5 h-3.5 shrink-0" />
      )}
      <span className="truncate">{attached.file.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 hover:opacity-70 transition-opacity ml-0.5"
        aria-label={`Remove ${attached.file.name}`}
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

export function InputBar() {
  const { state, sendMessage, createNewChat } = useChatStore();
  const { isStreaming, activeChatId } = state;
  const [text, setText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend =
    (text.trim().length > 0 || attachedFiles.length > 0) && !isStreaming;

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, []);

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    adjustHeight();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = useCallback(async () => {
    if (!canSend) return;

    const msgText = text.trim();
    const files = attachedFiles.map((a) => a.file);

    if (!activeChatId) {
      createNewChat();
    }

    setText("");
    setAttachedFiles([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await sendMessage(msgText, files);
  }, [canSend, text, attachedFiles, activeChatId, createNewChat, sendMessage]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processFiles = (files: File[]) => {
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large (max 20MB)`);
        continue;
      }

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2);

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachedFiles((prev) => [
            ...prev,
            { file, preview: e.target?.result as string, id },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachedFiles((prev) => [...prev, { file, id }]);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  return (
    <div
      className="shrink-0 px-4 pb-4 pt-2"
      style={{
        background:
          "linear-gradient(to bottom, transparent, oklch(0.99 0 0) 24px)",
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* File attachments */}
      <AnimatePresence>
        {attachedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1.5 mb-2 overflow-hidden"
          >
            {attachedFiles.map((attached) => (
              <FileChip
                key={attached.id}
                attached={attached}
                onRemove={() =>
                  setAttachedFiles((prev) =>
                    prev.filter((f) => f.id !== attached.id),
                  )
                }
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main input stage */}
      <div
        className="flex items-end gap-2 rounded-2xl px-3 py-2.5 transition-all duration-200"
        style={{
          background: "white",
          border: isFocused
            ? "1.5px solid oklch(0.58 0.14 195)"
            : "1.5px solid oklch(0.88 0.008 200)",
          boxShadow: isFocused
            ? "0 0 0 3px oklch(0.87 0.07 195 / 0.25), 0 2px 8px oklch(0 0 0 / 0.06)"
            : "0 2px 8px oklch(0 0 0 / 0.05), 0 1px 2px oklch(0 0 0 / 0.04)",
        }}
      >
        {/* Attach button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          className="shrink-0 w-8 h-8 mb-0.5 rounded-lg flex items-center justify-center transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: "oklch(0.55 0.01 240)" }}
          onMouseEnter={(e) => {
            if (!isStreaming) {
              (e.currentTarget as HTMLButtonElement).style.color =
                "oklch(0.58 0.14 195)";
              (e.currentTarget as HTMLButtonElement).style.background =
                "oklch(0.97 0.02 195)";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "oklch(0.55 0.01 240)";
            (e.currentTarget as HTMLButtonElement).style.background =
              "transparent";
          }}
          title="Attach file"
          aria-label="Attach image or document"
          data-ocid="chat.upload_button"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={
            isStreaming ? "Panda AI is thinking…" : "Message Panda AI…"
          }
          disabled={isStreaming}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 leading-relaxed overflow-hidden py-1.5"
          style={{ minHeight: "36px", maxHeight: "140px" }}
          aria-label="Message input"
          data-ocid="chat.input"
        />

        {/* Send button — circular */}
        <motion.button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          whileHover={canSend ? { scale: 1.05 } : {}}
          whileTap={canSend ? { scale: 0.95 } : {}}
          className="shrink-0 w-8 h-8 mb-0.5 rounded-full flex items-center justify-center transition-colors duration-150"
          style={
            canSend
              ? {
                  background: "oklch(0.58 0.14 195)",
                  color: "white",
                  boxShadow: "0 1px 3px oklch(0.58 0.14 195 / 0.4)",
                  cursor: "pointer",
                }
              : {
                  background: "oklch(0.93 0.005 200)",
                  color: "oklch(0.7 0.005 200)",
                  cursor: "not-allowed",
                }
          }
          onMouseEnter={(e) => {
            if (canSend) {
              (e.currentTarget as HTMLButtonElement).style.background =
                "oklch(0.49 0.12 195)";
            }
          }}
          onMouseLeave={(e) => {
            if (canSend) {
              (e.currentTarget as HTMLButtonElement).style.background =
                "oklch(0.58 0.14 195)";
            }
          }}
          aria-label="Send message"
          data-ocid="chat.submit_button"
        >
          {isStreaming ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </motion.button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        tabIndex={-1}
        className="sr-only"
        onChange={handleFileSelect}
        aria-label="Upload file"
      />

      {/* Footer note */}
      <p
        className="text-center text-[11px] mt-2"
        style={{ color: "oklch(0.65 0.005 200)" }}
      >
        Panda AI can make mistakes. Verify important information.
      </p>
    </div>
  );
}
