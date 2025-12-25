import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import { ArrowUp, RotateCcw, Copy, RefreshCw, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalculatorState, ElterngeldCalculation } from "@/types/elterngeld";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";
import { ThinkingAnimation } from "./ThinkingAnimation";
import ScrollToBottomButton from "./ScrollToBottomButton";

// Normalize unicode bullets and ensure proper markdown list formatting
function normalizeMarkdown(text: string): string {
  // Replace unicode bullets with markdown list items
  let normalized = text.replace(/\n\s*[•●○◦▪▸►]\s*/g, '\n- ');
  // Also handle bullets at the start of content
  normalized = normalized.replace(/^\s*[•●○◦▪▸►]\s*/, '- ');
  // Ensure blank line before lists (colon followed by newline and dash)
  normalized = normalized.replace(/:\n(-\s)/g, ':\n\n$1');
  // Ensure blank line before lists after any text
  normalized = normalized.replace(/([^\n])\n(-\s)/g, '$1\n\n$2');
  return normalized;
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
}

const SUGGESTED_QUESTIONS = ["How much parental allowance will I receive?", "Can I get Elterngeld?", "Which model should I choose?"];
export function ElterngeldChat({
  calculation,
  calculatorState
}: ElterngeldChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Debug mode toggle
  const [debugMode, setDebugMode] = useState(false);
  const [debugMetrics, setDebugMetrics] = useState<DebugMetrics | null>(null);

  // Bottom spacer to guarantee enough scroll room to anchor the latest user message at the top.
  const [bottomSpacerPx, setBottomSpacerPx] = useState(0);
  const [spacerAnimated, setSpacerAnimated] = useState(true);
  const [pendingAnchor, setPendingAnchor] = useState<{ userId: string; assistantId: string } | null>(null);

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
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(
      '[data-radix-scroll-area-viewport]'
    );
    const messageEl = scrollAreaRef.current?.querySelector<HTMLElement>(
      `[data-message-id="${messageId}"]`
    );

    // Retry mechanism if elements aren't ready yet
    if ((!viewport || !messageEl) && retryCount < 6) {
      requestAnimationFrame(() => scrollToUserMessage(messageId, instant, retryCount + 1));
      return;
    }
    if (!viewport || !messageEl) {
      if (import.meta.env.DEV) {
        console.debug("[ElterngeldChat] scrollToUserMessage: element not found", { messageId });
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
    setBottomSpacerPx(prev => (Math.abs(prev - required) < 1 ? prev : required));

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

    const { userId, assistantId } = pendingAnchor;

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
      setMessages(prev => [
        ...prev,
        userMessage,
        {
          id: assistantMessageId,
          role: "assistant",
          content: ""
        }
      ]);
    });

    // Set loading BEFORE pendingAnchor so the guard is active when layout effect runs
    setIsLoading(true);
    setPendingAnchor({ userId: userMessageId, assistantId: assistantMessageId });

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
  return <div className="flex flex-col h-full w-full bg-card rounded-2xl border border-border overflow-hidden relative">
      {/* Debug overlay */}
      {debugMode && debugMetrics && (
        <div className="absolute top-12 left-2 right-2 z-50 bg-black/90 text-white text-xs font-mono p-3 rounded-lg max-h-[50%] overflow-auto">
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
          </div>
        </div>
      )}

      {/* Header with restart and debug buttons */}
      <div className="flex justify-end gap-1 p-2 border-b border-border/50">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setDebugMode(d => !d)} 
          className={cn("h-8 w-8", debugMode ? "text-yellow-500 bg-yellow-500/10" : "text-muted-foreground hover:text-foreground")} 
          title="Toggle debug mode"
        >
          <Bug className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={resetChat} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Restart chat">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="relative flex-1 overflow-hidden">
        <ScrollArea className="h-full px-4 py-3" ref={scrollAreaRef}>
          <div className="flex flex-col">
            {messages.length === 0 ? <div className="space-y-4">
                <p className="font-medium text-foreground leading-relaxed text-base">
                  Hi! Do you have questions about Elterngeld?
                </p>
                <div className="space-y-1">
                  {SUGGESTED_QUESTIONS.map((question, index) => <button key={index} onClick={() => sendMessage(question)} className="block w-full text-left transition-colors text-sm py-1.5 leading-relaxed text-foreground">
                      {question}
                    </button>)}
                </div>
              </div> : <div className="space-y-4">
                {messages.map((message, index) => <div 
                  key={message.id} 
                  data-message-id={message.id} 
                  className={cn(
                    "flex flex-col", 
                    message.role === "user" ? "items-end" : "items-start",
                    // Debug mode: highlight user/assistant elements
                    debugMode && message.id === lastSentUserMessageIdRef.current && "ring-2 ring-purple-500 ring-offset-1",
                    debugMode && message.id === lastAssistantMessageIdRef.current && "ring-2 ring-orange-500 ring-offset-1"
                  )}
                >
                    <div className={cn("max-w-[85%] text-sm", message.role === "user" ? "bg-secondary/50 text-foreground rounded-full px-4 py-2" : "bg-transparent text-foreground")}>
                      {message.content ? message.role === "assistant" ? <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-ul:list-disc prose-ul:pl-5 prose-ul:my-2 prose-ol:list-decimal prose-ol:pl-5 prose-ol:my-2 prose-li:my-0.5 leading-relaxed my-px text-primary font-sans text-sm font-medium">
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
                          {suggestions.map((suggestion, i) => <button key={i} onClick={() => sendMessage(suggestion)} className="text-sm rounded-full px-3 py-1.5 transition-colors text-primary bg-secondary">
                              {suggestion}
                            </button>)}
                        </div>}
                  </div>)}
              </div>}
            
            {/* Dynamic spacer to allow user message to scroll to top */}
            <div 
              data-spacer
              style={{ 
                height: bottomSpacerPx,
                transition: spacerAnimated ? "height 0.3s ease-out" : "none"
              }}
              className={debugMode ? "bg-yellow-500/30 border border-dashed border-yellow-500" : ""}
            />
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
        <div className="flex items-end gap-2 bg-muted/30 rounded-2xl px-4 py-2 border border-border">
          <div className="relative flex-1 flex items-center min-h-[32px]">
            {!input && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[1px] h-4 bg-foreground/70 animate-blink pointer-events-none" />}
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