import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ChevronRight,
  Edit3,
  ExternalLink,
  Info,
  Key,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useChatStore } from "../hooks/useChatStore";
import { APIKeyModal } from "./APIKeyModal";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return "•".repeat(16);
  return key.slice(0, 6) + "•".repeat(12) + key.slice(-4);
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { state, dispatch } = useChatStore();
  const { apiKey, selectedModel, models } = state;
  const [showUpdateKey, setShowUpdateKey] = useState(false);

  const handleRemoveKey = () => {
    dispatch({ type: "SET_API_KEY", payload: null });
    dispatch({ type: "TOGGLE_API_KEY_MODAL", payload: true });
    onClose();
    toast.success("API key removed");
  };

  const selectedModelInfo = models.find((m) => m.id === selectedModel);

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-40 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Panel - slides in from right */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative ml-auto h-full w-full max-w-sm bg-white shadow-modal flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <h2 className="font-heading font-bold text-base text-foreground">
                  Settings
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                  aria-label="Close settings"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {/* API Key section */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Key className="w-4 h-4 text-teal-600" />
                    <h3 className="font-heading font-semibold text-sm text-foreground">
                      API Key
                    </h3>
                  </div>

                  {apiKey ? (
                    <div className="bg-muted/50 rounded-xl p-4 border border-border">
                      <p className="text-xs text-muted-foreground mb-2">
                        Current key
                      </p>
                      <p className="font-mono text-sm text-foreground mb-3 bg-background rounded-lg px-3 py-2 border border-border">
                        {maskKey(apiKey)}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowUpdateKey(true)}
                          className="flex-1 h-8 text-xs gap-1.5"
                        >
                          <Edit3 className="w-3 h-3" />
                          Update Key
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveKey}
                          className="flex-1 h-8 text-xs gap-1.5 text-destructive hover:text-destructive hover:border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                      <p className="text-sm text-amber-700 mb-2">
                        No API key set
                      </p>
                      <Button
                        size="sm"
                        onClick={() => {
                          dispatch({
                            type: "TOGGLE_API_KEY_MODAL",
                            payload: true,
                          });
                          onClose();
                        }}
                        className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        Add API Key
                      </Button>
                    </div>
                  )}
                </div>

                <Separator className="mx-5" />

                {/* Current model */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ChevronRight className="w-4 h-4 text-teal-600" />
                    <h3 className="font-heading font-semibold text-sm text-foreground">
                      Active Model
                    </h3>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4 border border-border">
                    {selectedModel === "auto" ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="secondary"
                            className="bg-teal-50 text-teal-700 border-teal-100 text-xs"
                          >
                            Auto
                          </Badge>
                          <span className="text-sm font-medium text-foreground">
                            Smart Mode
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Automatically selects the best free model for each
                          request
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-foreground mb-0.5">
                          {selectedModelInfo?.name ||
                            selectedModel.split("/").pop()}
                        </p>
                        {selectedModelInfo && (
                          <p className="text-xs text-muted-foreground">
                            Context:{" "}
                            {selectedModelInfo.context_length >= 1000
                              ? `${Math.round(selectedModelInfo.context_length / 1000)}K`
                              : selectedModelInfo.context_length}{" "}
                            tokens
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Change model from the model selector in the chat header.
                  </p>
                </div>

                <Separator className="mx-5" />

                {/* About section */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-teal-600" />
                    <h3 className="font-heading font-semibold text-sm text-foreground">
                      About
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🐼</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Panda AI v1.0
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Powered by OpenRouter
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Access the latest free AI models with your own OpenRouter
                      API key. Your key stays on your device — never sent to any
                      server.
                    </p>
                    <a
                      href="https://openrouter.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                      Visit OpenRouter
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border px-5 py-4 shrink-0">
                <p className="text-xs text-muted-foreground/60 text-center">
                  © {new Date().getFullYear()}.{" "}
                  <a
                    href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-muted-foreground transition-colors"
                  >
                    Built with caffeine.ai
                  </a>
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Update key modal */}
      <APIKeyModal
        open={showUpdateKey}
        onClose={() => setShowUpdateKey(false)}
        isUpdate
      />
    </>
  );
}
