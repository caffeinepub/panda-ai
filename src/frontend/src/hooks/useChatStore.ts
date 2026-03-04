import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { type ReactNode, createElement } from "react";
import { toast } from "sonner";
import {
  FALLBACK_MODELS,
  type Model,
  type OpenRouterContentPart,
  type OpenRouterMessage,
  fetchFreeModels,
  modelSupportsVision,
  selectBestModel,
  streamChat,
} from "../services/openrouter";

export interface ContentPart {
  type: "text" | "image_url" | "document";
  text?: string;
  image_url?: { url: string };
  documentContent?: string;
  fileName?: string;
  fileType?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string | ContentPart[];
  timestamp: number;
  model?: string;
  isStreaming?: boolean;
  error?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
}

interface ChatState {
  apiKey: string | null;
  chats: ChatSession[];
  activeChatId: string | null;
  selectedModel: string;
  models: Model[];
  isLoadingModels: boolean;
  isStreaming: boolean;
  showSettings: boolean;
  showApiKeyModal: boolean;
  isSidebarOpen: boolean;
}

type ChatAction =
  | { type: "SET_API_KEY"; payload: string | null }
  | { type: "ADD_CHAT"; payload: ChatSession }
  | { type: "DELETE_CHAT"; payload: string }
  | { type: "SET_ACTIVE_CHAT"; payload: string | null }
  | { type: "ADD_MESSAGE"; chatId: string; message: Message }
  | { type: "UPDATE_LAST_MESSAGE"; chatId: string; delta: string }
  | {
      type: "FINALIZE_MESSAGE";
      chatId: string;
      messageId: string;
      model?: string;
    }
  | {
      type: "SET_MESSAGE_ERROR";
      chatId: string;
      messageId: string;
      error: string;
    }
  | { type: "SET_CHAT_TITLE"; chatId: string; title: string }
  | { type: "SET_MODELS"; payload: Model[] }
  | { type: "SET_LOADING_MODELS"; payload: boolean }
  | { type: "SET_SELECTED_MODEL"; payload: string }
  | { type: "SET_STREAMING"; payload: boolean }
  | { type: "TOGGLE_SETTINGS"; payload?: boolean }
  | { type: "TOGGLE_API_KEY_MODAL"; payload?: boolean }
  | { type: "TOGGLE_SIDEBAR"; payload?: boolean };

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored) as T;
  } catch {
    // ignore
  }
  return fallback;
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_API_KEY":
      if (action.payload) {
        localStorage.setItem("panda_api_key", action.payload);
      } else {
        localStorage.removeItem("panda_api_key");
      }
      return { ...state, apiKey: action.payload };

    case "ADD_CHAT": {
      const newChats = [action.payload, ...state.chats];
      localStorage.setItem("panda_chats", JSON.stringify(newChats));
      return {
        ...state,
        chats: newChats,
        activeChatId: action.payload.id,
      };
    }

    case "DELETE_CHAT": {
      const filteredChats = state.chats.filter((c) => c.id !== action.payload);
      localStorage.setItem("panda_chats", JSON.stringify(filteredChats));
      return {
        ...state,
        chats: filteredChats,
        activeChatId:
          state.activeChatId === action.payload
            ? filteredChats[0]?.id || null
            : state.activeChatId,
      };
    }

    case "SET_ACTIVE_CHAT":
      return { ...state, activeChatId: action.payload };

    case "ADD_MESSAGE": {
      const updatedChats = state.chats.map((chat) =>
        chat.id === action.chatId
          ? { ...chat, messages: [...chat.messages, action.message] }
          : chat,
      );
      localStorage.setItem("panda_chats", JSON.stringify(updatedChats));
      return { ...state, chats: updatedChats };
    }

    case "UPDATE_LAST_MESSAGE": {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id !== action.chatId) return chat;
        const messages = [...chat.messages];
        const lastIdx = messages.length - 1;
        if (lastIdx < 0) return chat;
        const last = messages[lastIdx];
        if (last.role !== "assistant") return chat;
        const currentContent =
          typeof last.content === "string" ? last.content : "";
        messages[lastIdx] = {
          ...last,
          content: currentContent + action.delta,
          isStreaming: true,
        };
        return { ...chat, messages };
      });
      return { ...state, chats: updatedChats };
    }

    case "FINALIZE_MESSAGE": {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id !== action.chatId) return chat;
        const messages = chat.messages.map((m) =>
          m.id === action.messageId
            ? { ...m, isStreaming: false, model: action.model }
            : m,
        );
        return { ...chat, messages };
      });
      localStorage.setItem("panda_chats", JSON.stringify(updatedChats));
      return { ...state, chats: updatedChats };
    }

    case "SET_MESSAGE_ERROR": {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id !== action.chatId) return chat;
        const messages = chat.messages.map((m) =>
          m.id === action.messageId
            ? { ...m, isStreaming: false, error: action.error, content: "" }
            : m,
        );
        return { ...chat, messages };
      });
      localStorage.setItem("panda_chats", JSON.stringify(updatedChats));
      return { ...state, chats: updatedChats };
    }

    case "SET_CHAT_TITLE": {
      const updatedChats = state.chats.map((chat) =>
        chat.id === action.chatId ? { ...chat, title: action.title } : chat,
      );
      localStorage.setItem("panda_chats", JSON.stringify(updatedChats));
      return { ...state, chats: updatedChats };
    }

    case "SET_MODELS":
      return { ...state, models: action.payload };

    case "SET_LOADING_MODELS":
      return { ...state, isLoadingModels: action.payload };

    case "SET_SELECTED_MODEL":
      localStorage.setItem("panda_selected_model", action.payload);
      return { ...state, selectedModel: action.payload };

    case "SET_STREAMING":
      return { ...state, isStreaming: action.payload };

    case "TOGGLE_SETTINGS":
      return {
        ...state,
        showSettings:
          action.payload !== undefined ? action.payload : !state.showSettings,
      };

    case "TOGGLE_API_KEY_MODAL":
      return {
        ...state,
        showApiKeyModal:
          action.payload !== undefined
            ? action.payload
            : !state.showApiKeyModal,
      };

    case "TOGGLE_SIDEBAR":
      return {
        ...state,
        isSidebarOpen:
          action.payload !== undefined ? action.payload : !state.isSidebarOpen,
      };

    default:
      return state;
  }
}

interface ChatContextValue {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  activeChat: ChatSession | null;
  createNewChat: () => void;
  sendMessage: (text: string, attachments: File[]) => Promise<void>;
  loadModels: () => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const storedApiKey = localStorage.getItem("panda_api_key");
  const storedChats = loadFromStorage<ChatSession[]>("panda_chats", []);
  const storedModel = localStorage.getItem("panda_selected_model") || "auto";

  const [state, dispatch] = useReducer(chatReducer, {
    apiKey: storedApiKey,
    chats: storedChats,
    activeChatId: null,
    selectedModel: storedModel,
    models: [],
    isLoadingModels: false,
    isStreaming: false,
    showSettings: false,
    showApiKeyModal: !storedApiKey,
    isSidebarOpen: true,
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // Holds the AbortController for the current in-flight stream
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeChat =
    state.chats.find((c) => c.id === state.activeChatId) || null;

  const loadModels = useCallback(async () => {
    const key = stateRef.current.apiKey;
    if (!key) return;
    dispatch({ type: "SET_LOADING_MODELS", payload: true });
    try {
      const models = await fetchFreeModels(key);
      dispatch({
        type: "SET_MODELS",
        payload: models.length > 0 ? models : FALLBACK_MODELS,
      });
    } catch {
      dispatch({ type: "SET_MODELS", payload: FALLBACK_MODELS });
      toast.error("Could not fetch models. Using defaults.");
    } finally {
      dispatch({ type: "SET_LOADING_MODELS", payload: false });
    }
  }, []);

  const createNewChat = useCallback(() => {
    const newChat: ChatSession = {
      id: generateId(),
      title: "New Chat",
      createdAt: Date.now(),
      messages: [],
    };
    dispatch({ type: "ADD_CHAT", payload: newChat });
  }, []);

  const sendMessage = useCallback(async (text: string, attachments: File[]) => {
    const { apiKey, selectedModel, models, activeChatId, chats } =
      stateRef.current;

    if (!apiKey) {
      dispatch({ type: "TOGGLE_API_KEY_MODAL", payload: true });
      return;
    }

    // Ensure we have an active chat
    let chatId = activeChatId;
    if (!chatId || !chats.find((c) => c.id === chatId)) {
      const newChat: ChatSession = {
        id: generateId(),
        title: "New Chat",
        createdAt: Date.now(),
        messages: [],
      };
      dispatch({ type: "ADD_CHAT", payload: newChat });
      chatId = newChat.id;
      // Small delay to ensure state updates
      await new Promise((r) => setTimeout(r, 0));
    }

    // Build content parts
    const contentParts: ContentPart[] = [];

    if (text.trim()) {
      contentParts.push({ type: "text", text: text.trim() });
    }

    const imageFiles: File[] = [];
    const docFiles: File[] = [];

    for (const file of attachments) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext || "")) {
        imageFiles.push(file);
      } else {
        docFiles.push(file);
      }
    }

    // Process image attachments
    for (const imgFile of imageFiles) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imgFile);
      });
      contentParts.push({
        type: "image_url",
        image_url: { url: dataUrl },
        fileName: imgFile.name,
      });
    }

    // Process document attachments
    for (const docFile of docFiles) {
      const { extractTextFromFile } = await import("../services/openrouter");
      const extracted = await extractTextFromFile(docFile);
      contentParts.push({
        type: "document",
        documentContent: extracted,
        fileName: docFile.name,
        fileType: docFile.type,
        text: `[Document: ${docFile.name}]\n${extracted}`,
      });
    }

    const hasImage = imageFiles.length > 0;
    const hasDocument = docFiles.length > 0;

    // Create user message
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content:
        contentParts.length === 1 && contentParts[0].type === "text"
          ? (contentParts[0].text ?? "")
          : contentParts,
      timestamp: Date.now(),
    };

    dispatch({ type: "ADD_MESSAGE", chatId, message: userMessage });

    // Auto-generate title from first message
    const currentChat = stateRef.current.chats.find((c) => c.id === chatId);
    if (currentChat && currentChat.messages.length === 0) {
      const titleText = text.slice(0, 40).replace(/\n/g, " ");
      dispatch({
        type: "SET_CHAT_TITLE",
        chatId,
        title: titleText || "New Chat",
      });
    }

    // Determine model to use
    const availableModels = models.length > 0 ? models : FALLBACK_MODELS;
    let modelToUse =
      selectedModel === "auto"
        ? selectBestModel(availableModels, text, hasImage, hasDocument)
        : selectedModel;

    // If image attached and selected model doesn't support vision, auto-switch to a vision model
    if (hasImage && selectedModel !== "auto") {
      const selectedModelObj = availableModels.find(
        (m) => m.id === selectedModel,
      );
      if (!modelSupportsVision(selectedModelObj)) {
        // Find a free vision model
        const visionModel = availableModels.find((m) => modelSupportsVision(m));
        if (visionModel) {
          modelToUse = visionModel.id;
          toast.info(
            `Switched to ${visionModel.name} for image support. Your selected model doesn't support images.`,
            { duration: 4000 },
          );
        }
      }
    }

    // Create assistant placeholder message
    const assistantMessageId = generateId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      model: modelToUse,
      isStreaming: true,
    };

    dispatch({ type: "ADD_MESSAGE", chatId, message: assistantMessage });
    dispatch({ type: "SET_STREAMING", payload: true });

    // Cancel any previous in-flight request immediately
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Build OpenRouter messages - strip image data from history to keep payloads small
      const updatedChat = stateRef.current.chats.find((c) => c.id === chatId);
      const history = updatedChat?.messages || [];

      // Keep last N text messages for context (avoid sending huge history)
      // Images from old messages are stripped - only current message images are sent
      const MAX_HISTORY_MESSAGES = 20;
      const historyMessages = history.filter(
        (m) => m.id !== assistantMessageId && !m.isStreaming,
      );
      // Always include all messages but strip images from non-recent ones
      const recentCutoff = historyMessages.length - MAX_HISTORY_MESSAGES;

      const apiMessages: OpenRouterMessage[] = historyMessages.map(
        (m, idx): OpenRouterMessage => {
          if (typeof m.content === "string") {
            return { role: m.role as "user" | "assistant", content: m.content };
          }

          const isRecent = idx >= recentCutoff;
          const isCurrentUserMessage = m.id === userMessage.id;

          // Convert ContentPart[] to OpenRouterContentPart[]
          const parts: OpenRouterContentPart[] = [];

          for (const p of m.content) {
            if (p.type === "image_url" && p.image_url) {
              // Only include image data for the current message or recent messages with vision model
              if (isCurrentUserMessage || isRecent) {
                parts.push({ type: "image_url", image_url: p.image_url });
              } else {
                // Replace old images with a text placeholder to keep history compact
                parts.push({
                  type: "text",
                  text: `[Image: ${p.fileName || "image"} - content not repeated]`,
                });
              }
            } else if (p.type === "text") {
              parts.push({ type: "text", text: p.text || "" });
            } else if (p.type === "document") {
              // For document parts, include the text content
              if (p.text) {
                parts.push({ type: "text", text: p.text });
              }
            }
          }

          return {
            role: m.role as "user" | "assistant",
            content: parts.length > 0 ? parts : "",
          };
        },
      );

      // Stream the response
      for await (const chunk of streamChat(
        apiKey,
        modelToUse,
        apiMessages,
        abortController.signal,
      )) {
        dispatch({
          type: "UPDATE_LAST_MESSAGE",
          chatId,
          delta: chunk,
        });
      }

      dispatch({
        type: "FINALIZE_MESSAGE",
        chatId,
        messageId: assistantMessageId,
        model: modelToUse,
      });
    } catch (err) {
      // Ignore aborted requests - user started a new message or switched chats
      if (err instanceof Error && err.name === "AbortError") {
        dispatch({
          type: "SET_MESSAGE_ERROR",
          chatId,
          messageId: assistantMessageId,
          error: "",
        });
        return;
      }

      const errMsg = err instanceof Error ? err.message : "An error occurred";
      const isRateLimit =
        errMsg.toLowerCase().includes("rate limit") ||
        errMsg.toLowerCase().includes("unavailable");

      dispatch({
        type: "SET_MESSAGE_ERROR",
        chatId,
        messageId: assistantMessageId,
        error: errMsg,
      });

      if (isRateLimit) {
        toast.error(errMsg, {
          description: "Try selecting a different model from the dropdown.",
          duration: 5000,
        });
      } else {
        toast.error(errMsg);
      }
    } finally {
      dispatch({ type: "SET_STREAMING", payload: false });
      // Clear the controller ref if it's still ours
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  const value: ChatContextValue = {
    state,
    dispatch,
    activeChat,
    createNewChat,
    sendMessage,
    loadModels,
  };

  return createElement(ChatContext.Provider, { value }, children);
}

export function useChatStore(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatStore must be used within ChatProvider");
  return ctx;
}
