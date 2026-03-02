import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, ExternalLink, Eye, EyeOff, Key } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useChatStore } from "../hooks/useChatStore";

interface APIKeyModalProps {
  open: boolean;
  onClose?: () => void;
  isUpdate?: boolean;
}

export function APIKeyModal({
  open,
  onClose,
  isUpdate = false,
}: APIKeyModalProps) {
  const { dispatch } = useChatStore();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError("Please enter your API key.");
      return;
    }
    if (!trimmed.startsWith("sk-")) {
      setError('OpenRouter API keys start with "sk-". Please check your key.');
      return;
    }
    dispatch({ type: "SET_API_KEY", payload: trimmed });
    dispatch({ type: "TOGGLE_API_KEY_MODAL", payload: false });
    setApiKey("");
    setError("");
    onClose?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape" && isUpdate) onClose?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={isUpdate ? onClose : undefined}
          />

          {/* Modal */}
          <motion.dialog
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-modal border border-border p-8"
            open
            aria-labelledby="api-key-modal-title"
          >
            {/* Icon */}
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 mx-auto mb-5">
              <span className="text-2xl">🐼</span>
            </div>

            <h2
              id="api-key-modal-title"
              className="text-xl font-heading font-bold text-center text-foreground mb-1"
            >
              {isUpdate ? "Update API Key" : "Welcome to Panda AI"}
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {isUpdate
                ? "Enter a new OpenRouter API key to replace the current one."
                : "Enter your OpenRouter API key to start chatting with AI models."}
            </p>

            {/* Key input */}
            <div className="space-y-2 mb-4">
              <Label
                htmlFor="api-key-input"
                className="text-sm font-medium text-foreground"
              >
                OpenRouter API Key
              </Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="api-key-input"
                  type={showKey ? "text" : "password"}
                  placeholder="sk-or-..."
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setError("");
                  }}
                  onKeyDown={handleKeyDown}
                  className="pl-9 pr-10 font-mono text-sm h-11 border-border focus:border-teal-500 focus:ring-teal-500/20"
                  autoFocus
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {error && (
                <p className="text-xs text-destructive mt-1" role="alert">
                  {error}
                </p>
              )}
            </div>

            {/* Privacy note */}
            <div className="flex items-start gap-2 bg-teal-50 border border-teal-100 rounded-xl p-3 mb-6">
              <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
              <p className="text-xs text-teal-700 leading-relaxed">
                Your API key is stored locally on your device only and never
                sent to any server.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                onClick={handleSave}
                className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl"
              >
                Save & Continue
              </Button>
              {isUpdate && (
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="w-full h-11 rounded-xl"
                >
                  Cancel
                </Button>
              )}
            </div>

            {/* Get API key link */}
            <p className="text-center text-xs text-muted-foreground mt-4">
              Don&apos;t have a key?{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:text-teal-700 inline-flex items-center gap-0.5 font-medium"
              >
                Get one free at OpenRouter
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            </p>
          </motion.dialog>
        </div>
      )}
    </AnimatePresence>
  );
}
