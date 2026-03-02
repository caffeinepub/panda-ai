import { Code2, FileText, Image, Lightbulb } from "lucide-react";
import { motion } from "motion/react";

interface WelcomeScreenProps {
  onSuggestion: (text: string) => void;
}

const suggestions = [
  {
    icon: Code2,
    label: "Write code",
    description: "Get help with any programming language or framework",
    prompt:
      "Write a React component that displays a responsive card grid with hover animations",
    iconColor: "oklch(0.52 0.18 255)",
    iconBg: "oklch(0.95 0.03 255)",
    borderHover: "oklch(0.80 0.07 255)",
  },
  {
    icon: Image,
    label: "Analyze image",
    description: "Upload an image and ask questions about it",
    prompt:
      "I have an image I'd like you to analyze. Please describe what you see and provide insights.",
    iconColor: "oklch(0.52 0.18 305)",
    iconBg: "oklch(0.95 0.03 305)",
    borderHover: "oklch(0.80 0.07 305)",
  },
  {
    icon: FileText,
    label: "Summarize document",
    description: "Upload a PDF or text file and extract key points",
    prompt:
      "Please help me summarize and extract the key points from a document I'll share.",
    iconColor: "oklch(0.58 0.17 45)",
    iconBg: "oklch(0.96 0.03 45)",
    borderHover: "oklch(0.82 0.08 45)",
  },
  {
    icon: Lightbulb,
    label: "Explain concept",
    description: "Break down complex topics into plain language",
    prompt:
      "Explain how large language models work in simple terms that a beginner could understand",
    iconColor: "oklch(0.58 0.14 195)",
    iconBg: "oklch(0.97 0.02 195)",
    borderHover: "oklch(0.82 0.08 195)",
  },
];

export function WelcomeScreen({ onSuggestion }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="text-center w-full max-w-xl"
      >
        {/* Logo mark */}
        <motion.div
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: 0.08,
            duration: 0.4,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 text-3xl select-none"
          style={{
            background: "oklch(0.97 0.02 195)",
            border: "1px solid oklch(0.87 0.07 195)",
            boxShadow: "0 4px 16px oklch(0.58 0.14 195 / 0.12)",
          }}
          role="img"
          aria-label="Panda AI"
        >
          🐼
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.38 }}
          className="text-[1.6rem] font-heading font-bold text-foreground mb-2 tracking-tight leading-tight"
        >
          What can I help you with?
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.38 }}
          className="text-sm leading-relaxed mb-8"
          style={{ color: "oklch(0.55 0.01 240)" }}
        >
          Powered by OpenRouter &mdash; free AI models, your API key, no data
          sent to any server.
        </motion.p>

        {/* Suggestion cards */}
        <div className="grid grid-cols-2 gap-2.5 w-full">
          {suggestions.map((s, i) => (
            <motion.button
              key={s.label}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 + i * 0.06, duration: 0.32 }}
              onClick={() => onSuggestion(s.prompt)}
              className="flex flex-col items-start gap-3 p-4 rounded-xl border bg-white text-left transition-all duration-200 cursor-pointer group"
              style={{
                borderColor: "oklch(0.90 0.005 200)",
                boxShadow: "0 1px 3px oklch(0 0 0 / 0.05)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = s.borderHover;
                el.style.boxShadow =
                  "0 4px 12px oklch(0 0 0 / 0.07), 0 1px 3px oklch(0 0 0 / 0.05)";
                el.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = "oklch(0.90 0.005 200)";
                el.style.boxShadow = "0 1px 3px oklch(0 0 0 / 0.05)";
                el.style.transform = "translateY(0)";
              }}
            >
              {/* Icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                style={{ background: s.iconBg }}
              >
                <s.icon className="w-4 h-4" style={{ color: s.iconColor }} />
              </div>

              <div className="text-left">
                <p className="text-[13px] font-semibold text-foreground leading-tight">
                  {s.label}
                </p>
                <p
                  className="text-[11.5px] mt-0.5 leading-snug"
                  style={{ color: "oklch(0.58 0.01 240)" }}
                >
                  {s.description}
                </p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Keyboard hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="text-[11px] mt-5"
          style={{ color: "oklch(0.68 0.005 200)" }}
        >
          Press{" "}
          <kbd
            className="px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{
              background: "oklch(0.93 0.005 200)",
              border: "1px solid oklch(0.86 0.005 200)",
            }}
          >
            Enter
          </kbd>{" "}
          to send &middot;{" "}
          <kbd
            className="px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{
              background: "oklch(0.93 0.005 200)",
              border: "1px solid oklch(0.86 0.005 200)",
            }}
          >
            Shift + Enter
          </kbd>{" "}
          for new line
        </motion.p>
      </motion.div>
    </div>
  );
}
