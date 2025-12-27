import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import { ArrowUp, RotateCcw, Copy, RefreshCw, Bug, UserCheck, Calculator, Scale, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalculatorState, ElterngeldCalculation } from "@/types/elterngeld";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";
import { ThinkingAnimation } from "./ThinkingAnimation";
import ScrollToBottomButton from "./ScrollToBottomButton";
import { getPredefinedAnswer } from "@/data/predefinedAnswers";
import { detectLanguage } from "@/lib/detectLanguage";
import MiniCalculator from "./MiniCalculator";

// Normalize unicode bullets and ensure proper markdown list formatting
function normalizeMarkdown(text: string): string {
  let normalized = text.replace(/\r\n/g, "\n");

  // Replace unicode bullets with markdown list items
  normalized = normalized.replace(/\n\s*[•●○◦▪▸►]\s*/g, "\n- ");
  // Also handle bullets at the start of content
  normalized = normalized.replace(/^\s*[•●○◦▪▸►]\s*/g, "- ");

  const isUnorderedListItem = (line: string) => /^\s*-\s+/.test(line);
  const isOrderedListItem = (line: string) => /^\s*\d+\.\s+/.test(line);
  const isListItem = (line: string) => isUnorderedListItem(line) || isOrderedListItem(line);

  // Ensure blank line before lists, but never between list items (prevents “loose lists”)
  const lines = normalized.split("\n");
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevOut = out[out.length - 1] ?? "";
    const next = lines[i + 1];

    // Drop blank lines between list items (tight list spacing)
    if (line.trim() === "" && isListItem(prevOut) && next && isListItem(next)) {
      continue;
    }

    out.push(line);

    if (!next) continue;

    const needsBlankLineBeforeList = line.trim() !== "" && !isListItem(line) && isListItem(next);
    if (needsBlankLineBeforeList) out.push("");
  }

  return out.join("\n");
}
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
}
let messageIdCounter = 0;
const generateMessageId = () => `msg-${++messageIdCounter}-${Date.now()}`;
interface ElterngeldChatProps {
  calculation: ElterngeldCalculation;
  calculatorState: CalculatorState;
}

// Debug overlay state type
interface DebugMetrics {
  viewportTag: string;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  maxScrollTop: number;
  userOffsetTop: number | null;
  userOffsetHeight: number | null;
  assistantOffsetTop: number | null;
  assistantOffsetHeight: number | null;
  bottomSpacerPx: number;
  requiredSpacer: number | null;
  isClamped: boolean;
  scrollLock: boolean;
  isAutoFollow: boolean;
  pendingAnchor: string | null;
  // Width debug metrics
  viewportClientWidth: number;
  viewportScrollWidth: number;
  miniRootWidth: { client: number; scroll: number } | null;
  step2ContainerWidth: { client: number; scroll: number } | null;
  step2RowWidth: { client: number; scroll: number } | null;
  monthWrapperWidth: { client: number; scroll: number } | null;
  monthStripWidth: { client: number; scroll: number } | null;
  overflowingElements: { tag: string; class: string; overflow: number }[];
}
const SUGGESTED_QUESTIONS = ["Am I eligible?", "How much will I get?", "Which model is best for me?", "Can I work part-time?", "How do I apply?"];
export function ElterngeldChat({
  calculation,
  calculatorState
}: ElterngeldChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showCalculator, setShowCalculator] = useState(false);

  // Debug mode toggle
  const [debugMode, setDebugMode] = useState(false);
  const [debugMetrics, setDebugMetrics] = useState<DebugMetrics | null>(null);

  // Bottom spacer to guarantee enough scroll room to anchor the latest user message at the top.
  const [bottomSpacerPx, setBottomSpacerPx] = useState(0);
  const [spacerAnimated, setSpacerAnimated] = useState(true);
  const [pendingAnchor, setPendingAnchor] = useState<{
    userId: string;
    assistantId: string;
  } | null>(null);
  const spacerObserverRef = useRef<ResizeObserver | null>(null);
  const spacerZeroStreakRef = useRef(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingDeltaRef = useRef("");
  const streamDoneRef = useRef(false);
  const flushIntervalRef = useRef<number | null>(null);
  const lastUserMessageRef = useRef<string>("");
  const lastSentUserMessageIdRef = useRef<string | null>(null);
  const lastAssistantMessageIdRef = useRef<string | null>(null);
  const scrollLockRef = useRef(false);

  // Auto-follow state: true = keep latest visible during streaming, false = user scrolled up
  const isAutoFollowRef = useRef(true);
  const ignoreScrollEventsRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  // Flag to protect spacer during anchoring phase
  const isAnchoringRef = useRef(false);

  // Debug: collect metrics
  const collectDebugMetrics = useCallback(() => {
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
    const userId = lastSentUserMessageIdRef.current;
    const assistantId = lastAssistantMessageIdRef.current;
    const userEl = userId ? scrollAreaRef.current?.querySelector<HTMLElement>(`[data-message-id="${userId}"]`) : null;
    const assistantEl = assistantId ? scrollAreaRef.current?.querySelector<HTMLElement>(`[data-message-id="${assistantId}"]`) : null;
    if (!viewport) {
      setDebugMetrics(null);
      return;
    }
    const scrollTop = viewport.scrollTop;
    const scrollHeight = viewport.scrollHeight;
    const clientHeight = viewport.clientHeight;
    const maxScrollTop = Math.max(0, scrollHeight - clientHeight);
    const TOP_OFFSET = 16;
    let requiredSpacer: number | null = null;
    if (userEl && assistantEl) {
      const desiredScrollTop = Math.max(0, userEl.offsetTop - TOP_OFFSET);
      const desiredBottom = desiredScrollTop + clientHeight;
      const assistantEnd = assistantEl.offsetTop + assistantEl.offsetHeight;
      requiredSpacer = Math.max(0, Math.ceil(desiredBottom - assistantEnd));
    }
    const targetTop = userEl ? Math.max(0, userEl.offsetTop - TOP_OFFSET) : 0;
    const isClamped = targetTop > maxScrollTop;

    // Width debug: query mini-calculator elements
    const getWidths = (selector: string): { client: number; scroll: number } | null => {
      const el = scrollAreaRef.current?.querySelector<HTMLElement>(selector);
      return el ? { client: el.clientWidth, scroll: el.scrollWidth } : null;
    };
    const miniRootWidth = getWidths('[data-debug="mini-root"]');
    const step2ContainerWidth = getWidths('[data-debug="step2-container"]');
    const step2RowWidth = getWidths('[data-debug="step2-row"]');
    const monthWrapperWidth = getWidths('[data-debug="month-wrapper"]');
    const monthStripWidth = getWidths('[data-debug="month-strip"]');

    // Find overflowing elements in the chat area
    const overflowingElements: { tag: string; class: string; overflow: number }[] = [];
    const checkOverflow = (el: HTMLElement) => {
      if (el.scrollWidth > el.clientWidth + 1) {
        overflowingElements.push({
          tag: el.tagName.toLowerCase(),
          class: el.className.split(' ').slice(0, 2).join('.') || '(no-class)',
          overflow: el.scrollWidth - el.clientWidth
        });
      }
    };
    // Check viewport descendants (limit to first 100 for performance)
    const descendants = viewport.querySelectorAll<HTMLElement>('*');
    for (let i = 0; i < Math.min(descendants.length, 100); i++) {
      checkOverflow(descendants[i]);
    }
    checkOverflow(viewport);

    setDebugMetrics({
      viewportTag: `${viewport.tagName}.${viewport.className.split(' ')[0] || ''}`,
      scrollTop: Math.round(scrollTop),
      scrollHeight: Math.round(scrollHeight),
      clientHeight: Math.round(clientHeight),
      maxScrollTop: Math.round(maxScrollTop),
      userOffsetTop: userEl ? Math.round(userEl.offsetTop) : null,
      userOffsetHeight: userEl ? Math.round(userEl.offsetHeight) : null,
      assistantOffsetTop: assistantEl ? Math.round(assistantEl.offsetTop) : null,
      assistantOffsetHeight: assistantEl ? Math.round(assistantEl.offsetHeight) : null,
      bottomSpacerPx: Math.round(bottomSpacerPx),
      requiredSpacer: requiredSpacer !== null ? Math.round(requiredSpacer) : null,
      isClamped,
      scrollLock: scrollLockRef.current,
      isAutoFollow: isAutoFollowRef.current,
      pendingAnchor: pendingAnchor ? `${pendingAnchor.userId.slice(-6)}/${pendingAnchor.assistantId.slice(-6)}` : null,
      viewportClientWidth: viewport.clientWidth,
      viewportScrollWidth: viewport.scrollWidth,
      miniRootWidth,
      step2ContainerWidth,
      step2RowWidth,
      monthWrapperWidth,
      monthStripWidth,
      overflowingElements: overflowingElements.slice(0, 5) // Top 5 offenders
    });
  }, [bottomSpacerPx, pendingAnchor]);

  // Update debug metrics on scroll and periodically during loading
  useEffect(() => {
    if (!debugMode) return;
    collectDebugMetrics();
    const interval = setInterval(collectDebugMetrics, 100);
    return () => clearInterval(interval);
  }, [debugMode, collectDebugMetrics, messages, bottomSpacerPx, isLoading]);
  const scrollToUserMessage = useCallback((messageId: string, instant = false, retryCount = 0) => {
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
    const messageEl = scrollAreaRef.current?.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);

    // Retry mechanism if elements aren't ready yet
    if ((!viewport || !messageEl) && retryCount < 6) {
      requestAnimationFrame(() => scrollToUserMessage(messageId, instant, retryCount + 1));
      return;
    }
    if (!viewport || !messageEl) {
      if (import.meta.env.DEV) {
        console.debug("[ElterngeldChat] scrollToUserMessage: element not found", {
          messageId
        });
      }
      return;
    }

    // Deterministic: offsetTop is already in scroll coordinates.
    const TOP_OFFSET = 16;
    const targetTop = Math.max(0, messageEl.offsetTop - TOP_OFFSET);
    const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    const finalTop = Math.min(targetTop, maxScrollTop);
    ignoreScrollEventsRef.current = true;
    viewport.scrollTo({
      top: finalTop,
      behavior: instant ? "auto" : "smooth"
    });
    requestAnimationFrame(() => {
      ignoreScrollEventsRef.current = false;
      lastScrollTopRef.current = viewport.scrollTop;
    });
  }, []);
  const scrollToBottom = useCallback((instant = false) => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      ignoreScrollEventsRef.current = true;
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: instant ? "auto" : "smooth"
      });
      requestAnimationFrame(() => {
        ignoreScrollEventsRef.current = false;
        lastScrollTopRef.current = viewport.scrollTop;
      });
    }
  }, []);
  const stopBottomSpacerObserver = useCallback(() => {
    spacerObserverRef.current?.disconnect();
    spacerObserverRef.current = null;
    spacerZeroStreakRef.current = 0;
  }, []);
  const computeRequiredSpacer = useCallback((viewport: HTMLElement, userEl: HTMLElement, assistantEl: HTMLElement) => {
    const TOP_OFFSET = 16;
    const desiredScrollTop = Math.max(0, userEl.offsetTop - TOP_OFFSET);
    const desiredBottom = desiredScrollTop + viewport.clientHeight;
    const assistantEnd = assistantEl.offsetTop + assistantEl.offsetHeight;
    return Math.max(0, Math.ceil(desiredBottom - assistantEnd));
  }, []);
  const recomputeSpacerForTurn = useCallback((userId: string, assistantId: string) => {
    if (!isAutoFollowRef.current) return; // freeze while user is reading older messages

    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
    const userEl = scrollAreaRef.current?.querySelector<HTMLElement>(`[data-message-id="${userId}"]`);
    const assistantEl = scrollAreaRef.current?.querySelector<HTMLElement>(`[data-message-id="${assistantId}"]`);
    if (!viewport || !userEl || !assistantEl) return;
    const required = computeRequiredSpacer(viewport, userEl, assistantEl);
    setBottomSpacerPx(prev => Math.abs(prev - required) < 1 ? prev : required);
    if (required <= 0) {
      spacerZeroStreakRef.current += 1;
      if (spacerZeroStreakRef.current >= 2) {
        setBottomSpacerPx(0);
        stopBottomSpacerObserver();
      }
    } else {
      spacerZeroStreakRef.current = 0;
    }
  }, [computeRequiredSpacer, stopBottomSpacerObserver]);
  useLayoutEffect(() => {
    if (!pendingAnchor) return;
    const {
      userId,
      assistantId
    } = pendingAnchor;
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
    const userEl = scrollAreaRef.current?.querySelector<HTMLElement>(`[data-message-id="${userId}"]`);
    const assistantEl = scrollAreaRef.current?.querySelector<HTMLElement>(`[data-message-id="${assistantId}"]`);
    const spacerEl = scrollAreaRef.current?.querySelector<HTMLElement>('[data-spacer]');
    if (!viewport || !userEl || !assistantEl) return;

    // Mark anchoring phase - protects spacer from being reset
    isAnchoringRef.current = true;
    stopBottomSpacerObserver();

    // Compute required spacer
    const required = computeRequiredSpacer(viewport, userEl, assistantEl);

    // CRITICAL: Set spacer via direct DOM manipulation BEFORE scroll calculation
    // This guarantees the DOM has the spacer height before we compute maxScrollTop
    if (spacerEl) {
      spacerEl.style.transition = 'none';
      spacerEl.style.height = `${required}px`;
    }

    // Force layout recalculation
    void viewport.scrollHeight;

    // Now anchor deterministically using offsetTop
    const TOP_OFFSET = 16;
    const targetTop = Math.max(0, userEl.offsetTop - TOP_OFFSET);
    const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    ignoreScrollEventsRef.current = true;
    viewport.scrollTop = Math.min(targetTop, maxScrollTop);

    // Sync React state with DOM (after scroll is done)
    flushSync(() => {
      setSpacerAnimated(false);
      setBottomSpacerPx(required);
    });
    requestAnimationFrame(() => {
      ignoreScrollEventsRef.current = false;
      lastScrollTopRef.current = viewport.scrollTop;
      setSpacerAnimated(true);
      // Clear anchoring flag after scroll is complete
      isAnchoringRef.current = false;
    });

    // Shrink spacer as assistant grows.
    const ro = new ResizeObserver(() => {
      recomputeSpacerForTurn(userId, assistantId);
    });
    ro.observe(assistantEl);
    spacerObserverRef.current = ro;
    scrollLockRef.current = false;
    setPendingAnchor(null);
  }, [pendingAnchor, computeRequiredSpacer, recomputeSpacerForTurn, stopBottomSpacerObserver]);
  useEffect(() => {
    // Guard: don't reset spacer during anchoring phase
    if (isAnchoringRef.current) return;
    if (!isLoading) {
      stopBottomSpacerObserver();
      setBottomSpacerPx(0);
    }
  }, [isLoading, stopBottomSpacerObserver]);
  useEffect(() => {
    return () => {
      stopBottomSpacerObserver();
    };
  }, [stopBottomSpacerObserver]);

  // Keep latest assistant message visible during streaming (incremental scroll)
  const keepLatestVisible = useCallback(() => {
    // Don't override the initial scroll-to-user-message
    if (scrollLockRef.current) return;
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
    const assistantId = lastAssistantMessageIdRef.current;
    if (!viewport || !assistantId) return;
    const messageEl = scrollAreaRef.current?.querySelector<HTMLElement>(`[data-message-id="${assistantId}"]`);
    if (!messageEl) return;
    const viewportRect = viewport.getBoundingClientRect();
    const messageRect = messageEl.getBoundingClientRect();
    const messageBottom = messageRect.bottom;
    const viewportBottom = viewportRect.bottom;

    // If the message bottom is below viewport, scroll down just enough
    if (messageBottom > viewportBottom) {
      const overflow = messageBottom - viewportBottom + 20; // 20px padding
      ignoreScrollEventsRef.current = true;
      viewport.scrollTop += overflow;
      requestAnimationFrame(() => {
        ignoreScrollEventsRef.current = false;
        lastScrollTopRef.current = viewport.scrollTop;
      });
    }
  }, []);
  const handleScroll = useCallback(() => {
    // Ignore programmatic scrolls
    if (ignoreScrollEventsRef.current) return;
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
    if (!viewport) return;
    const currentScrollTop = viewport.scrollTop;
    const distanceFromBottom = viewport.scrollHeight - currentScrollTop - viewport.clientHeight;
    const isScrollingUp = currentScrollTop < lastScrollTopRef.current;

    // User scrolled up significantly → pause auto-follow
    if (isScrollingUp && distanceFromBottom > 100) {
      isAutoFollowRef.current = false;
    }

    // User scrolled back to bottom → resume auto-follow
    if (distanceFromBottom < 50) {
      isAutoFollowRef.current = true;
    }
    lastScrollTopRef.current = currentScrollTop;
    setShowScrollButton(!isAutoFollowRef.current);
  }, []);
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.addEventListener("scroll", handleScroll);
      return () => viewport.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);
  useEffect(() => {
    return () => {
      if (flushIntervalRef.current !== null) {
        window.clearInterval(flushIntervalRef.current);
        flushIntervalRef.current = null;
      }
    };
  }, []);
  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        description: "Copied to clipboard"
      });
    } catch {
      toast({
        description: "Failed to copy",
        variant: "destructive"
      });
    }
  };
  const regenerateResponse = () => {
    if (lastUserMessageRef.current && !isLoading) {
      setMessages(prev => prev.slice(0, -1));
      sendMessage(lastUserMessageRef.current);
    }
  };
  const resetChat = () => {
    stopBottomSpacerObserver();
    setBottomSpacerPx(0);
    setPendingAnchor(null);
    lastUserMessageRef.current = "";
    setMessages([]);
  };
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;
    lastUserMessageRef.current = messageText;
    setSuggestions([]); // Clear suggestions when sending new message
    isAutoFollowRef.current = true; // Re-enable auto-follow when sending new message
    setShowScrollButton(false);

    // Detect language from the user's message
    const detectedLanguage = detectLanguage(messageText);
    
    // Check for pre-defined answer first (saves AI tokens!)
    const predefined = getPredefinedAnswer(messageText, detectedLanguage);
    if (predefined) {
      const userMessageId = generateMessageId();
      const assistantMessageId = generateMessageId();
      const userMessage: Message = {
        id: userMessageId,
        role: "user",
        content: messageText
      };
      lastSentUserMessageIdRef.current = userMessageId;
      lastAssistantMessageIdRef.current = assistantMessageId;

      // Lock auto-follow until we anchored the user message
      scrollLockRef.current = true;

      // Add user + empty assistant placeholder (like AI streaming)
      flushSync(() => {
        setMessages(prev => [...prev, userMessage, {
          id: assistantMessageId,
          role: "assistant",
          content: ""
        }]);
      });
      setIsLoading(true);
      setPendingAnchor({
        userId: userMessageId,
        assistantId: assistantMessageId
      });
      setInput("");

      // Set up the streaming simulation
      let assistantContent = "";
      pendingDeltaRef.current = predefined.answer;
      streamDoneRef.current = false;
      const predefinedSuggestions = predefined.suggestions;

      // Clear any existing interval
      if (flushIntervalRef.current !== null) {
        window.clearInterval(flushIntervalRef.current);
        flushIntervalRef.current = null;
      }

      // Helper to dequeue word by word
      const dequeueNextUnit = (text: string): [string, string] => {
        const ws = text.match(/^\s+/);
        if (ws) return [ws[0], text.slice(ws[0].length)];
        const word = text.match(/^[^\s]+/);
        if (word) return [word[0], text.slice(word[0].length)];
        return [text[0], text.slice(1)];
      };

      // Start the streaming interval
      flushIntervalRef.current = window.setInterval(() => {
        const pending = pendingDeltaRef.current;
        if (!pending) {
          // Done streaming
          window.clearInterval(flushIntervalRef.current!);
          flushIntervalRef.current = null;
          setIsLoading(false);
          setSuggestions(predefinedSuggestions);
          return;
        }
        const [next, rest] = dequeueNextUnit(pending);
        pendingDeltaRef.current = rest;
        assistantContent += next;
        flushSync(() => {
          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            updated[updated.length - 1] = {
              ...lastMsg,
              content: assistantContent
            };
            return updated;
          });
        });

        // Auto-scroll during streaming
        if (isAutoFollowRef.current) {
          keepLatestVisible();
        }
      }, 25);
      return; // Skip AI call entirely - 0 tokens used!
    }
    const userMessageId = generateMessageId();
    const assistantMessageId = generateMessageId();
    lastAssistantMessageIdRef.current = assistantMessageId;
    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      content: messageText
    };
    lastSentUserMessageIdRef.current = userMessageId;

    // Lock auto-follow until we anchored the user message (done in useLayoutEffect).
    scrollLockRef.current = true;

    // Add user + assistant placeholder in one commit so the anchor effect can measure both.
    flushSync(() => {
      setMessages(prev => [...prev, userMessage, {
        id: assistantMessageId,
        role: "assistant",
        content: ""
      }]);
    });

    // Set loading BEFORE pendingAnchor so the guard is active when layout effect runs
    setIsLoading(true);
    setPendingAnchor({
      userId: userMessageId,
      assistantId: assistantMessageId
    });
    setInput("");
    let assistantContent = "";
    pendingDeltaRef.current = "";
    streamDoneRef.current = false;
    if (flushIntervalRef.current !== null) {
      window.clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }
    let resolveDrain: (() => void) | null = null;
    const drainPromise = new Promise<void>(resolve => {
      resolveDrain = resolve;
    });
    const dequeueNextUnit = (text: string): [string, string] => {
      const ws = text.match(/^\s+/);
      if (ws) return [ws[0], text.slice(ws[0].length)];
      const word = text.match(/^[^\s]+/);
      if (word) return [word[0], text.slice(word[0].length)];
      return [text[0], text.slice(1)];
    };
    const ensureFlusher = () => {
      if (flushIntervalRef.current !== null) return;
      flushIntervalRef.current = window.setInterval(() => {
        const pending = pendingDeltaRef.current;
        if (!pending) {
          if (streamDoneRef.current) {
            window.clearInterval(flushIntervalRef.current!);
            flushIntervalRef.current = null;
            resolveDrain?.();
          }
          return;
        }
        const [next, rest] = dequeueNextUnit(pending);
        pendingDeltaRef.current = rest;
        assistantContent += next;
        flushSync(() => {
          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            updated[updated.length - 1] = {
              ...lastMsg,
              content: assistantContent
            };
            return updated;
          });
        });
        // Auto-scroll during streaming if auto-follow is enabled
        if (isAutoFollowRef.current) {
          keepLatestVisible();
        }
      }, 25);
    };
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elterngeld-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          context: {
            monthlyIncome: calculatorState.monthlyIncome,
            hasSiblingBonus: calculatorState.hasSiblingBonus,
            multipleChildren: calculatorState.multipleChildren,
            isEligible: calculation.isEligible,
            basisAmount: calculation.basisAmount,
            plusAmount: calculation.plusAmount,
            totalBasis: calculation.totalBasis,
            totalPlus: calculation.totalPlus
          }
        })
      });
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        if (response.status === 402) {
          throw new Error("Service temporarily unavailable.");
        }
        throw new Error("Failed to get response");
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const {
          done,
          value
        } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {
          stream: true
        });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);

            // Handle suggestions event
            if (parsed.type === "suggestions" && Array.isArray(parsed.suggestions)) {
              setSuggestions(parsed.suggestions);
              continue;
            }
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              pendingDeltaRef.current += content;
              ensureFlusher();
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
      streamDoneRef.current = true;
      ensureFlusher();
      await drainPromise;
    } catch (error) {
      pendingDeltaRef.current = "";
      streamDoneRef.current = true;
      if (flushIntervalRef.current !== null) {
        window.clearInterval(flushIntervalRef.current);
        flushIntervalRef.current = null;
      }
      console.error("Chat error:", error);
      setMessages(prev => [...prev.filter(m => m.content !== ""), {
        id: generateMessageId(),
        role: "assistant",
        content: error instanceof Error ? error.message : "Sorry, I encountered an error. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inputRef.current?.blur();
    sendMessage(input);
  };
  return <div className="flex flex-col h-full w-full min-h-0 min-w-0 bg-card rounded-2xl border border-border overflow-hidden relative">
      {/* Debug overlay */}
      {debugMode && debugMetrics && <div className="absolute top-12 left-2 right-2 z-50 bg-black/90 text-white text-xs font-mono p-3 rounded-lg max-h-[50%] overflow-auto">
          <div className="font-bold text-yellow-400 mb-2">🐛 Scroll Debug</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div>viewport: <span className="text-green-400">{debugMetrics.viewportTag}</span></div>
            <div>scrollLock: <span className={debugMetrics.scrollLock ? "text-red-400" : "text-green-400"}>{String(debugMetrics.scrollLock)}</span></div>
            
            <div>scrollTop: <span className="text-cyan-400">{debugMetrics.scrollTop}</span></div>
            <div>scrollHeight: <span className="text-cyan-400">{debugMetrics.scrollHeight}</span></div>
            <div>clientHeight: <span className="text-cyan-400">{debugMetrics.clientHeight}</span></div>
            <div>maxScrollTop: <span className="text-cyan-400">{debugMetrics.maxScrollTop}</span></div>
            
            <div className="col-span-2 border-t border-white/20 mt-1 pt-1">User Message:</div>
            <div>offsetTop: <span className="text-purple-400">{debugMetrics.userOffsetTop ?? 'N/A'}</span></div>
            <div>offsetHeight: <span className="text-purple-400">{debugMetrics.userOffsetHeight ?? 'N/A'}</span></div>
            
            <div className="col-span-2 border-t border-white/20 mt-1 pt-1">Assistant Message:</div>
            <div>offsetTop: <span className="text-orange-400">{debugMetrics.assistantOffsetTop ?? 'N/A'}</span></div>
            <div>offsetHeight: <span className="text-orange-400">{debugMetrics.assistantOffsetHeight ?? 'N/A'}</span></div>
            
            <div className="col-span-2 border-t border-white/20 mt-1 pt-1">Spacer:</div>
            <div>current: <span className="text-yellow-400">{debugMetrics.bottomSpacerPx}px</span></div>
            <div>required: <span className="text-yellow-400">{debugMetrics.requiredSpacer ?? 'N/A'}px</span></div>
            
            <div className="col-span-2 border-t border-white/20 mt-1 pt-1">State:</div>
            <div>isClamped: <span className={debugMetrics.isClamped ? "text-red-400 font-bold" : "text-green-400"}>{String(debugMetrics.isClamped)}</span></div>
            <div>autoFollow: <span className={debugMetrics.isAutoFollow ? "text-green-400" : "text-yellow-400"}>{String(debugMetrics.isAutoFollow)}</span></div>
            <div className="col-span-2">pendingAnchor: <span className="text-blue-400">{debugMetrics.pendingAnchor ?? 'none'}</span></div>

            <div className="col-span-2 border-t border-white/20 mt-1 pt-1 font-bold text-pink-400">📏 WIDTH DEBUG</div>
            <div>viewport: <span className={debugMetrics.viewportScrollWidth > debugMetrics.viewportClientWidth ? "text-red-400 font-bold" : "text-green-400"}>{debugMetrics.viewportClientWidth} / {debugMetrics.viewportScrollWidth}</span></div>
            <div className="text-gray-400">(client / scroll)</div>
            
            {debugMetrics.miniRootWidth && <>
              <div>mini-root: <span className={debugMetrics.miniRootWidth.scroll > debugMetrics.miniRootWidth.client ? "text-red-400 font-bold" : "text-green-400"}>{debugMetrics.miniRootWidth.client} / {debugMetrics.miniRootWidth.scroll}</span></div>
              <div className="text-gray-400">overflow: {debugMetrics.miniRootWidth.scroll - debugMetrics.miniRootWidth.client}px</div>
            </>}
            {debugMetrics.step2ContainerWidth && <>
              <div>step2-container: <span className={debugMetrics.step2ContainerWidth.scroll > debugMetrics.step2ContainerWidth.client ? "text-red-400 font-bold" : "text-green-400"}>{debugMetrics.step2ContainerWidth.client} / {debugMetrics.step2ContainerWidth.scroll}</span></div>
              <div className="text-gray-400">overflow: {debugMetrics.step2ContainerWidth.scroll - debugMetrics.step2ContainerWidth.client}px</div>
            </>}
            {debugMetrics.step2RowWidth && <>
              <div>step2-row: <span className={debugMetrics.step2RowWidth.scroll > debugMetrics.step2RowWidth.client ? "text-red-400 font-bold" : "text-green-400"}>{debugMetrics.step2RowWidth.client} / {debugMetrics.step2RowWidth.scroll}</span></div>
              <div className="text-gray-400">overflow: {debugMetrics.step2RowWidth.scroll - debugMetrics.step2RowWidth.client}px</div>
            </>}
            {debugMetrics.monthWrapperWidth && <>
              <div>month-wrapper: <span className={debugMetrics.monthWrapperWidth.scroll > debugMetrics.monthWrapperWidth.client ? "text-red-400 font-bold" : "text-green-400"}>{debugMetrics.monthWrapperWidth.client} / {debugMetrics.monthWrapperWidth.scroll}</span></div>
              <div className="text-gray-400">overflow: {debugMetrics.monthWrapperWidth.scroll - debugMetrics.monthWrapperWidth.client}px</div>
            </>}
            {debugMetrics.monthStripWidth && <>
              <div>month-strip: <span className="text-cyan-400">{debugMetrics.monthStripWidth.client} / {debugMetrics.monthStripWidth.scroll}</span></div>
              <div className="text-gray-400">(should overflow!)</div>
            </>}

            {debugMetrics.overflowingElements.length > 0 && <>
              <div className="col-span-2 border-t border-white/20 mt-1 pt-1 font-bold text-red-400">⚠️ OVERFLOW OFFENDERS</div>
              {debugMetrics.overflowingElements.map((el, i) => (
                <div key={i} className="col-span-2 text-red-300">
                  {el.tag}.{el.class} → +{el.overflow}px
                </div>
              ))}
            </>}
          </div>
        </div>}

      {/* Header with restart and debug buttons */}
      <div className="flex justify-between items-center p-2 border-b border-[#ededed]">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowCalculator(prev => !prev)}
          className={cn(
            "h-8 w-8",
            showCalculator
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground"
          )}
          title="Toggle calculator"
        >
          <Calculator className="h-4 w-4" />
        </Button>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setDebugMode(d => !d)} className={cn("h-8 w-8", debugMode ? "text-yellow-500 bg-yellow-500/10" : "text-muted-foreground hover:text-foreground")} title="Toggle debug mode">
            <Bug className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={resetChat} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Restart chat">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="relative flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
        <ScrollArea className="flex-1 min-h-0 min-w-0 px-4 py-3" ref={scrollAreaRef}>
          <div className="flex flex-col w-full min-w-0 max-w-full overflow-hidden">
            {/* Mini Calculator */}
            {showCalculator && (
              <div className="mb-4 w-full min-w-0 max-w-full overflow-hidden">
                <MiniCalculator onClose={() => setShowCalculator(false)} />
              </div>
            )}
            {messages.length === 0 && !showCalculator ? <div className="flex flex-col h-full min-h-[400px]">
                {/* Spacer to push content to bottom */}
                <div className="flex-1" />
                
                {/* Bottom aligned content */}
                <div className="space-y-4 pb-4">
                  <p className="font-semibold text-foreground text-xl font-sans">
                    Ask anything about Elterngeld   
                  </p>
                  <div className="space-y-1">
                    {SUGGESTED_QUESTIONS.map((question, index) => {
                  const icons = [UserCheck, Calculator, Scale, Clock, FileText];
                  const Icon = icons[index];
                  return <button key={index} onClick={() => sendMessage(question)} className="group flex items-center w-full text-left rounded-lg px-3 py-3 transition-colors text-sm leading-relaxed text-foreground hover:bg-[#F3F3F3]">
                          <Icon className="h-5 w-5 mr-3 text-muted-foreground flex-shrink-0" />
                          <span className="flex-1">{question}</span>
                          <ArrowUp className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity rotate-45" />
                        </button>;
                })}
                  </div>
                </div>
              </div> : <div className="space-y-4">
                {messages.map((message, index) => <div key={message.id} data-message-id={message.id} className={cn("flex flex-col", message.role === "user" ? "items-end" : "items-start",
            // Debug mode: highlight user/assistant elements
            debugMode && message.id === lastSentUserMessageIdRef.current && "ring-2 ring-purple-500 ring-offset-1", debugMode && message.id === lastAssistantMessageIdRef.current && "ring-2 ring-orange-500 ring-offset-1")}>
                    <div className={cn("max-w-[85%] text-sm", message.role === "user" ? "bg-[#F3F3F3] text-foreground rounded-full px-4 py-2" : "bg-transparent text-foreground")}>
                      {message.content ? message.role === "assistant" ? <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-ul:list-disc prose-ul:pl-5 prose-ul:my-2 prose-ol:list-decimal prose-ol:pl-5 prose-ol:my-2 prose-li:my-0 prose-li:leading-relaxed [&_li>p]:my-0 prose-strong:font-semibold prose-strong:text-foreground prose-em:italic prose-headings:font-semibold prose-headings:text-foreground prose-a:text-primary prose-a:underline leading-relaxed text-foreground font-sans text-sm">
                            <ReactMarkdown>{normalizeMarkdown(message.content)}</ReactMarkdown>
                          </div> : <span className="leading-relaxed">{message.content}</span> : <ThinkingAnimation />}
                    </div>

                    {/* Action buttons for assistant messages */}
                    {message.role === "assistant" && message.content && !isLoading && <div className="flex items-center gap-0.5 mt-1.5 ml-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => copyToClipboard(message.content)} title="Copy">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        {index === messages.length - 1 && <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={regenerateResponse} title="Regenerate">
                            <RefreshCw className="h-2.5 w-2.5" />
                          </Button>}
                      </div>}

                    {/* Follow-up suggestions - shown after last assistant message */}
                    {!isLoading && index === messages.length - 1 && message.role === "assistant" && message.content && suggestions.length > 0 && <div className="flex flex-wrap gap-2 mt-3">
                          {suggestions.map((suggestion, i) => <button key={i} onClick={() => sendMessage(suggestion)} className="text-sm rounded-full px-3 py-1.5 transition-colors text-primary bg-[#F3F3F3]">
                              {suggestion}
                            </button>)}
                        </div>}
                  </div>)}
              </div>}
            
            {/* Dynamic spacer to allow user message to scroll to top */}
            <div data-spacer style={{
            height: bottomSpacerPx,
            transition: spacerAnimated ? "height 0.3s ease-out" : "none"
          }} className={debugMode ? "bg-yellow-500/30 border border-dashed border-yellow-500" : ""} />
          </div>
        </ScrollArea>

        {/* Scroll to bottom button */}
        <ScrollToBottomButton visible={showScrollButton} onClick={() => {
        isAutoFollowRef.current = true;
        setShowScrollButton(false);
        stopBottomSpacerObserver();
        setBottomSpacerPx(0);
        setSpacerAnimated(true);
        scrollToBottom(true);
      }} className="absolute bottom-2 left-1/2 -translate-x-1/2" />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3">
        <div className="flex items-end gap-2 rounded-2xl px-4 py-2 border border-border bg-white transition-shadow duration-200 focus-within:shadow-md">
          <div className="relative flex-1 flex items-center min-h-[32px]">
            <textarea ref={inputRef} value={input} onChange={e => {
            setInput(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }} onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (input.trim() && !isLoading) {
                handleSubmit(e as unknown as React.FormEvent);
              }
            }
          }} placeholder="Ask anything about Elterngeld" disabled={isLoading} rows={1} className="flex-1 w-full border-0 bg-transparent focus:outline-none focus:ring-0 px-0 text-sm resize-none min-h-[24px] max-h-[120px] py-0.5 caret-primary" />
          </div>
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="rounded-full h-8 w-8 bg-black hover:bg-black/90 shrink-0 disabled:bg-black disabled:opacity-100">
            <ArrowUp className="h-4 w-4 text-white" />
          </Button>
        </div>
      </form>
    </div>;
}