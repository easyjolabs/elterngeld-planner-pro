import { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalculatorState, ElterngeldCalculation } from '@/types/elterngeld';
import { cn } from '@/lib/utils';
interface Message {
  role: 'user' | 'assistant';
  content: string;
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pendingDeltaRef = useRef('');
  const streamDoneRef = useRef(false);
  const flushIntervalRef = useRef<number | null>(null);
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);
  useEffect(() => {
    return () => {
      if (flushIntervalRef.current !== null) {
        window.clearInterval(flushIntervalRef.current);
        flushIntervalRef.current = null;
      }
    };
  }, []);
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;
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
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              pendingDeltaRef.current += content;
              ensureFlusher();
            }
          } catch {
            // Incomplete JSON, put back and wait
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
    sendMessage(input);
  };
  return <div className="flex flex-col h-full w-full bg-card rounded-2xl border border-border overflow-hidden">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {messages.length === 0 ? <div className="space-y-4">
            <p className="text-xs font-medium text-primary font-sans py-0">
              Hi! I'm here to help you understand Elterngeld. Ask me anything about parental allowance in Germany.
            </p>
            <div className="space-y-2">
              <p className="text-xs font-medium text-success">Suggested questions:</p>
              {SUGGESTED_QUESTIONS.map((question, index) => <button key={index} onClick={() => sendMessage(question)} className="block w-full text-left px-3 py-2 border transition-colors rounded-full border-white text-xs text-primary font-sans font-semibold bg-neutral-200 hover:bg-neutral-100">
                  {question}
                </button>)}
            </div>
          </div> : <div className="space-y-4">
            {messages.map((message, index) => <div key={index} className={cn("flex", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn("max-w-[85%] text-sm", message.role === 'user' ? 'bg-secondary/50 text-foreground rounded-full px-4 py-2' : 'bg-transparent text-foreground')}>
                  {message.content || <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse delay-100" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse delay-200" />
                    </span>}
                </div>
              </div>)}
          </div>}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about Elterngeld..." disabled={isLoading} className="flex-1" />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>;
}