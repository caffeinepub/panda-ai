import { Toaster } from "@/components/ui/sonner";
import { useCallback, useEffect, useRef } from "react";
import { APIKeyModal } from "./components/APIKeyModal";
import { ChatArea } from "./components/ChatArea";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SettingsPanel } from "./components/SettingsPanel";
import { Sidebar } from "./components/Sidebar";
import { ChatProvider, useChatStore } from "./hooks/useChatStore";

function AppInner() {
  const { state, dispatch, sendMessage, createNewChat, loadModels } =
    useChatStore();
  const { showApiKeyModal, showSettings, apiKey } = state;
  const didLoadModels = useRef(false);

  // Load models once API key is available
  useEffect(() => {
    if (apiKey && !didLoadModels.current) {
      didLoadModels.current = true;
      loadModels();
    }
  }, [apiKey, loadModels]);

  const handleSuggestion = useCallback(
    async (text: string) => {
      if (!state.activeChatId) {
        createNewChat();
        // Wait for state update
        await new Promise((r) => setTimeout(r, 10));
      }
      await sendMessage(text, []);
    },
    [state.activeChatId, createNewChat, sendMessage],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background font-body">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ChatArea onSuggestion={handleSuggestion} />
      </main>

      {/* Modals & Panels */}
      <APIKeyModal
        open={showApiKeyModal}
        onClose={() => {
          if (state.apiKey) {
            dispatch({ type: "TOGGLE_API_KEY_MODAL", payload: false });
          }
        }}
      />

      <SettingsPanel
        open={showSettings}
        onClose={() => dispatch({ type: "TOGGLE_SETTINGS", payload: false })}
      />

      <Toaster position="top-right" richColors />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ChatProvider>
        <AppInner />
      </ChatProvider>
    </ErrorBoundary>
  );
}
