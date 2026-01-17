// ===========================================
// ELTERNGELD GUIDE - NEU MIT SCROLL-LOGIK
// ===========================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useChatScroll } from "@/hooks/useChatScroll";

// Design Tokens
const colors = {
  background: "#FAFAF9",
  tile: "#F0EEE6",
  white: "#FFFFFF",
  text: "#666666",
  textDark: "#000000",
  userBubble: "#FFFFEB",
  border: "#E7E5E4",
  orange: "#FF8752",
};

const fonts = {
  headline: "'Space Grotesk', -apple-system, sans-serif",
  body: "'Inter', -apple-system, sans-serif",
};

const ui = { buttonRadius: 10, buttonHeight: 48 };
const fontSize = { question: "19px", body: "16px", subtext: "15px", button: "15px", tiny: "12px" };
const tagColors = ["#FF8752", "#FFE44C", "#D1B081"];

// Types
interface Message {
  id: string;
  type: "bot" | "user";
  content: string;
  subtext?: string;
  isQuestion?: boolean;
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

// Icons
const icons: Record<string, React.ReactNode> = {
  check: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path d="M5 13l4 4L19 7" />
    </svg>
  ),
  x: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path d="M6 6l12 12M6 18L18 6" />
    </svg>
  ),
  baby: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="5" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  ),
  twins: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <circle cx="8" cy="8" r="4" />
      <circle cx="16" cy="8" r="4" />
      <path d="M2 20c0-3 2.5-5 6-5s6 2 6 5M10 20c0-3 2.5-5 6-5s6 2 6 5" />
    </svg>
  ),
  triplets: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <circle cx="12" cy="5" r="3" />
      <circle cx="6" cy="11" r="3" />
      <circle cx="18" cy="11" r="3" />
      <path d="M12 8v4M6 14v4M18 14v4" />
    </svg>
  ),
  couple: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <circle cx="9" cy="7" r="4" />
      <circle cx="17" cy="9" r="3" />
      <path d="M3 21v-2c0-2.5 3-5 6-5 1.5 0 3 .5 4 1.5M17 21v-2c0-1.5 1-3 3-3" />
    </svg>
  ),
  single: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <circle cx="12" cy="7" r="4" />
      <path d="M5 21v-2a7 7 0 0114 0v2" />
    </svg>
  ),
  eu: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
      <path d="M16 11l2 2 4-4" />
    </svg>
  ),
  globe: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
};

const formatText = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold" style={{ color: colors.textDark }}>
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
};

// Questions
const questions: Question[] = [
  {
    id: "incomeLimit",
    content: "Did your household earn **more than €175,000** taxable income last year?",
    subtext: 'This is your "zu versteuerndes Einkommen".',
    options: [
      { value: "under", label: "No, under €175,000", icon: "check" },
      { value: "over", label: "Yes, over €175,000", icon: "x" },
    ],
  },
  {
    id: "multiples",
    content: "Are you having **twins or triplets**?",
    subtext: "Multiple births qualify for an extra bonus.",
    options: [
      { value: "no", label: "No, single child", icon: "baby" },
      { value: "twins", label: "Twins", icon: "twins", note: "+€300/month" },
      { value: "triplets", label: "Triplets", icon: "triplets", note: "+€600/month" },
    ],
  },
  {
    id: "siblings",
    content: "Do you have **other young children** at home?",
    subtext: "Children under 3, or two under 6, qualify for +10%.",
    options: [
      { value: "yes", label: "Yes", icon: "check", note: "+10%" },
      { value: "none", label: "No", icon: "x" },
    ],
  },
  {
    id: "applicationType",
    content: "Are you applying as a **couple** or as a **single parent**?",
    subtext: "You count as a single parent if the other parent neither lives with you nor with the child.",
    options: [
      { value: "couple", label: "Applying as a couple", icon: "couple" },
      { value: "single", label: "Applying as a single parent", icon: "single", note: "All 14 months" },
    ],
  },
];

// Components
const ButtonOptions: React.FC<{
  options: ButtonOption[];
  onSelect: (opt: ButtonOption) => void;
  disabled?: boolean;
}> = ({ options, onSelect, disabled }) => {
  let noteIdx = 0;
  return (
    <div className="space-y-2">
      {options.map((opt, i) => {
        const ni = opt.note ? noteIdx++ : -1;
        return (
          <button
            key={i}
            onClick={() => onSelect(opt)}
            disabled={disabled}
            className="w-full transition-all flex items-center hover:border-stone-400 justify-between text-left"
            style={{
              backgroundColor: colors.white,
              border: `1.5px solid ${colors.border}`,
              borderRadius: ui.buttonRadius,
              height: ui.buttonHeight,
              padding: "10px 16px",
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            <div className="flex items-center gap-3">
              {opt.icon && <span style={{ color: colors.textDark }}>{icons[opt.icon]}</span>}
              <span style={{ fontSize: fontSize.button, fontWeight: 500, color: colors.textDark }}>{opt.label}</span>
            </div>
            {opt.note && (
              <span
                className="px-2.5 py-1 rounded-full"
                style={{ fontSize: fontSize.tiny, fontWeight: 500, backgroundColor: tagColors[ni % 3], color: "#000" }}
              >
                {opt.note}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

const StartScreen: React.FC<{ onAnswer: (v: string, l: string) => void }> = ({ onAnswer }) => (
  <div style={{ padding: "60px 0 20px 0" }}>
    <h1
      style={{
        fontFamily: fonts.headline,
        fontSize: "32px",
        fontWeight: 700,
        color: "#000",
        lineHeight: 1.2,
        letterSpacing: "-0.02em",
        marginBottom: "12px",
      }}
    >
      Alright, let's do this.
    </h1>
    <p style={{ fontSize: "17px", color: "#666", lineHeight: 1.5, marginBottom: "20px" }}>
      A few quick questions and you'll know exactly what Elterngeld you can get.
    </p>
    <div style={{ marginBottom: "56px" }}>
      <div
        style={{ height: "6px", background: "#E7E5E4", borderRadius: "3px", overflow: "hidden", marginBottom: "10px" }}
      >
        <div style={{ height: "100%", width: "8%", background: "#000", borderRadius: "3px" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "13px", color: "#666" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          5 minutes
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Free
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M5 13l4 4L19 7" />
          </svg>
          No signup
        </span>
      </div>
    </div>
    <p
      style={{
        fontFamily: fonts.headline,
        fontSize: "20px",
        fontWeight: 600,
        color: "#000",
        lineHeight: 1.3,
        marginBottom: "8px",
        paddingLeft: "16px",
        borderLeft: "3px solid #FF8752",
      }}
    >
      Are you a German or EU/EEA/Swiss citizen?
    </p>
    <p style={{ fontSize: "15px", color: "#666", lineHeight: 1.5, marginBottom: "20px", paddingLeft: "16px" }}>
      Your eligibility depends on your citizenship and residence permit.
    </p>
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <button
        onClick={() => onAnswer("eu", "Yes, German or EU/EEA/Swiss")}
        className="w-full transition-all hover:border-stone-400"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px 20px",
          background: colors.white,
          border: `1.5px solid ${colors.border}`,
          borderRadius: ui.buttonRadius,
          fontFamily: fonts.body,
          fontSize: fontSize.button,
          fontWeight: 500,
          color: "#000",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {icons.eu}Yes, German or EU/EEA/Swiss
      </button>
      <button
        onClick={() => onAnswer("other", "No, other nationality")}
        className="w-full transition-all hover:border-stone-400"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px 20px",
          background: colors.white,
          border: `1.5px solid ${colors.border}`,
          borderRadius: ui.buttonRadius,
          fontFamily: fonts.body,
          fontSize: fontSize.button,
          fontWeight: 500,
          color: "#000",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {icons.globe}No, other nationality
      </button>
    </div>
  </div>
);

const BotMessage: React.FC<{ content: string; subtext?: string; isQuestion?: boolean }> = ({
  content,
  subtext,
  isQuestion,
}) => (
  <div className={`${isQuestion ? "py-1.5 mt-4" : "py-1"}`}>
    <p
      className={isQuestion ? "leading-relaxed font-semibold pl-3" : "leading-relaxed"}
      style={{
        color: colors.textDark,
        borderLeft: isQuestion ? `3px solid ${colors.orange}` : "none",
        fontFamily: isQuestion ? fonts.headline : fonts.body,
        fontSize: isQuestion ? fontSize.question : fontSize.body,
      }}
    >
      {formatText(content)}
    </p>
    {subtext && (
      <p className={`mt-2 ${isQuestion ? "pl-3" : ""}`} style={{ fontSize: fontSize.subtext, color: colors.text }}>
        {formatText(subtext)}
      </p>
    )}
  </div>
);

const UserMessage = React.forwardRef<HTMLDivElement, { content: string }>(({ content }, ref) => (
  <div ref={ref} className="flex justify-end py-2">
    <div className="rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%]" style={{ backgroundColor: colors.userBubble }}>
      <span style={{ fontSize: fontSize.body, color: colors.textDark }}>{content}</span>
    </div>
  </div>
));

const TypingIndicator: React.FC = () => (
  <div className="py-2">
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ backgroundColor: colors.text, animation: "pulse 1.2s ease-in-out infinite" }}
    />
  </div>
);

// Main Component
const ElterngeldGuideNew: React.FC = () => {
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
    hasContentBelow,
    scrollToBottom,
  } = useChatScroll();

  const [showStartScreen, setShowStartScreen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showInput, setShowInput] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hideScrollbar, setHideScrollbar] = useState(false);
  const [stepHistory, setStepHistory] = useState<number[]>([]);

  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const lastUserMessageIndexRef = useRef(-1);

  const handleStartAnswer = async (value: string, label: string) => {
    console.log("=== START ===");
    setShowStartScreen(false);
    setMessages([{ id: "user-citizenship", type: "user", content: label }]);
    lastUserMessageIndexRef.current = 0;

    await new Promise((r) => setTimeout(r, 100)); // Länger warten

    console.log("lastUserMessageRef.current:", lastUserMessageRef.current);
    console.log("scrollContainerRef.current:", scrollContainerRef.current);
    console.log("messagesContainerRef.current:", messagesContainerRef.current);
    console.log("bottomSpacerRef.current:", bottomSpacerRef.current);

    if (lastUserMessageRef.current) {
      console.log("Ref exists, expanding spacer...");
      expandSpacerForMessage(lastUserMessageRef.current);
      await new Promise((r) => setTimeout(r, 50));
      setHideScrollbar(true);
      console.log("Scrolling to top...");
      await scrollMessageToTop(lastUserMessageRef.current);
      console.log("Scroll complete");
    } else {
      console.log("ERROR: Ref is null!");
    }
    setIsTyping(true);
    await new Promise((r) => setTimeout(r, 600));
    setIsTyping(false);
    setMessages((prev) => [
      ...prev,
      {
        id: "bot-response-1",
        type: "bot",
        content: value === "eu" ? "Great! Let's check one more thing." : "Let's check your visa type.",
      },
    ]);
    await new Promise((r) => setTimeout(r, 50));
    if (lastUserMessageRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: lastUserMessageRef.current.offsetTop - 16, behavior: "smooth" });
      await new Promise((r) => setTimeout(r, 300));
      stabilizeScrollPosition();
    }
    setIsTyping(true);
    await new Promise((r) => setTimeout(r, 600));
    setIsTyping(false);
    const q = questions[0];
    setMessages((prev) => [
      ...prev,
      { id: `bot-${q.id}`, type: "bot", content: q.content, subtext: q.subtext, isQuestion: true },
    ]);
    await new Promise((r) => setTimeout(r, 50));
    stabilizeScrollPosition();
    setHideScrollbar(false);
    setShowInput(true);
  };

  const handleAnswer = useCallback(
    async (option: ButtonOption) => {
      if (isScrolling) return;
      const q = questions[currentQuestionIndex];
      setStepHistory((prev) => [...prev, currentQuestionIndex]);
      setMessages((prev) => {
        lastUserMessageIndexRef.current = prev.length;
        return [...prev, { id: `user-${q.id}`, type: "user", content: option.label }];
      });
      setShowInput(false);
      await new Promise((r) => setTimeout(r, 50));
      if (lastUserMessageRef.current) {
        expandSpacerForMessage(lastUserMessageRef.current);
        await new Promise((r) => setTimeout(r, 50));
        setHideScrollbar(true);
        await scrollMessageToTop(lastUserMessageRef.current);
      }
      const nextIdx = currentQuestionIndex + 1;
      if (nextIdx >= questions.length) {
        setIsComplete(true);
        setIsTyping(true);
        await new Promise((r) => setTimeout(r, 600));
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          { id: "bot-complete", type: "bot", content: "Based on your answers, you **likely qualify** for Elterngeld!" },
        ]);
        await new Promise((r) => setTimeout(r, 50));
        if (lastUserMessageRef.current && scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ top: lastUserMessageRef.current.offsetTop - 16, behavior: "smooth" });
          await new Promise((r) => setTimeout(r, 300));
          stabilizeScrollPosition();
        }
        setHideScrollbar(false);
        return;
      }
      setIsTyping(true);
      await new Promise((r) => setTimeout(r, 600));
      setIsTyping(false);
      const nq = questions[nextIdx];
      setMessages((prev) => [
        ...prev,
        { id: `bot-${nq.id}`, type: "bot", content: nq.content, subtext: nq.subtext, isQuestion: true },
      ]);
      setCurrentQuestionIndex(nextIdx);
      await new Promise((r) => setTimeout(r, 50));
      if (lastUserMessageRef.current && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: lastUserMessageRef.current.offsetTop - 16, behavior: "smooth" });
        await new Promise((r) => setTimeout(r, 300));
        stabilizeScrollPosition();
      }
      setHideScrollbar(false);
      setShowInput(true);
    },
    [
      currentQuestionIndex,
      isScrolling,
      expandSpacerForMessage,
      scrollMessageToTop,
      stabilizeScrollPosition,
      scrollContainerRef,
    ],
  );

  const handleGoBack = useCallback(() => {
    if (stepHistory.length === 0) {
      setShowStartScreen(true);
      setMessages([]);
      setCurrentQuestionIndex(0);
      setShowInput(false);
      releaseScrollLock();
      return;
    }
    setStepHistory((prev) => prev.slice(0, -1));
    setMessages((prev) => prev.slice(0, -2));
    setCurrentQuestionIndex(stepHistory[stepHistory.length - 1]);
    setShowInput(true);
    setIsComplete(false);
    releaseScrollLock();
  }, [stepHistory, releaseScrollLock]);

  const handleRestart = useCallback(() => {
    setShowStartScreen(true);
    setMessages([]);
    setCurrentQuestionIndex(0);
    setShowInput(false);
    setIsTyping(false);
    setIsComplete(false);
    setStepHistory([]);
    releaseScrollLock();
  }, [releaseScrollLock]);

  const currentQuestion = questions[currentQuestionIndex];
  const canGoBack = stepHistory.length > 0 || !showStartScreen;

  return (
    <>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1); } } .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; } .hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      <div
        className="flex flex-col overflow-hidden"
        style={{ backgroundColor: colors.background, fontFamily: fonts.body, height: "calc(100vh - 72px)" }}
      >
        <div className="flex-1 min-h-0 overflow-hidden">
          <div
            ref={scrollContainerRef}
            className={`h-full overflow-y-auto px-5 pt-6 ${hideScrollbar ? "hide-scrollbar" : ""}`}
            style={{ overflowAnchor: "none" }}
          >
            <div className="max-w-2xl mx-auto">
              {showStartScreen ? (
                <StartScreen onAnswer={handleStartAnswer} />
              ) : (
                <div ref={messagesContainerRef}>
                  {messages.map((msg, i) =>
                    msg.type === "user" ? (
                      <UserMessage
                        key={msg.id}
                        ref={i === lastUserMessageIndexRef.current ? lastUserMessageRef : null}
                        content={msg.content}
                      />
                    ) : (
                      <BotMessage
                        key={msg.id}
                        content={msg.content}
                        subtext={msg.subtext}
                        isQuestion={msg.isQuestion}
                      />
                    ),
                  )}
                  {isTyping && <TypingIndicator />}
                  <div style={{ height: 1 }} />
                  <div ref={bottomSpacerRef} style={{ height: spacerHeight, transition: "height 0.3s ease" }} />
                </div>
              )}
            </div>
          </div>
        </div>
        {!showStartScreen && (
          <div
            className="flex-shrink-0 px-5 pb-1 pt-3 relative z-10"
            style={{ backgroundColor: colors.background, borderTop: `1px solid ${colors.border}` }}
          >
            <div className="max-w-2xl mx-auto">
              {showInput && currentQuestion && !isComplete && (
                <ButtonOptions options={currentQuestion.options} onSelect={handleAnswer} disabled={isScrolling} />
              )}
            </div>
            <div className="max-w-2xl mx-auto">
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px" }}
              >
                <button
                  onClick={handleGoBack}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                    background: "none",
                    border: "none",
                    borderRadius: 8,
                    cursor: canGoBack ? "pointer" : "default",
                    opacity: canGoBack ? 1 : 0.3,
                    color: colors.text,
                  }}
                  disabled={!canGoBack}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span style={{ fontSize: fontSize.tiny, color: colors.text, opacity: 0.6 }}>
                  Quick estimate only – not legal or tax advice.
                </span>
                <button
                  onClick={handleRestart}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                    background: "none",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    color: colors.text,
                  }}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
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
        )}
      </div>
    </>
  );
};

export default ElterngeldGuideNew;
