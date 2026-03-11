import { ArrowLeft, Menu, Settings } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { useChatStore } from "../hooks/useChatStore";
import { InputBar } from "./InputBar";
import { MessageBubble } from "./MessageBubble";
import { ModelSelector } from "./ModelSelector";
import { WelcomeScreen } from "./WelcomeScreen";

interface ChatAreaProps {
  onSuggestion: (text: string) => void;
}

function TypingIndicator() {
  return (
    <div className="flex justify-start px-4 mb-4">
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-sm border"
          style={{
            background: "white",
            borderColor: "oklch(0.91 0.005 200)",
          }}
        >
          🐼
        </div>
        <div className="flex items-center gap-1.5 px-4 py-3">
          <span
            className="text-xs font-medium mr-1"
            style={{ color: "oklch(0.55 0.01 240)" }}
          >
            Panda is thinking
          </span>
          <div className="dot-pulse flex items-center gap-1">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "oklch(0.58 0.14 195)" }}
            />
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "oklch(0.58 0.14 195)" }}
            />
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "oklch(0.58 0.14 195)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatArea({ onSuggestion }: ChatAreaProps) {
  const { state, dispatch, activeChat } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMsgId = activeChat?.messages[activeChat.messages.length - 1]?.id;
  const { isStreaming } = state;

  useEffect(() => {
    if (lastMsgId || isStreaming) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [lastMsgId, isStreaming]);

  const hasMessages = (activeChat?.messages.length ?? 0) > 0;

  const lastMessage = activeChat?.messages[activeChat.messages.length - 1];
  const showTypingIndicator =
    isStreaming && (!lastMessage || lastMessage.role === "user");

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar */}
      <div
        className={`flex items-center justify-between px-4 py-3 shrink-0 bg-transparent ${
          hasMessages ? "border-b" : ""
        }`}
        style={hasMessages ? { borderColor: "oklch(0.91 0.005 200)" } : {}}
      >
        <div className="flex items-center gap-3">
          {hasMessages ? (
            /* Back button when chat is active */
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "SET_ACTIVE_CHAT", payload: null })
              }
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: "oklch(0.52 0.01 240)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "oklch(0.18 0.01 250)";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "oklch(0.94 0.03 195)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "oklch(0.52 0.01 240)";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "transparent";
              }}
              aria-label="Back to welcome screen"
              data-ocid="chat.secondary_button"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            /* Mobile menu toggle when on welcome screen */
            <button
              type="button"
              onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
              className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Model selector — only when no messages */}
          {!hasMessages && <ModelSelector />}
        </div>

        {/* Settings button (mobile) */}
        {!hasMessages && (
          <button
            type="button"
            onClick={() => dispatch({ type: "TOGGLE_SETTINGS", payload: true })}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages / Welcome */}
      <div className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          <WelcomeScreen onSuggestion={onSuggestion} />
        ) : (
          <motion.div
            className="py-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {activeChat?.messages.map((message) => (
              <div key={message.id} className="relative">
                <MessageBubble message={message} />
              </div>
            ))}
            {showTypingIndicator && <TypingIndicator />}
            <div ref={messagesEndRef} className="h-4" />
          </motion.div>
        )}
      </div>

      {/* Input bar */}
      <InputBar />
    </div>
  );
}
