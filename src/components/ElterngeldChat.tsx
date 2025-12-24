import { useState, useRef, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { ArrowUp, ArrowDown, RotateCcw, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalculatorState, ElterngeldCalculation } from '@/types/elterngeld';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { toast } from '@/hooks/use-toast';
import { ThinkingAnimation } from './ThinkingAnimation';
interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
}
interface ElterngeldChatProps {
  calculation: ElterngeldCalculation;
  calculatorState: CalculatorState;
}
const SUGGESTED_QUESTIONS = ["How much parental allowance will I receive?", "Can I get Elterngeld?", "Which model should I choose?"];
export function ElterngeldChat({
  calculation,
  calculatorState
}: ElterngeldChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingDeltaRef = useRef('');
  const streamDoneRef = useRef(false);
  const flushIntervalRef = useRef<number | null>(null);
  const lastUserMessageRef = useRef<string>('');
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);
  const handleScroll = useCallback(() => {
    if (scrollAreaRef.current) {
      const {
        scrollTop,
        scrollHeight,
        clientHeight
      } = scrollAreaRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  }, []);
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  useEffect(() => {
    const scrollEl = scrollAreaRef.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', handleScroll);
      return () => scrollEl.removeEventListener('scroll', handleScroll);
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
    setMessages([]);
    lastUserMessageRef.current = '';
  };
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;
    lastUserMessageRef.current = messageText;
    setSuggestions([]); // Clear suggestions when sending new message
    const userMessage: Message = {
      role: 'user',
      content: messageText
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    let assistantContent = '';
    pendingDeltaRef.current = '';
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
            updated[updated.length - 1] = {
              role: 'assistant',
              content: assistantContent
            };
            return updated;
          });
        });
      }, 25);
    };
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elterngeld-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
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
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (response.status === 402) {
          throw new Error('Service temporarily unavailable.');
        }
        throw new Error('Failed to get response');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');
      const decoder = new TextDecoder();
      let buffer = '';

      // Add empty assistant message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: ''
      }]);
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
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);

            // Handle suggestions event
            if (parsed.type === 'suggestions' && Array.isArray(parsed.suggestions)) {
              setSuggestions(parsed.suggestions);
              continue;
            }
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              pendingDeltaRef.current += content;
              ensureFlusher();
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
      streamDoneRef.current = true;
      ensureFlusher();
      await drainPromise;
    } catch (error) {
      pendingDeltaRef.current = '';
      streamDoneRef.current = true;
      if (flushIntervalRef.current !== null) {
        window.clearInterval(flushIntervalRef.current);
        flushIntervalRef.current = null;
      }
      console.error('Chat error:', error);
      setMessages(prev => [...prev.filter(m => m.content !== ''), {
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.'
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
  return <div className="flex flex-col h-full w-full bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header with restart button */}
      <div className="flex justify-end p-2 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={resetChat} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Restart chat">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="relative flex-1 overflow-hidden">
        <ScrollArea className="h-full px-4 py-3" ref={scrollAreaRef}>
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
              {messages.map((message, index) => <div key={index} className={cn("flex flex-col", message.role === 'user' ? 'items-end' : 'items-start')}>
                  <div className={cn("max-w-[85%] text-sm", message.role === 'user' ? 'bg-secondary/50 text-foreground rounded-full px-4 py-2' : 'bg-transparent text-foreground')}>
                    {message.content ? message.role === 'assistant' ? <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-foreground leading-relaxed my-px">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div> : <span className="leading-relaxed">{message.content}</span> : <ThinkingAnimation />}
                  </div>


                  {/* Action buttons for assistant messages */}
                  {message.role === 'assistant' && message.content && !isLoading && <div className="flex items-center gap-0.5 mt-1.5 ml-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => copyToClipboard(message.content)} title="Copy">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {index === messages.length - 1 && <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={regenerateResponse} title="Regenerate">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>}
                    </div>}

                  {/* Follow-up suggestions - shown after last assistant message */}
                  {!isLoading && index === messages.length - 1 && message.role === 'assistant' && message.content && suggestions.length > 0 && <div className="flex flex-wrap gap-2 mt-3">
                      {suggestions.map((suggestion, i) => <button key={i} onClick={() => sendMessage(suggestion)} className="text-sm text-muted-foreground hover:text-foreground bg-secondary/30 hover:bg-secondary/50 rounded-full px-3 py-1.5 transition-colors">
                          {suggestion}
                        </button>)}
                    </div>}
                </div>)}
            </div>}
        </ScrollArea>

        {/* Scroll to bottom button */}
        {showScrollButton && <Button variant="secondary" size="icon" onClick={scrollToBottom} className="absolute bottom-2 right-4 h-8 w-8 rounded-full shadow-md z-10">
            <ArrowDown className="h-4 w-4" />
          </Button>}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3">
        <div className="flex items-end gap-2 bg-muted/30 rounded-2xl px-4 py-2 border border-border">
          <div className="relative flex-1 flex items-center min-h-[32px]">
            {!input && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[1px] h-4 bg-foreground/70 animate-blink pointer-events-none" />}
            <textarea ref={inputRef} value={input} onChange={e => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }} onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (input.trim() && !isLoading) {
                handleSubmit(e as unknown as React.FormEvent);
              }
            }
          }} placeholder="Ask anything about Elterngeld" disabled={isLoading} rows={1} className="flex-1 w-full border-0 bg-transparent focus:outline-none focus:ring-0 px-0 text-sm resize-none min-h-[24px] max-h-[120px] py-0.5 caret-primary" />
          </div>
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="rounded-full h-8 w-8 bg-foreground hover:bg-foreground/90 shrink-0">
            <ArrowUp className="h-4 w-4 text-background" />
          </Button>
        </div>
      </form>
    </div>;
}