import React, { useState, useRef, useCallback, useEffect } from "react";

// ===========================================
// TYPES
// ===========================================
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ElterngeldChatProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
  language?: "en" | "de";
}

// ===========================================
// TEXT FORMATTING
// ===========================================
const formatText = (text: string | undefined): React.ReactNode => {
  if (!text) return null;

  const parts = text.split(/(\*\*.*?\*\*|\[info:.*?\])/);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("[info:") && part.endsWith("]")) {
      return null;
    }
    return <span key={index}>{part}</span>;
  });
};

// ===========================================
// STREAMING CHAT FUNCTION
// ===========================================
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elterngeld-chat`;

async function streamChat({
  message,
  language,
  onDelta,
  onDone,
  onError,
}: {
  message: string;
  language: "en" | "de";
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ message, language }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        onError("Rate limit exceeded. Please try again in a moment.");
        return;
      }
      if (resp.status === 402) {
        onError("Service temporarily unavailable. Please try again later.");
        return;
      }
      const errorData = await resp.json().catch(() => ({ error: "Unknown error" }));
      onError(errorData.error || "Failed to get response");
      return;
    }

    if (!resp.body) {
      onError("No response body");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          /* ignore */
        }
      }
    }

    onDone();
  } catch (error) {
    onError(error instanceof Error ? error.message : "Connection error");
  }
}

// ===========================================
// MAIN COMPONENT
// ===========================================
const ElterngeldChat: React.FC<ElterngeldChatProps> = ({
  isOpen,
  onClose,
  initialMessage,
  language = "en",
}) => {
  const [chatInput, setChatInput] = useState(initialMessage || "");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialMessage) {
      setChatInput(initialMessage);
    }
  }, [initialMessage]);

  const scrollToBottom = useCallback(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isStreaming) return;

      const userMessage: ChatMessage = { role: "user", content: message.trim() };
      setChatMessages((prev) => [...prev, userMessage]);
      setChatInput("");
      setIsStreaming(true);

      setTimeout(scrollToBottom, 50);

      let assistantContent = "";
      
      // Add empty assistant message
      setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      await streamChat({
        message: message.trim(),
        language,
        onDelta: (chunk) => {
          assistantContent += chunk;
          setChatMessages((prev) => {
            const updated = [...prev];
            if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
              updated[updated.length - 1] = { role: "assistant", content: assistantContent };
            }
            return updated;
          });
          scrollToBottom();
        },
        onDone: () => {
          setIsStreaming(false);
        },
        onError: (error) => {
          setChatMessages((prev) => {
            const updated = [...prev];
            if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
              updated[updated.length - 1] = {
                role: "assistant",
                content: `Sorry, an error occurred: ${error}`,
              };
            }
            return updated;
          });
          setIsStreaming(false);
        },
      });
    },
    [isStreaming, language, scrollToBottom]
  );

  const suggestedQuestions =
    language === "de"
      ? [
          { icon: "help", question: "Was ist Elterngeld?" },
          { icon: "calculator", question: "Wie viel Elterngeld bekomme ich?" },
          { icon: "calendar", question: "Wie lange kann ich Elterngeld beziehen?" },
          { icon: "couple", question: "Wie sollten wir die Monate aufteilen?" },
          { icon: "briefcase", question: "Kann ich während des Elterngeldbezugs arbeiten?" },
          { icon: "globe", question: "Bin ich als Ausländer berechtigt?" },
          { icon: "document", question: "Welche Dokumente brauche ich?" },
          { icon: "clock", question: "Wann sollte ich den Antrag stellen?" },
        ]
      : [
          { icon: "help", question: "What is Elterngeld?" },
          { icon: "calculator", question: "How much Elterngeld will I get?" },
          { icon: "calendar", question: "How long can I receive Elterngeld?" },
          { icon: "couple", question: "How should we split the months?" },
          { icon: "briefcase", question: "Can I work while receiving Elterngeld?" },
          { icon: "globe", question: "Am I eligible as a foreigner?" },
          { icon: "document", question: "What documents do I need to apply?" },
          { icon: "clock", question: "When should I submit my application?" },
        ];

  const renderIcon = (iconName: string) => {
    const iconProps = {
      className: "w-[18px] h-[18px]",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.5,
      viewBox: "0 0 24 24",
    };

    switch (iconName) {
      case "help":
        return (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
          </svg>
        );
      case "calculator":
        return (
          <svg {...iconProps}>
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <path d="M8 6h8M8 10h2M14 10h2M8 14h2M14 14h2M8 18h2M14 18h2" />
          </svg>
        );
      case "calendar":
        return (
          <svg {...iconProps}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        );
      case "couple":
        return (
          <svg {...iconProps}>
            <circle cx="9" cy="7" r="4" />
            <circle cx="17" cy="9" r="3" />
            <path d="M3 21v-2c0-2.5 3-5 6-5 1.5 0 3 .5 4 1.5M17 21v-2c0-1.5 1-3 3-3" />
          </svg>
        );
      case "briefcase":
        return (
          <svg {...iconProps}>
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
          </svg>
        );
      case "globe":
        return (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
        );
      case "document":
        return (
          <svg {...iconProps}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </svg>
        );
      case "clock":
        return (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-background">
      <div className="h-full flex flex-col">
        {/* Chat Header */}
        <div className="flex-shrink-0 bg-background">
          <div className="px-5 py-3">
            <div className="max-w-lg mx-auto flex items-center justify-between">
              <div style={{ width: 32 }}></div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center transition-all hover:opacity-60 text-muted-foreground"
                  title={language === "de" ? "Zurück" : "Back to Guide"}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setChatMessages([])}
                  className="w-8 h-8 flex items-center justify-center shrink-0 transition-all hover:opacity-60 text-muted-foreground"
                  title={language === "de" ? "Chat neu starten" : "Restart chat"}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="h-px w-full bg-border"></div>
        </div>

        {/* Chat Messages */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          {chatMessages.length === 0 ? (
            <div className="h-full flex flex-col px-4 pt-8">
              <div className="max-w-lg mx-auto w-full">
                <h2 className="font-semibold mb-5 text-2xl text-foreground">
                  {language === "de" ? "Wie kann ich helfen?" : "What can I help with?"}
                </h2>

                <div className="space-y-0">
                  {suggestedQuestions.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(item.question)}
                      className="w-full flex items-center gap-3 py-1.5 text-left transition-all hover:opacity-70 text-foreground"
                    >
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
                        {renderIcon(item.icon)}
                      </span>
                      <span className="text-[15px]">{item.question}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-w-lg mx-auto">
              {chatMessages.map((msg, i) => {
                const isCurrentlyStreaming = isStreaming && i === chatMessages.length - 1 && msg.role === "assistant";
                return (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "user" ? (
                      <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-muted text-foreground">
                        <p className="text-[15px] leading-relaxed">{msg.content}</p>
                      </div>
                    ) : (
                      <div className="max-w-[90%]">
                        <p className="text-[15px] leading-relaxed text-foreground">
                          {formatText(msg.content)}
                          {isCurrentlyStreaming && (
                            <span className="inline-block w-2 h-2 ml-1 rounded-full align-middle bg-muted-foreground animate-pulse" />
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="flex-shrink-0 px-4 py-3 bg-background">
          <div className="max-w-lg mx-auto">
            <div className="rounded-2xl px-4 py-3 bg-card border border-border">
              <textarea
                value={chatInput}
                onChange={(e) => {
                  setChatInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && chatInput.trim() && !isStreaming) {
                    e.preventDefault();
                    sendMessage(chatInput);
                    (e.target as HTMLTextAreaElement).style.height = "auto";
                  }
                }}
                placeholder={language === "de" ? "Stelle eine Frage..." : "Ask anything..."}
                className="w-full outline-none bg-transparent mb-2 resize-none overflow-hidden text-[15px] text-foreground placeholder:text-muted-foreground"
                style={{ minHeight: "24px", maxHeight: "200px" }}
                rows={1}
                autoFocus
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-xs text-muted-foreground">§BEEG</span>
                </div>
                <button
                  onClick={() => sendMessage(chatInput)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: chatInput.trim() && !isStreaming ? "hsl(var(--primary))" : "hsl(var(--muted))",
                    opacity: isStreaming ? 0.5 : 1,
                    cursor: isStreaming ? "not-allowed" : "pointer",
                  }}
                  disabled={isStreaming || !chatInput.trim()}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke={chatInput.trim() && !isStreaming ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))"}
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="text-center mt-3 text-xs text-muted-foreground opacity-60">
              {language === "de"
                ? "Elterngeld AI kann Fehler machen. Bitte überprüfe die Antworten."
                : "Elterngeld AI can make mistakes. Please double-check responses."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElterngeldChat;
