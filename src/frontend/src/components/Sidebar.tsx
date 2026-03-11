import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Plus, Settings, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { useChatStore } from "../hooks/useChatStore";
import type { ChatSession } from "../hooks/useChatStore";

type DateGroup =
  | "Today"
  | "Yesterday"
  | "Previous 7 Days"
  | "Previous 30 Days"
  | "Older";
const DATE_GROUPS: DateGroup[] = [
  "Today",
  "Yesterday",
  "Previous 7 Days",
  "Previous 30 Days",
  "Older",
];

function groupChatsByDate(
  chats: ChatSession[],
): Record<DateGroup, ChatSession[]> {
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const yesterday = today - 86400000;
  const sevenDaysAgo = today - 7 * 86400000;
  const thirtyDaysAgo = today - 30 * 86400000;

  const groups: Record<DateGroup, ChatSession[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    "Previous 30 Days": [],
    Older: [],
  };

  for (const chat of chats) {
    const ts = chat.createdAt;
    if (ts >= today) {
      groups.Today.push(chat);
    } else if (ts >= yesterday) {
      groups.Yesterday.push(chat);
    } else if (ts >= sevenDaysAgo) {
      groups["Previous 7 Days"].push(chat);
    } else if (ts >= thirtyDaysAgo) {
      groups["Previous 30 Days"].push(chat);
    } else {
      groups.Older.push(chat);
    }
  }

  return groups;
}

interface ChatItemProps {
  chat: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ChatItem({ chat, isActive, onSelect, onDelete }: ChatItemProps) {
  return (
    <button
      type="button"
      className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 text-left relative ${
        isActive
          ? "text-white border border-transparent"
          : "text-[oklch(0.72_0.005_220)] hover:text-white border border-transparent"
      }`}
      style={isActive ? { background: "oklch(0.28 0.01 220)" } : {}}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "oklch(0.22 0.01 220)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "transparent";
        }
      }}
      onClick={onSelect}
      aria-pressed={isActive}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
          style={{ background: "oklch(0.58 0.14 195)" }}
        />
      )}
      <MessageSquare
        className={`w-3.5 h-3.5 shrink-0 transition-colors ${
          isActive ? "text-white" : "opacity-50"
        }`}
      />
      <span
        className={`flex-1 text-[13px] truncate ${isActive ? "font-medium" : ""}`}
      >
        {chat.title}
      </span>

      <button
        type="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="shrink-0 opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center transition-all"
        style={{ color: "oklch(0.6 0.005 220)" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
          (e.currentTarget as HTMLButtonElement).style.background =
            "oklch(0.3 0.04 15 / 0.3)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color =
            "oklch(0.6 0.005 220)";
          (e.currentTarget as HTMLButtonElement).style.background =
            "transparent";
        }}
        aria-label={`Delete chat: ${chat.title}`}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </button>
  );
}

export function Sidebar() {
  const { state, dispatch, createNewChat } = useChatStore();
  const { chats, activeChatId, isSidebarOpen } = state;

  const groupedChats = useMemo(() => groupChatsByDate(chats), [chats]);

  const sidebarContent = (
    <div
      className="flex flex-col h-full"
      style={{ background: "oklch(0.13 0.01 220)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-lg select-none shrink-0"
            style={{ background: "oklch(0.22 0.01 220)" }}
          >
            🐼
          </div>
          <div>
            <span className="font-heading font-bold text-[15px] tracking-tight leading-none text-white">
              Panda AI
            </span>
            <p
              className="text-[10px] leading-none mt-0.5"
              style={{ color: "oklch(0.55 0.005 220)" }}
            >
              Powered by OpenRouter
            </p>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => dispatch({ type: "TOGGLE_SIDEBAR", payload: false })}
          className="md:hidden w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "oklch(0.55 0.005 220)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "white";
            (e.currentTarget as HTMLButtonElement).style.background =
              "oklch(0.22 0.01 220)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "oklch(0.55 0.005 220)";
            (e.currentTarget as HTMLButtonElement).style.background =
              "transparent";
          }}
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat button */}
      <div className="px-3 pb-3 shrink-0">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            createNewChat();
            dispatch({ type: "TOGGLE_SIDEBAR", payload: false });
          }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl font-medium text-sm text-white transition-all duration-150"
          style={{
            background: "oklch(0.22 0.01 220)",
            border: "1px solid oklch(0.28 0.01 220)",
          }}
          data-ocid="sidebar.primary_button"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </motion.button>
      </div>

      {/* Divider */}
      <div
        className="mx-3 mb-1 border-t"
        style={{ borderColor: "oklch(0.22 0.01 220)" }}
      />

      {/* Chat list */}
      <ScrollArea className="flex-1 px-2 py-1">
        {chats.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 text-center px-4"
            data-ocid="sidebar.empty_state"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: "oklch(0.22 0.01 220)" }}
            >
              <MessageSquare
                className="w-5 h-5"
                style={{ color: "oklch(0.45 0.005 220)" }}
              />
            </div>
            <p
              className="text-[13px] font-medium"
              style={{ color: "oklch(0.55 0.005 220)" }}
            >
              No chats yet
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "oklch(0.4 0.005 220)" }}
            >
              Start a new conversation
            </p>
          </div>
        ) : (
          <div className="pb-2" data-ocid="sidebar.list">
            {DATE_GROUPS.map((group) => {
              const groupChats = groupedChats[group];
              if (!groupChats || groupChats.length === 0) return null;
              return (
                <div key={group} className="mb-4">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-widest px-3 pb-1.5"
                    style={{ color: "oklch(0.55 0.005 220)" }}
                  >
                    {group}
                  </p>
                  <div className="space-y-0.5">
                    {groupChats.map((chat) => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        isActive={chat.id === activeChatId}
                        onSelect={() => {
                          dispatch({
                            type: "SET_ACTIVE_CHAT",
                            payload: chat.id,
                          });
                          dispatch({ type: "TOGGLE_SIDEBAR", payload: false });
                        }}
                        onDelete={() =>
                          dispatch({ type: "DELETE_CHAT", payload: chat.id })
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Bottom settings */}
      <div
        className="mx-3 border-t"
        style={{ borderColor: "oklch(0.22 0.01 220)" }}
      />
      <div className="p-3 shrink-0">
        <button
          type="button"
          onClick={() => dispatch({ type: "TOGGLE_SETTINGS", payload: true })}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-150 text-[13px]"
          style={{ color: "oklch(0.55 0.005 220)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "white";
            (e.currentTarget as HTMLButtonElement).style.background =
              "oklch(0.22 0.01 220)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "oklch(0.55 0.005 220)";
            (e.currentTarget as HTMLButtonElement).style.background =
              "transparent";
          }}
          data-ocid="sidebar.secondary_button"
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-[260px] shrink-0 flex-col h-full"
        style={{ borderRight: "1px solid oklch(0.22 0.01 220)" }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
              onClick={() =>
                dispatch({ type: "TOGGLE_SIDEBAR", payload: false })
              }
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-[260px] z-40 shadow-modal"
              style={{ borderRight: "1px solid oklch(0.22 0.01 220)" }}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
