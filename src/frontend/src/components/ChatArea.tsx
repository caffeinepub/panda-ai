import { Menu, Settings } from "lucide-react";
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

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Model selector */}
          <ModelSelector />
        </div>

        {/* Settings button (visible on mobile) */}
        <button
          type="button"
          onClick={() => dispatch({ type: "TOGGLE_SETTINGS", payload: true })}
          className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          aria-label="Open settings"
        >
          <Settings className="w-4 h-4" />
        </button>
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
            <div ref={messagesEndRef} className="h-4" />
          </motion.div>
        )}
      </div>

      {/* Input bar */}
      <InputBar />
    </div>
  );
}
