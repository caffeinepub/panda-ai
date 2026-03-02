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

// Default fallback models if API fails
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

  // Filter free models: pricing.prompt === "0" or id contains ":free"
  const freeModels = models.filter((model) => {
    const isFreeById = model.id.includes(":free");
    const isFreeByPricing =
      model.pricing?.prompt === "0" && model.pricing?.completion === "0";
    return isFreeById || isFreeByPricing;
  });

  // Sort by context length descending, then by name
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

  // Vision request: prefer multimodal models
  if (hasImage) {
    const visionModel = models.find(
      (m) =>
        m.architecture?.modality?.includes("image") ||
        m.id.includes("vision") ||
        m.id.includes("vl") ||
        m.name.toLowerCase().includes("vision") ||
        m.id.includes("claude-3") ||
        m.id.includes("gemini"),
    );
    if (visionModel) return visionModel.id;
  }

  // Document analysis or long query: prefer high context
  if (hasDocument || isLongQuery) {
    const highContextModel = models
      .filter((m) => m.context_length >= 100000)
      .sort((a, b) => b.context_length - a.context_length)[0];
    if (highContextModel) return highContextModel.id;
  }

  // Coding request: prefer coding-specialized models
  if (hasCodeKeyword) {
    const codingModel = models.find((m) =>
      CODING_MODEL_KEYWORDS.some(
        (kw) =>
          m.id.toLowerCase().includes(kw) || m.name.toLowerCase().includes(kw),
      ),
    );
    if (codingModel) return codingModel.id;
  }

  // Default: return the first model (already sorted by context length)
  return models[0].id;
}

// System prompt to enforce English responses regardless of model defaults
const SYSTEM_PROMPT: OpenRouterMessage = {
  role: "system",
  content:
    "You are Panda AI, a helpful assistant. Always respond in English only, regardless of what language the user writes in, unless the user explicitly asks you to respond in a different language. Never switch to Chinese, Japanese, or any other language by default.",
};

export async function* streamChat(
  apiKey: string,
  model: string,
  messages: OpenRouterMessage[],
): AsyncGenerator<string> {
  // Prepend system prompt if not already present
  const hasSystemMessage = messages.some((m) => m.role === "system");
  const messagesWithSystem = hasSystemMessage
    ? messages
    : [SYSTEM_PROMPT, ...messages];

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "Panda AI",
    },
    body: JSON.stringify({
      model,
      messages: messagesWithSystem,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: { message?: string; code?: number };
    };
    const msg = errorData.error?.message || "Unknown API error";

    if (response.status === 401) {
      throw new Error("Invalid API key. Please update your key in Settings.");
    }
    if (response.status === 429) {
      throw new Error(
        `Rate limit reached for model "${model}". Please switch to a different model or wait a moment.`,
      );
    }
    if (response.status === 402) {
      throw new Error(
        "Insufficient credits. Please check your OpenRouter account.",
      );
    }
    if (response.status === 400) {
      throw new Error(
        `This model doesn't support the request format. Try a different model.`,
      );
    }
    if (response.status === 503 || response.status === 502) {
      throw new Error(
        `Model "${model}" is currently unavailable. Please try a different model.`,
      );
    }
    throw new Error(msg);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // skip malformed chunks
        }
      }
    }
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "txt" || ext === "md" || ext === "csv" || ext === "json") {
    return await file.text();
  }

  if (ext === "pdf") {
    // Basic PDF text extraction from raw bytes
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder("latin1").decode(bytes);

    // Extract text between BT/ET markers (very basic)
    const chunks: string[] = [];
    const btRegex = /BT[\s\S]*?ET/g;
    let match: RegExpExecArray | null = btRegex.exec(text);
    while (match !== null) {
      const block = match[0];
      // Extract strings from Tj, TJ operators
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

  // For DOCX and other binary formats, try to extract readable text
  try {
    const text = await file.text();
    // Filter to printable ASCII-ish characters
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
