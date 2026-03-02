import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Cpu, RefreshCw, Search, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { useChatStore } from "../hooks/useChatStore";
import type { Model } from "../services/openrouter";

function formatContextLength(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`;
  return String(tokens);
}

function getProviderFromId(modelId: string): string {
  const parts = modelId.split("/");
  if (parts.length < 2) return "Unknown";
  return parts[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getModelDisplayName(model: Model): string {
  return model.name || model.id.split("/").pop() || model.id;
}

function ModelItem({
  model,
  isSelected,
  onSelect,
}: {
  model: Model;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const provider = getProviderFromId(model.id);
  const displayName = getModelDisplayName(model);
  const hasVision =
    model.architecture?.modality?.includes("image") ||
    model.id.includes("vision") ||
    model.id.includes("vl");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent transition-colors ${
        isSelected ? "bg-teal-50 border border-teal-100" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-sm font-medium truncate ${isSelected ? "text-teal-700" : "text-foreground"}`}
            >
              {displayName}
            </span>
            {hasVision && (
              <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-100 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                Vision
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{provider}</span>
        </div>
        <span className="text-xs text-muted-foreground shrink-0 bg-muted/60 px-1.5 py-0.5 rounded font-mono mt-0.5">
          {formatContextLength(model.context_length)}
        </span>
      </div>
    </button>
  );
}

export function ModelSelector() {
  const { state, dispatch, loadModels } = useChatStore();
  const { selectedModel, models, isLoadingModels } = state;
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filteredModels = useMemo(() => {
    if (!search.trim()) return models;
    const lower = search.toLowerCase();
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(lower) ||
        m.id.toLowerCase().includes(lower),
    );
  }, [models, search]);

  const selectedModelInfo = useMemo(() => {
    if (selectedModel === "auto") return null;
    return models.find((m) => m.id === selectedModel) || null;
  }, [selectedModel, models]);

  const displayName =
    selectedModel === "auto"
      ? "Auto (Smart)"
      : selectedModelInfo
        ? getModelDisplayName(selectedModelInfo)
        : selectedModel.split("/").pop() || selectedModel;

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await loadModels();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all border border-transparent hover:border-border max-w-[260px]"
          title="Select AI model"
        >
          <Cpu className="w-3.5 h-3.5 shrink-0 text-teal-600" />
          <span className="truncate">{displayName}</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-80 p-2 shadow-modal border-border rounded-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1 mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Select Model
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoadingModels}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Refresh models"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoadingModels ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Auto option */}
        <button
          type="button"
          onClick={() => {
            dispatch({ type: "SET_SELECTED_MODEL", payload: "auto" });
            setOpen(false);
          }}
          className={`w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent transition-colors mb-1 ${
            selectedModel === "auto" ? "bg-teal-50 border border-teal-100" : ""
          }`}
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-teal-600 shrink-0" />
            <div>
              <div
                className={`text-sm font-medium ${selectedModel === "auto" ? "text-teal-700" : "text-foreground"}`}
              >
                Auto (Smart)
              </div>
              <div className="text-xs text-muted-foreground">
                Automatically picks the best model
              </div>
            </div>
          </div>
        </button>

        <div className="border-t border-border my-2" />

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm border-border rounded-lg"
          />
        </div>

        {/* Models list */}
        <ScrollArea className="max-h-72">
          {isLoadingModels ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading models...
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {models.length === 0
                ? "No models loaded yet"
                : "No models match your search"}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredModels.map((model) => (
                <ModelItem
                  key={model.id}
                  model={model}
                  isSelected={selectedModel === model.id}
                  onSelect={() => {
                    dispatch({ type: "SET_SELECTED_MODEL", payload: model.id });
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {models.length > 0 && (
          <div className="border-t border-border mt-2 pt-2 px-2">
            <p className="text-xs text-muted-foreground">
              {models.length} free model{models.length !== 1 ? "s" : ""}{" "}
              available
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
