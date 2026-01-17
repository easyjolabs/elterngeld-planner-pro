import React, { useState, useEffect, useRef, useCallback } from "react";
import { useChatScroll } from "@/hooks/useChatScroll";

// ===========================================
// SCROLL TEST GUIDE - LP DESIGN SYSTEM
// ===========================================
const colors = {
  background: "#FAFAF9",
  tile: "#F0EEE6",
  tileHover: "#E8E6DE",
  white: "#FFFFFF",
  text: "#666666",
  textDark: "#000000",
  userBubble: "#FFFFEB",
  border: "#E7E5E4",
  borderLight: "#F5F5F4",
  orange: "#FF8752",
  tan: "#D1B081",
  yellow: "#FFE44C",
  basis: "#C0630B",
  plus: "#FC631B",
  bonus: "#FFE44C",
  buttonDark: "#000000",
  error: "#E07B3C",
  success: "#1AB689",
};

const fonts = {
  headline: "'Space Grotesk', -apple-system, sans-serif",
  body: "'Inter', -apple-system, sans-serif",
};

const ui = {
  cardRadius: 20,
  buttonRadius: 10,
  inputRadius: 10,
  buttonHeight: 48,
  cardShadow: "0 2px 8px rgba(0,0,0,0.04)",
};

const fontSize = {
  question: "19px",
  body: "16px",
  subtext: "15px",
  button: "15px",
  small: "13px",
  tiny: "12px",
};

// ===========================================
// TYPES
// ===========================================
interface Message {
  id: string;
  type: "bot" | "user";
  content: string;
  subtext?: string;
}

interface ButtonOption {
  value: string;
  label: string;
  note?: string;
  icon?: string;
}

interface Question {
  id: string;
  content: string;
  subtext?: string;
  options: ButtonOption[];
}

// ===========================================
// QUESTIONS
// ===========================================
const questions: Question[] = [
  {
    id: "citizenship",
    content: "Are you a **citizen of the EU, EEA, or Switzerland**?",
    subtext: "This includes all EU member states, Norway, Iceland, Liechtenstein, and Switzerland.",
    options: [
      { value: "eu", label: "Yes, EU/EEA/Swiss citizen", icon: "check" },
      { value: "non_eu", label: "No, other nationality", icon: "x" },
    ],
  },
  {
    id: "incomeLimit",
    content: "Did your household earn **more than €175,000** taxable income last year?",
    subtext: "This is your \"zu versteuerndes Einkommen\". You'll find it on your / your partner's tax return.",
    options: [
      { value: "under", label: "No, under €175,000", icon: "check" },
      { value: "over", label: "Yes, over €175,000", icon: "x" },
    ],
  },
  {
    id: "multiples",
    content: "Are you having **twins or triplets**?",
    subtext: "Multiple births qualify for an extra bonus on top of your regular Elterngeld.",
    options: [
      { value: "no", label: "No, single child", icon: "baby" },
      { value: "twins", label: "Twins", note: "+€300/month" },
      { value: "triplets", label: "Triplets", note: "+€600/month" },
    ],
  },
  {
    id: "siblings",
    content: "Do you have **other young children** at home?",
    subtext: "Children under 3, or two under 6, qualify for the **Geschwisterbonus**: +10% (at least €75/month).",
    options: [
      { value: "yes", label: "Yes", note: "+10%" },
      { value: "none", label: "No", icon: "x" },
    ],
  },
  {
    id: "applicationType",
    content: "Are you applying as a **couple** or as a **single parent**?",
    subtext: "You count as a single parent if the other parent neither lives with you nor with the child.",
    options: [
      { value: "couple", label: "Applying as a couple", icon: "couple" },
      { value: "single", label: "Applying as a single parent", note: "All 14 months" },
    ],
  },
];

// ===========================================
// HELPER: Render markdown bold
// ===========================================
const renderContent = (content: string) => {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

// ===========================================
// MAIN COMPONENT
// ===========================================
const ElterngeldGuideNew: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showInput, setShowInput] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const lastUserMessageRef = useRef<HTMLDivElement>(null);

  const {
    scrollContainerRef,
    messagesContainerRef,
    bottomSpacerRef,
    spacerHeight,
    isScrolling,
    expandSpacerForMessage,
    scrollMessageToTop,
    stabilizeScrollPosition,
    releaseScrollLock,
  } = useChatScroll();

  // Add initial bot message
  useEffect(() => {
    const timer = setTimeout(() => {
      const firstQuestion = questions[0];
      setMessages([
        {
          id: `bot-${firstQuestion.id}`,
          type: "bot",
          content: firstQuestion.content,
          subtext: firstQuestion.subtext,
        },
      ]);
      setShowInput(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Handle user answer
  const handleAnswer = useCallback(
    async (option: ButtonOption) => {
      if (isScrolling) return;

      const currentQuestion = questions[currentQuestionIndex];

      // 1. User message hinzufügen
      const userMessage: Message = {
        id: `user-${currentQuestion.id}`,
        type: "user",
        content: option.label,
      };
      setMessages((prev) => [...prev, userMessage]);
      setShowInput(false);

      // 2. Warten auf Render
      await new Promise((r) => setTimeout(r, 50));

      // 3. Spacer expandieren & nach oben scrollen
      if (lastUserMessageRef.current) {
        expandSpacerForMessage(lastUserMessageRef.current);
        await new Promise((r) => setTimeout(r, 50));
        await scrollMessageToTop(lastUserMessageRef.current);
      }

      // 4. Check ob fertig
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex >= questions.length) {
        setIsComplete(true);
        setIsTyping(true);
        await new Promise((r) => setTimeout(r, 800));
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          { id: "bot-complete", type: "bot", content: "All done! The scroll behavior test is complete." },
        ]);
        return;
      }

      // 5. Typing indicator
      setIsTyping(true);
      await new Promise((r) => setTimeout(r, 800));
      setIsTyping(false);

      // 6. Bot message hinzufügen - ABER: Scroll-Position VORHER merken
      const scrollContainer = scrollContainerRef.current;
      const scrollBefore = scrollContainer?.scrollTop || 0;

      const nextQuestion = questions[nextIndex];
      setMessages((prev) => [
        ...prev,
        { id: `bot-${nextQuestion.id}`, type: "bot", content: nextQuestion.content, subtext: nextQuestion.subtext },
      ]);

      setCurrentQuestionIndex(nextIndex);

      // 7. Scroll-Position SOFORT wiederherstellen (nächster Frame)
      requestAnimationFrame(() => {
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollBefore;
        }
        // Spacer anpassen
        stabilizeScrollPosition();
      });

      setShowInput(true);
    },
    [currentQuestionIndex, isScrolling, expandSpacerForMessage, scrollMessageToTop, stabilizeScrollPosition, scrollContainerRef]
  );

  // Handle restart
  const handleRestart = () => {
    releaseScrollLock();
    setMessages([]);
    setCurrentQuestionIndex(0);
    setShowInput(false);
    setIsTyping(false);
    setIsComplete(false);

    setTimeout(() => {
      const firstQuestion = questions[0];
      setMessages([
        {
          id: `bot-${firstQuestion.id}`,
          type: "bot",
          content: firstQuestion.content,
          subtext: firstQuestion.subtext,
        },
      ]);
      setShowInput(true);
    }, 500);
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: colors.background,
        fontFamily: fonts.body,
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: colors.white,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "18px",
            fontFamily: fonts.headline,
            fontWeight: 600,
            color: colors.textDark,
          }}
        >
          Scroll Test (New Guide)
        </h1>
        <button
          onClick={handleRestart}
          style={{
            padding: "8px 16px",
            backgroundColor: colors.tile,
            border: "none",
            borderRadius: ui.buttonRadius,
            cursor: "pointer",
            fontSize: fontSize.small,
            color: colors.textDark,
          }}
        >
          Restart
        </button>
      </header>

      {/* Messages container */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
        }}
      >
        <div ref={messagesContainerRef}>
          {messages.map((msg, index) => {
            const isLastUserMessage =
              msg.type === "user" &&
              index === messages.findIndex((m, i) => m.type === "user" && i === messages.map((x) => x.type).lastIndexOf("user"));

            return (
              <div
                key={msg.id}
                ref={isLastUserMessage ? lastUserMessageRef : undefined}
                style={{
                  marginBottom: "16px",
                  display: "flex",
                  justifyContent: msg.type === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: msg.type === "user" ? "80%" : "100%",
                    padding: msg.type === "user" ? "12px 16px" : "16px 0",
                    backgroundColor: msg.type === "user" ? colors.userBubble : "transparent",
                    borderRadius: msg.type === "user" ? ui.cardRadius : 0,
                    color: colors.textDark,
                  }}
                >
                  <div
                    style={{
                      fontSize: msg.type === "bot" ? fontSize.question : fontSize.body,
                      fontFamily: msg.type === "bot" ? fonts.headline : fonts.body,
                      lineHeight: 1.5,
                    }}
                  >
                    {renderContent(msg.content)}
                  </div>
                  {msg.subtext && (
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: fontSize.subtext,
                        color: colors.text,
                        lineHeight: 1.5,
                      }}
                    >
                      {renderContent(msg.subtext)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isTyping && (
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "inline-flex",
                  gap: "4px",
                  padding: "12px 16px",
                  backgroundColor: colors.tile,
                  borderRadius: ui.cardRadius,
                }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: colors.text,
                      animation: "pulse 1.4s infinite",
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic spacer */}
        <div
          ref={bottomSpacerRef}
          style={{
            height: spacerHeight,
            transition: "height 0.3s ease-out",
          }}
        />
      </div>

      {/* Input section - fixed at bottom */}
      {showInput && currentQuestion && !isComplete && (
        <div
          style={{
            flexShrink: 0,
            padding: "16px 20px",
            backgroundColor: colors.background,
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {currentQuestion.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(option)}
                disabled={isScrolling}
                style={{
                  padding: "14px 20px",
                  backgroundColor: colors.tile,
                  border: "none",
                  borderRadius: ui.buttonRadius,
                  cursor: isScrolling ? "not-allowed" : "pointer",
                  fontSize: fontSize.button,
                  fontFamily: fonts.body,
                  color: colors.textDark,
                  textAlign: "left",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  opacity: isScrolling ? 0.6 : 1,
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) => {
                  if (!isScrolling) {
                    e.currentTarget.style.backgroundColor = colors.tileHover;
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = colors.tile;
                }}
              >
                <span>{option.label}</span>
                {option.note && (
                  <span
                    style={{
                      fontSize: fontSize.small,
                      color: colors.success,
                      fontWeight: 500,
                    }}
                  >
                    {option.note}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Debug info */}
      <div
        style={{
          flexShrink: 0,
          padding: "8px 16px",
          backgroundColor: colors.tile,
          borderTop: `1px solid ${colors.border}`,
          fontSize: fontSize.tiny,
          color: colors.text,
          display: "flex",
          gap: "20px",
        }}
      >
        <span>Spacer: {spacerHeight}px</span>
        <span>Scrolling: {isScrolling ? "yes" : "no"}</span>
        <span>Question: {currentQuestionIndex + 1}/{questions.length}</span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ElterngeldGuideNew;
