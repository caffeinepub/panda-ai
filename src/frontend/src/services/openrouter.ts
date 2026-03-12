export interface Model {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string;
  };
  pricing?: {
    prompt: string;
    completion: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  per_request_limits?: Record<string, string> | null;
}

export interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string | OpenRouterContentPart[];
}

export interface OpenRouterContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export const FALLBACK_MODELS: Model[] = [
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B Instruct",
    description: "Meta's powerful 70B model, free tier",
    context_length: 131072,
    architecture: { modality: "text" },
    pricing: { prompt: "0", completion: "0" },
  },
  {
    id: "google/gemma-3-27b-it:free",
    name: "Gemma 3 27B",
    description: "Google's Gemma 3 instruction-tuned model",
    context_length: 131072,
    architecture: { modality: "text" },
    pricing: { prompt: "0", completion: "0" },
  },
  {
    id: "deepseek/deepseek-chat-v3-0324:free",
    name: "DeepSeek Chat V3",
    description: "DeepSeek's latest chat model",
    context_length: 65536,
    architecture: { modality: "text" },
    pricing: { prompt: "0", completion: "0" },
  },
  {
    id: "qwen/qwen3-8b:free",
    name: "Qwen3 8B",
    description: "Alibaba's Qwen3 8B model",
    context_length: 40000,
    architecture: { modality: "text" },
    pricing: { prompt: "0", completion: "0" },
  },
  {
    id: "mistralai/mistral-7b-instruct:free",
    name: "Mistral 7B Instruct",
    description: "Fast and efficient Mistral model",
    context_length: 32768,
    architecture: { modality: "text" },
    pricing: { prompt: "0", completion: "0" },
  },
];

const VISION_FALLBACK_MODEL = "google/gemini-2.0-flash-exp:free";
const FORMAT_FALLBACK_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

export async function fetchFreeModels(apiKey: string): Promise<Model[]> {
  const response = await fetch(`${OPENROUTER_BASE}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`);
  }

  const data = (await response.json()) as { data: Model[] };
  const models = data.data || [];

  const freeModels = models.filter((model) => {
    const isFreeById = model.id.includes(":free");
    const isFreeByPricing =
      model.pricing?.prompt === "0" && model.pricing?.completion === "0";
    return isFreeById || isFreeByPricing;
  });

  return freeModels.sort((a, b) => {
    if (b.context_length !== a.context_length) {
      return b.context_length - a.context_length;
    }
    return a.name.localeCompare(b.name);
  });
}

const CODE_KEYWORDS = [
  "code",
  "function",
  "class",
  "implement",
  "debug",
  "error",
  "algorithm",
  "typescript",
  "javascript",
  "python",
  "java",
  "rust",
  "golang",
  "sql",
  "html",
  "css",
  "api",
  "bug",
  "fix",
  "refactor",
  "script",
];

const CODING_MODEL_KEYWORDS = [
  "deepseek",
  "coder",
  "codestral",
  "qwen-coder",
  "starcoder",
  "codellama",
];

export function selectBestModel(
  models: Model[],
  query: string,
  hasImage: boolean,
  hasDocument: boolean,
): string {
  if (models.length === 0) return FALLBACK_MODELS[0].id;

  const lowerQuery = query.toLowerCase();
  const hasCodeKeyword = CODE_KEYWORDS.some((kw) => lowerQuery.includes(kw));
  const isLongQuery = query.length > 500;

  if (hasImage) {
    const visionModel = models.find((m) => modelSupportsVision(m));
    if (visionModel) return visionModel.id;
  }

  if (hasDocument || isLongQuery) {
    const highContextModel = models
      .filter((m) => m.context_length >= 100000)
      .sort((a, b) => b.context_length - a.context_length)[0];
    if (highContextModel) return highContextModel.id;
  }

  if (hasCodeKeyword) {
    const codingModel = models.find((m) =>
      CODING_MODEL_KEYWORDS.some(
        (kw) =>
          m.id.toLowerCase().includes(kw) || m.name.toLowerCase().includes(kw),
      ),
    );
    if (codingModel) return codingModel.id;
  }

  return models[0].id;
}

const VISION_ID_PATTERNS = [
  "vision",
  "-vl",
  "vl-",
  "gpt-4o",
  "claude-3",
  "gemini",
  "pixtral",
  "llava",
  "minicpm-v",
  "qwen-vl",
  "qvq",
  "qwen2-vl",
  "internvl",
  "moondream",
  "phi-3-vision",
  "phi3-vision",
  "idefics",
  "cogvlm",
  "deepseek-vl",
  "molmo",
  "aria",
  "ovis",
  "llama-3.2-11b-vision",
  "llama-3.2-90b-vision",
  "llama3.2-vision",
  "free-vision",
];

export function modelSupportsVision(model: Model | undefined): boolean {
  if (!model) return false;
  const modality = model.architecture?.modality || "";
  if (modality.includes("image")) return true;

  const idLower = model.id.toLowerCase();
  const nameLower = model.name.toLowerCase();

  return (
    VISION_ID_PATTERNS.some((p) => idLower.includes(p)) ||
    nameLower.includes("vision") ||
    nameLower.includes("visual") ||
    nameLower.includes(" vl") ||
    nameLower.includes("multimodal")
  );
}

function normalizeMessages(messages: OpenRouterMessage[]): OpenRouterMessage[] {
  return messages.map((m) => {
    if (!Array.isArray(m.content)) return m;
    const parts = m.content as OpenRouterContentPart[];
    const hasImage = parts.some((p) => p.type === "image_url");
    if (hasImage) return m;
    const text = parts
      .filter((p) => p.type === "text")
      .map((p) => p.text ?? "")
      .join("\n");
    return { ...m, content: text };
  });
}

export async function* streamChat(
  apiKey: string,
  model: string,
  messages: OpenRouterMessage[],
  signal?: AbortSignal,
  hasImages = false,
): AsyncGenerator<string> {
  const normalizedMessages = normalizeMessages(messages);

  const triedModels = new Set<string>();
  let modelToUse = model;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (triedModels.has(modelToUse)) break;
    triedModels.add(modelToUse);

    let response: Response;
    try {
      response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "Panda AI",
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: normalizedMessages,
          stream: true,
        }),
        signal,
      });
    } catch (fetchErr) {
      if (fetchErr instanceof Error && fetchErr.name === "AbortError")
        throw fetchErr;
      throw new Error(
        "Network error: Could not reach OpenRouter. Please check your internet connection.",
      );
    }

    if (!response.ok) {
      let errorData: { error?: { message?: string; code?: number } } = {};
      try {
        errorData = (await response.json()) as typeof errorData;
      } catch {
        // ignore
      }
      const msg =
        errorData.error?.message || response.statusText || "Unknown API error";

      if (response.status === 401) {
        throw new Error("Invalid API key. Please update your key in Settings.");
      }

      if (response.status === 402) {
        throw new Error(
          "Insufficient credits. Please check your OpenRouter account.",
        );
      }

      if (response.status === 429) {
        throw new Error(
          `Rate limit reached for "${modelToUse}". Please switch to a different model or wait a moment.`,
        );
      }

      if (response.status === 400) {
        const isImageError =
          msg.toLowerCase().includes("image") ||
          msg.toLowerCase().includes("vision") ||
          msg.toLowerCase().includes("modality") ||
          msg.toLowerCase().includes("endpoint") ||
          msg.toLowerCase().includes("no endpoints");

        if (isImageError) {
          if (!triedModels.has(VISION_FALLBACK_MODEL)) {
            modelToUse = VISION_FALLBACK_MODEL;
            continue;
          }
          throw new Error(
            "The selected model does not support image input. Please switch to a vision-capable model (e.g. Gemini Flash).",
          );
        }

        const isFormatError =
          msg.toLowerCase().includes("format") ||
          msg.toLowerCase().includes("not support") ||
          msg.toLowerCase().includes("invalid") ||
          msg.toLowerCase().includes("unsupported");

        if (isFormatError && !triedModels.has(FORMAT_FALLBACK_MODEL)) {
          modelToUse = FORMAT_FALLBACK_MODEL;
          continue;
        }

        throw new Error(
          "This model doesn't support the request format. Try selecting a different model.",
        );
      }

      // 500 / 502 / 503 — server crashed, retry with a reliable fallback
      if (
        response.status === 500 ||
        response.status === 502 ||
        response.status === 503
      ) {
        const fallback = hasImages
          ? VISION_FALLBACK_MODEL
          : FORMAT_FALLBACK_MODEL;
        if (!triedModels.has(fallback)) {
          modelToUse = fallback;
          continue;
        }
        throw new Error(
          "The AI service is experiencing issues right now. Please try again in a moment or select a different model.",
        );
      }

      if (
        msg.toLowerCase().includes("no endpoints") ||
        msg.toLowerCase().includes("image input")
      ) {
        throw new Error(
          "The selected model does not support image input. Please switch to a vision-capable model (e.g. Gemini Flash).",
        );
      }

      throw new Error(msg || `Request failed (${response.status}).`);
    }

    // Stream the response
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let streamErrorMsg: string | null = null;

    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") break outer;
        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
            error?: { message?: string; code?: number };
          };
          if (parsed.error) {
            const errMsg = parsed.error.message || "Unknown error";
            const isStreamImageErr =
              errMsg.toLowerCase().includes("no endpoints") ||
              errMsg.toLowerCase().includes("image input") ||
              errMsg.toLowerCase().includes("vision") ||
              errMsg.toLowerCase().includes("modality");
            streamErrorMsg = isStreamImageErr
              ? "The selected model does not support image input. Please switch to a vision-capable model (e.g. Gemini Flash)."
              : errMsg;
            break outer;
          }
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch (e) {
          if (
            e instanceof Error &&
            !e.message.includes("JSON") &&
            e.message !== "Unexpected end of JSON input"
          ) {
            throw e;
          }
        }
      }
    }

    if (streamErrorMsg) {
      throw new Error(streamErrorMsg);
    }

    return; // success
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "txt" || ext === "md" || ext === "csv" || ext === "json") {
    return await file.text();
  }

  if (ext === "pdf") {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder("latin1").decode(bytes);

    const chunks: string[] = [];
    const btRegex = /BT[\s\S]*?ET/g;
    let match: RegExpExecArray | null = btRegex.exec(text);
    while (match !== null) {
      const block = match[0];
      const strMatches = block.match(/\(([^)]*)\)\s*Tj/g);
      if (strMatches) {
        for (const s of strMatches) {
          const inner = s.match(/\(([^)]*)\)/);
          if (inner) chunks.push(inner[1]);
        }
      }
      const arrMatches = block.match(/\[([^\]]*)\]\s*TJ/g);
      if (arrMatches) {
        for (const s of arrMatches) {
          const inner = s.match(/\(([^)]*)\)/g);
          if (inner) {
            chunks.push(inner.map((p) => p.replace(/[()]/g, "")).join(""));
          }
        }
      }
      match = btRegex.exec(text);
    }
    const extracted = chunks
      .join(" ")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .trim();
    return (
      extracted ||
      "[PDF content could not be extracted. Please copy and paste the text directly.]"
    );
  }

  try {
    const text = await file.text();
    const readable = text
      .replace(/[^\x20-\x7E\n\r\t]/g, " ")
      .replace(/\s{3,}/g, " ")
      .trim();
    return readable.length > 50
      ? readable
      : "[Document content could not be extracted. Please paste the text directly.]";
  } catch {
    return "[Could not read document content.]";
  }
}
