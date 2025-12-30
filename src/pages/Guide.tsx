// ===========================================
// ELTERNGELD GUIDE - LOVABLE VERSION
// ===========================================
// Copy this entire file into Lovable as a new page or component

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/Sidebar';

// ===========================================
// TYPES
// ===========================================
interface FlowMessage {
  type: 'bot' | 'user' | 'category' | 'component' | 'dynamic' | 'end';
  content?: string;
  subtext?: string;
  input?: 'buttons' | 'date' | 'slider';
  field?: string;
  person?: 'you' | 'partner';
  options?: ButtonOption[];
  component?: 'calculation' | 'planner' | 'summary' | 'cta' | 'continue';
  pause?: boolean;
  key?: string;
}

interface ButtonOption {
  value: string;
  label: string;
  sub?: string;
  note?: string;
  accent?: 'basis' | 'bonus';
}

interface PlannerMonth {
  you: 'none' | 'basis' | 'plus' | 'bonus';
  partner: 'none' | 'basis' | 'plus' | 'bonus';
}

interface UserData {
  residence?: string;
  dueDate?: string;
  multiples?: string;
  siblings?: string;
  applicationType?: string;
  employmentType?: string;
  income?: number;
  partnerEmploymentType?: string;
  partnerIncome?: number;
}

// ===========================================
// DESIGN TOKENS
// ===========================================
const colors = {
  background: '#FAF9F5',
  tile: '#F0EEE6',
  text: '#57534E',
  textDark: '#1C1917',
  userBubble: '#F0EEE6',
  basis: '#FF8752',
  plus: '#D1B081',
  bonus: '#FFE44C',
  progress: '#FF6347',
  border: '#E7E5E4',
};

// ===========================================
// FLOW DEFINITION
// ===========================================
const flow: FlowMessage[] = [
  // INTRO
  { type: 'bot', content: "Hi! Let's figure out your **Elterngeld** together." },
  { type: 'bot', content: "This takes about **5 minutes**. By the end, you'll know:" },
  { type: 'bot', content: "💶 How much Elterngeld you'll receive **each month**\n📅 The **best way to split** months between you and your partner\n📋 Which **documents** you need and **when to apply**" },
  { type: 'bot', content: "You can ask me questions anytime – just tap [[Ask anything]]." },
  { type: 'bot', content: "Let's start by checking if you're eligible." },

  // RESIDENCE
  { type: 'category', content: 'Residence' },
  { type: 'bot', content: "Eligibility depends on your **residence status** in Germany." },
  { 
    type: 'bot', 
    content: "What's your residence status?", 
    input: 'buttons',
    field: 'residence',
    options: [
      { value: 'german', label: 'German citizen' },
      { value: 'eu', label: 'EU/EEA/Swiss citizen' },
      { value: 'noneu_permit', label: 'Non-EU with work permit', sub: 'Blue Card, Niederlassungserlaubnis' },
      { value: 'noneu_other', label: 'Non-EU with other visa' },
    ]
  },
  { type: 'user' },
  { type: 'dynamic', key: 'residenceResponse' },

  // YOUR CHILD
  { type: 'category', content: 'Your Child' },
  { type: 'bot', content: "Now tell me about your child." },
  { 
    type: 'bot', 
    content: "When is your child **born or expected** to be born?", 
    input: 'date',
    field: 'dueDate'
  },
  { type: 'user' },
  { type: 'dynamic', key: 'dateResponse' },
  { 
    type: 'bot', 
    content: "Are you expecting **twins or triplets**?",
    subtext: "Multiple births qualify for an extra bonus on top of your regular Elterngeld.",
    input: 'buttons',
    field: 'multiples',
    options: [
      { value: 'no', label: 'No, single child' },
      { value: 'twins', label: 'Twins', accent: 'basis', note: '+€300/month' },
      { value: 'triplets', label: 'Triplets', accent: 'basis', note: '+€600/month' },
    ]
  },
  { type: 'user' },
  { 
    type: 'bot', 
    content: "Do you have **other young children** living at home?",
    subtext: "If you have siblings under a certain age, you qualify for the **Geschwisterbonus** – an extra 10% (at least €75/month).",
    input: 'buttons',
    field: 'siblings',
    options: [
      { value: 'none', label: 'No other young children' },
      { value: 'one_under_3', label: 'One child under 3 years', accent: 'bonus', note: '+10%' },
      { value: 'two_under_6', label: 'Two children under 6 years', accent: 'bonus', note: '+10%' },
      { value: 'disabled_under_14', label: 'A child with disability under 14', accent: 'bonus', note: '+10%' },
    ]
  },
  { type: 'user' },

  // INCOME
  { type: 'category', content: 'Income' },
  { type: 'bot', content: "Now let's calculate how much Elterngeld you'll receive." },
  { type: 'bot', content: "Elterngeld replaces **65% of your net income**, with a minimum of **€300** and a maximum of **€1,800** per month." },
  { 
    type: 'bot', 
    content: "Are you applying as a **couple** or as a **single parent**?",
    subtext: "As a couple, you share 14 months between you. As a single parent, you can use all 14 months yourself.",
    input: 'buttons',
    field: 'applicationType',
    options: [
      { value: 'couple', label: 'Applying as a couple' },
      { value: 'single', label: 'Applying as a single parent', note: 'All 14 months' },
    ]
  },
  { type: 'user' },
  { 
    type: 'bot', 
    content: "What **type of work** do you do?",
    subtext: "Self-employed income is calculated differently than employment income.",
    input: 'buttons',
    field: 'employmentType',
    options: [
      { value: 'employed', label: 'Employed' },
      { value: 'selfEmployed', label: 'Self-employed' },
      { value: 'both', label: 'Both employed and self-employed' },
      { value: 'none', label: 'Not currently working', note: 'Min €300/month' },
    ]
  },
  { type: 'user' },
  { 
    type: 'bot', 
    content: "What's your approximate **monthly gross income**?",
    subtext: "Your salary before taxes. It doesn't need to be exact.",
    input: 'slider',
    field: 'income',
    person: 'you'
  },
  { type: 'user' },
  { type: 'dynamic', key: 'partnerQuestion' },
  { type: 'user' },
  { type: 'dynamic', key: 'partnerIncome' },
  { type: 'user' },

  // CALCULATION
  { type: 'bot', content: "Here's what you can expect to receive:" },
  { type: 'component', component: 'calculation' },
  { type: 'bot', content: "**The three types explained:**" },
  { type: 'bot', content: "• **Basiselterngeld** – Full amount, up to 14 months total\n• **ElterngeldPlus** – Half amount, twice as long (up to 28 months)\n• **Partnerschaftsbonus** – 4 extra months if both work 24-32h/week" },

  // PLANNING
  { type: 'category', content: 'Planning' },
  { type: 'bot', content: "Now let's plan how you want to **split the months**." },
  { type: 'bot', content: "Click on any cell to change: **empty → Basis → Plus → Bonus**" },
  { type: 'component', component: 'planner', pause: true },

  // SUMMARY
  { type: 'category', content: 'Summary' },
  { type: 'bot', content: "Here's your personalized **Elterngeld summary**:" },
  { type: 'component', component: 'summary' },

  // NEXT STEPS
  { type: 'category', content: 'Next Steps' },
  { type: 'bot', content: "You've completed the **hardest part**: figuring out your optimal Elterngeld strategy!" },
  { type: 'bot', content: "Ready to create your application?" },
  { type: 'component', component: 'cta' },
  { type: 'bot', content: "Questions? Just ask below." },

  // END
  { type: 'end' },
];

// ===========================================
// HELPER FUNCTIONS
// ===========================================
const formatText = (text: string | undefined, onOpenChat?: () => void): React.ReactNode => {
  if (!text) return null;
  return text.split('\n').map((line, lineIndex) => {
    // Handle [[Ask anything]] as clickable link
    const linkParts = line.split(/\[\[(.*?)\]\]/g);
    const withLinks = linkParts.map((part, i) => {
      if (i % 2 === 1) {
        // This is the link text
        return (
          <button
            key={`link-${i}`}
            onClick={onOpenChat}
            className="font-semibold underline hover:opacity-70 transition-opacity"
            style={{ color: '#1C1917' }}
          >
            {part}
          </button>
        );
      }
      // Handle **bold** within non-link parts
      const boldParts = part.split(/\*\*(.*?)\*\*/g);
      return boldParts.map((boldPart, j) => 
        j % 2 === 1 ? <strong key={`${i}-${j}`} className="font-semibold">{boldPart}</strong> : boldPart
      );
    });
    return (
      <span key={lineIndex}>
        {withLinks}
        {lineIndex < text.split('\n').length - 1 && <br />}
      </span>
    );
  });
};

const calculateElterngeld = (grossIncome: number, data: UserData) => {
  if (!grossIncome || grossIncome === 0) {
    return { basis: 300, plus: 150, bonus: 150 };
  }
  const taxRate = grossIncome > 5000 ? 0.58 : grossIncome > 3000 ? 0.62 : grossIncome > 1500 ? 0.67 : 0.75;
  const netto = Math.round(grossIncome * taxRate);
  let basis = Math.round(netto * 0.65);
  basis = Math.max(300, Math.min(1800, basis));
  
  if (data.siblings && data.siblings !== 'none') {
    basis = Math.min(1980, Math.round(basis * 1.1));
  }
  if (data.multiples === 'twins') basis += 300;
  if (data.multiples === 'triplets') basis += 600;
  
  return { basis, plus: Math.round(basis / 2), bonus: Math.round(basis / 2) };
};

// ===========================================
// MAIN COMPONENT
// ===========================================
interface ElterngeldGuideProps {
  onOpenChat?: () => void;
}

const ElterngeldGuide: React.FC<ElterngeldGuideProps> = ({ onOpenChat }) => {
  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState<FlowMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showInput, setShowInput] = useState<FlowMessage | null>(null);
  const [sliderValue, setSliderValue] = useState(4200);
  const [partnerSliderValue, setPartnerSliderValue] = useState(3200);
  const [data, setData] = useState<UserData>({});
  const [plannerMonths, setPlannerMonths] = useState(14);
  const [plannerData, setPlannerData] = useState<PlannerMonth[]>(
    Array.from({ length: 28 }, (_, i) => ({
      you: i < 12 ? 'basis' : 'none',
      partner: i >= 12 && i < 14 ? 'basis' : 'none',
    }))
  );
  const [selectedScenario, setSelectedScenario] = useState('classic');
  const [isPaused, setIsPaused] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [pendingMessage, setPendingMessage] = useState<FlowMessage | null>(null);
  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Scroll anchoring state
  const [anchorMessageIndex, setAnchorMessageIndex] = useState<number | null>(null);
  const [bottomSpacerPx, setBottomSpacerPx] = useState(0);

  // Scroll detection for chat
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // Show button when more than 10px from bottom (user has scrolled up)
      const isNotAtBottom = scrollHeight - scrollTop - clientHeight > 10;
      setShowScrollButton(isNotAtBottom);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      setShowScrollButton(false);
    }
  };

  // Scroll to anchor user message (position at top of viewport)
  const scrollToAnchorMessage = (messageIndex: number) => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    
    const messageEl = viewport.querySelector(`[data-message-index="${messageIndex}"]`) as HTMLElement;
    if (!messageEl) return;
    
    const TOP_OFFSET = 16;
    const targetTop = Math.max(0, messageEl.offsetTop - TOP_OFFSET);
    viewport.scrollTo({ top: targetTop, behavior: 'instant' });
  };

  // Update bottom spacer to keep user message at top during streaming
  const updateBottomSpacer = () => {
    if (anchorMessageIndex === null) {
      setBottomSpacerPx(0);
      return;
    }
    
    const viewport = scrollRef.current;
    if (!viewport) return;
    
    const messageEl = viewport.querySelector(`[data-message-index="${anchorMessageIndex}"]`) as HTMLElement;
    if (!messageEl) return;
    
    const viewportHeight = viewport.clientHeight;
    const messagesContainer = viewport.querySelector('[data-messages-container]') as HTMLElement;
    if (!messagesContainer) return;
    
    const contentHeight = messagesContainer.scrollHeight;
    const neededSpacer = Math.max(0, viewportHeight - (contentHeight - messageEl.offsetTop + 16));
    setBottomSpacerPx(neededSpacer);
  };

  // Stream text word by word
  const startStreaming = (msg: FlowMessage, onComplete: () => void) => {
    if (!msg.content) {
      onComplete();
      return;
    }
    
    setIsStreaming(true);
    setPendingMessage(msg);
    setStreamingContent('');
    
    const words = msg.content.split(/(\s+)/);
    let index = 0;
    
    streamingIntervalRef.current = setInterval(() => {
      if (index < words.length) {
        setStreamingContent(prev => prev + words[index]);
        index++;
        updateBottomSpacer();
        
        // Keep anchor message at top
        if (anchorMessageIndex !== null) {
          scrollToAnchorMessage(anchorMessageIndex);
        }
      } else {
        if (streamingIntervalRef.current) {
          clearInterval(streamingIntervalRef.current);
          streamingIntervalRef.current = null;
        }
        setIsStreaming(false);
        setStreamingContent('');
        setPendingMessage(null);
        setMessages(prev => [...prev, msg]);
        onComplete();
      }
    }, 25);
  };

  // Cleanup streaming interval on unmount
  useEffect(() => {
    return () => {
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
      }
    };
  }, []);

  // Check scroll position when messages change (don't auto-hide button)
  useEffect(() => {
    const timer = setTimeout(() => {
      handleScroll();
    }, 150);
    return () => clearTimeout(timer);
  }, [messages]);

  const myCalc = calculateElterngeld(sliderValue, data);
  const partnerCalc = calculateElterngeld(partnerSliderValue, data);

  // Flow Logic
  useEffect(() => {
    if (isPaused || step >= flow.length || isStreaming) return;
    
    const msg = flow[step];
    
    if (msg.type === 'user') return;
    if (msg.type === 'dynamic') {
      handleDynamic(msg.key || '');
      return;
    }
    
    if (msg.type === 'end') {
      setAnchorMessageIndex(null);
      setBottomSpacerPx(0);
      setShowInput({ type: 'end' } as FlowMessage);
      return;
    }
    
    if (['bot', 'category', 'component'].includes(msg.type)) {
      // For bot messages with content after user input, use streaming
      if (msg.type === 'bot' && msg.content && anchorMessageIndex !== null) {
        setIsTyping(false);
        
        startStreaming(msg, () => {
          // Clear anchor after a few messages if no input expected
          if (msg.input) {
            setShowInput(msg);
          } else if (msg.pause) {
            setShowInput({ type: 'component', component: 'continue' } as FlowMessage);
            setIsPaused(true);
          } else {
            setStep(s => s + 1);
          }
        });
        return;
      }
      
      // Normal flow for non-streaming messages
      setIsTyping(true);
      const delay = msg.content ? 80 + msg.content.length * 1.5 : 80;
      
      const timer = setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, msg]);
        
        if (msg.input) {
          setShowInput(msg);
          // Clear anchor when showing input
          setAnchorMessageIndex(null);
          setBottomSpacerPx(0);
        } else if (msg.pause) {
          setShowInput({ type: 'component', component: 'continue' } as FlowMessage);
          setIsPaused(true);
          setAnchorMessageIndex(null);
          setBottomSpacerPx(0);
        } else {
          setStep(s => s + 1);
        }
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [step, isPaused, isStreaming, anchorMessageIndex]);

  const handleDynamic = (key: string) => {
    let response: FlowMessage | null = null;
    
    switch(key) {
      case 'residenceResponse':
        const residenceResponses: Record<string, string> = {
          german: "Perfect! As a German citizen, you're **fully eligible** for Elterngeld.",
          eu: "Great! As an EU citizen, you're **fully eligible** for Elterngeld.",
          noneu_permit: "With your work permit, you're **eligible** for Elterngeld.",
          noneu_other: "Your eligibility depends on your specific visa. Check with your local **Elterngeldstelle** to confirm.",
        };
        response = { type: 'bot', content: residenceResponses[data.residence || ''] || residenceResponses.noneu_other };
        break;
        
      case 'dateResponse':
        const dueDate = new Date(data.dueDate || '');
        const now = new Date();
        response = { 
          type: 'bot', 
          content: dueDate > now 
            ? "Remember to apply **within 3 months** after birth – payments can only be backdated 3 months."
            : "Submit your application soon – Elterngeld can only be **backdated 3 months**."
        };
        break;
        
      case 'partnerQuestion':
        if (data.applicationType === 'couple') {
          setMessages(prev => [...prev, { type: 'bot', content: "What **type of work** does your partner do?" }]);
          setShowInput({ 
            type: 'bot',
            input: 'buttons',
            field: 'partnerEmploymentType',
            options: [
              { value: 'employed', label: 'Employed' },
              { value: 'selfEmployed', label: 'Self-employed' },
              { value: 'both', label: 'Both' },
              { value: 'none', label: 'Not working', note: 'Min €300/month' },
            ]
          });
          return;
        } else {
          setStep(s => s + 4);
          return;
        }
        
      case 'partnerIncome':
        if (data.applicationType === 'couple') {
          setMessages(prev => [...prev, { type: 'bot', content: "Partner's **monthly gross income**?" }]);
          setShowInput({ type: 'bot', input: 'slider', field: 'partnerIncome', person: 'partner' });
          return;
        } else {
          setStep(s => s + 2);
          return;
        }
    }
    
    if (response) setMessages(prev => [...prev, response!]);
    setStep(s => s + 1);
  };

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleInput = (value: string | number, displayValue?: string) => {
    const currentInput = showInput;
    setShowInput(null);
    
    if (displayValue) {
      const userMessage: FlowMessage = { type: 'user', content: displayValue };
      setMessages(prev => [...prev, userMessage]);
      
      // Set anchor to the new user message (will be at index messages.length)
      const newMessageIndex = messages.length;
      setAnchorMessageIndex(newMessageIndex);
      
      // Scroll user message to top after a small delay
      setTimeout(() => {
        scrollToAnchorMessage(newMessageIndex);
        updateBottomSpacer();
      }, 50);
    }
    
    if (currentInput?.field) {
      setData(prev => ({ ...prev, [currentInput.field!]: value }));
    }
    
    let nextStep = step + 1;
    while (nextStep < flow.length && flow[nextStep].type === 'user') {
      nextStep++;
    }
    setStep(nextStep);
  };

  const handleContinue = () => {
    setIsPaused(false);
    setShowInput(null);
    setAnchorMessageIndex(null);
    setBottomSpacerPx(0);
    setStep(s => s + 1);
  };

  // ===========================================
  // SUB-COMPONENTS
  // ===========================================
  
  const CategoryHeader = ({ label }: { label: string }) => {
    const icons: Record<string, React.ReactNode> = {
      'Residence': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      'Your Child': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      'Income': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'Planning': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      'Summary': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      'Next Steps': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      ),
    };

    return (
      <div className="pt-8 pb-3">
        <span className="text-xs font-bold uppercase flex items-center gap-2" style={{ color: colors.text, letterSpacing: '0.12em' }}>
          {icons[label]}
          {label}
        </span>
      </div>
    );
  };

  const CalculationCard = () => (
    <div className="py-4">
      <p className="text-xs uppercase mb-4 font-bold" style={{ color: colors.text, letterSpacing: '0.05em' }}>
        Your monthly Elterngeld
      </p>
      
      <div className="mb-4">
        <p className="text-xs mb-2 font-semibold" style={{ color: colors.text }}>You</p>
        <div className="flex gap-2">
          {[
            { label: 'Basis', value: myCalc.basis, color: colors.basis },
            { label: 'Plus', value: myCalc.plus, color: colors.plus },
            { label: 'Bonus', value: myCalc.bonus, color: colors.bonus },
          ].map((item, i) => (
            <div key={i} className="flex-1 p-3 rounded-lg border-2" style={{ borderColor: item.color }}>
              <p className="text-xs mb-0.5" style={{ color: colors.text }}>{item.label}</p>
              <p className="text-xl font-semibold" style={{ color: colors.textDark }}>€{item.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {data.applicationType === 'couple' && (
        <div>
          <p className="text-xs mb-2 font-semibold" style={{ color: colors.text }}>Partner</p>
          <div className="flex gap-2">
            {[
              { label: 'Basis', value: partnerCalc.basis, color: colors.basis },
              { label: 'Plus', value: partnerCalc.plus, color: colors.plus },
              { label: 'Bonus', value: partnerCalc.bonus, color: colors.bonus },
            ].map((item, i) => (
              <div key={i} className="flex-1 p-3 rounded-lg border-2" style={{ borderColor: item.color }}>
                <p className="text-xs mb-0.5" style={{ color: colors.text }}>{item.label}</p>
                <p className="text-xl font-semibold" style={{ color: colors.textDark }}>€{item.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const PlannerComponent = () => {
    const cycleType = (monthIndex: number, person: 'you' | 'partner') => {
      const newData = [...plannerData];
      const current = newData[monthIndex][person];
      const cycle: Array<'none' | 'basis' | 'plus' | 'bonus'> = ['none', 'basis', 'plus', 'bonus'];
      const nextIndex = (cycle.indexOf(current) + 1) % cycle.length;
      newData[monthIndex] = { ...newData[monthIndex], [person]: cycle[nextIndex] };
      setPlannerData(newData);
      setSelectedScenario('');
    };

    const applyScenario = (id: string) => {
      setSelectedScenario(id);
      const scenarios: Record<string, { months: number; data: PlannerMonth[] }> = {
        classic: {
          months: 14,
          data: Array.from({ length: 28 }, (_, i) => ({
            you: i < 12 ? 'basis' : 'none',
            partner: i >= 12 && i < 14 ? 'basis' : 'none',
          })) as PlannerMonth[]
        },
        equal: {
          months: 14,
          data: Array.from({ length: 28 }, (_, i) => ({
            you: i < 7 ? 'basis' : 'none',
            partner: i >= 7 && i < 14 ? 'basis' : 'none',
          })) as PlannerMonth[]
        },
        maxplus: {
          months: 24,
          data: Array.from({ length: 28 }, (_, i) => ({
            you: i < 20 ? 'plus' : 'none',
            partner: i >= 16 && i < 24 ? 'plus' : 'none',
          })) as PlannerMonth[]
        }
      };
      setPlannerMonths(scenarios[id].months);
      setPlannerData(scenarios[id].data);
    };

    const visibleData = plannerData.slice(0, plannerMonths);
    const countMonths = (person: 'you' | 'partner', type: string) => 
      visibleData.filter(m => m[person] === type).length;
    
    const youBasis = countMonths('you', 'basis');
    const youPlus = countMonths('you', 'plus');
    const youBonus = countMonths('you', 'bonus');
    const partnerBasis = countMonths('partner', 'basis');
    const partnerPlus = countMonths('partner', 'plus');
    const partnerBonus = countMonths('partner', 'bonus');
    
    // Budget calculation:
    // - 1 Basiselterngeld = 1 budget month
    // - 1 ElterngeldPlus = 0.5 budget months (half money, counts half)
    // - 1 Partnerschaftsbonus = 0.5 budget months
    const totalBudgetUsed = (youBasis + partnerBasis) + (youPlus + partnerPlus) * 0.5 + (youBonus + partnerBonus) * 0.5;
    
    const totalMoney = (youBasis * myCalc.basis) + (youPlus * myCalc.plus) + (youBonus * myCalc.bonus) + 
                       (partnerBasis * partnerCalc.basis) + (partnerPlus * partnerCalc.plus) + (partnerBonus * partnerCalc.bonus);

    // ===========================================
    // VALIDATION RULES
    // ===========================================
    const validationErrors: string[] = [];

    // Rule 1: Parallel Basiselterngeld limited to 1 month (for births after April 2024)
    if (data.applicationType === 'couple') {
      const parallelBasisMonths = visibleData.filter(m => m.you === 'basis' && m.partner === 'basis').length;
      if (parallelBasisMonths > 1) {
        validationErrors.push(`Both parents can only receive Basiselterngeld together for max. 1 month. You have ${parallelBasisMonths} months.`);
      }
      
      // Check if parallel basis is within first 12 months
      const parallelBasisAfter12 = visibleData.slice(12).some(m => m.you === 'basis' && m.partner === 'basis');
      if (parallelBasisAfter12) {
        validationErrors.push('Parallel Basiselterngeld is only allowed in the first 12 months.');
      }
    }

    // Rule 2: Total budget cannot exceed 14 months
    if (totalBudgetUsed > 14) {
      validationErrors.push(`Maximum 14 budget months allowed. You're using ${totalBudgetUsed} months. (1 Basis = 1, 1 Plus = 0.5)`);
    }

    // Rule 3: Basiselterngeld only in first 14 months of child's life
    const basisAfter14 = visibleData.slice(14).some(m => m.you === 'basis' || m.partner === 'basis');
    if (basisAfter14) {
      validationErrors.push('Basiselterngeld can only be taken in the first 14 months after birth.');
    }

    // Rule 4: Partnerschaftsbonus must be taken in parallel by both parents
    if (data.applicationType === 'couple') {
      const bonusOnlyYou = visibleData.filter(m => m.you === 'bonus' && m.partner !== 'bonus').length;
      const bonusOnlyPartner = visibleData.filter(m => m.partner === 'bonus' && m.you !== 'bonus').length;
      if (bonusOnlyYou > 0 || bonusOnlyPartner > 0) {
        validationErrors.push('Partnerschaftsbonus must be taken by both parents in the same months.');
      }
    }

    // Rule 5: Partnerschaftsbonus requires 2-4 consecutive months
    if (data.applicationType === 'couple') {
      let consecutiveBonus = 0;
      let maxConsecutive = 0;
      let hasBonus = false;
      
      for (let i = 0; i < visibleData.length; i++) {
        if (visibleData[i].you === 'bonus' && visibleData[i].partner === 'bonus') {
          hasBonus = true;
          consecutiveBonus++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveBonus);
        } else {
          consecutiveBonus = 0;
        }
      }
      
      if (hasBonus && (maxConsecutive < 2 || maxConsecutive > 4)) {
        validationErrors.push('Partnerschaftsbonus requires 2-4 consecutive months where both parents work 24-32 hours/week.');
      }
    }

    // Rule 6: For couples, at least 2 months each to get full 14 months
    if (data.applicationType === 'couple') {
      const youTotal = youBasis + youPlus + youBonus;
      const partnerTotal = partnerBasis + partnerPlus + partnerBonus;
      
      if (youTotal > 0 && partnerTotal > 0 && (youTotal < 2 || partnerTotal < 2)) {
        validationErrors.push('Each parent must take at least 2 months to qualify for the full 14 months.');
      }
    }

    // Rule 7: Each parent can take maximum 12 months of Basiselterngeld
    if (youBasis > 12) {
      validationErrors.push(`You can take maximum 12 months of Basiselterngeld. Currently: ${youBasis} months.`);
    }
    if (data.applicationType === 'couple' && partnerBasis > 12) {
      validationErrors.push(`Partner can take maximum 12 months of Basiselterngeld. Currently: ${partnerBasis} months.`);
    }

    const typeStyles: Record<string, { bg: string; text: string }> = {
      none: { bg: '#E8E6DE', text: '#A8A29E' },
      basis: { bg: colors.basis, text: '#FFFFFF' },
      plus: { bg: colors.plus, text: '#FFFFFF' },
      bonus: { bg: colors.bonus, text: colors.textDark },
    };
    const typeLabels: Record<string, string> = { none: '', basis: 'B', plus: 'P', bonus: 'PB' };

    return (
      <div className="py-4">
        {/* Presets */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: 'classic', label: 'Classic 12+2' },
            { id: 'equal', label: '50/50' },
            { id: 'maxplus', label: 'Max Plus' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => applyScenario(s.id)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: selectedScenario === s.id ? colors.textDark : colors.tile,
                color: selectedScenario === s.id ? '#FFFFFF' : colors.text,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-3 mb-4 text-xs">
          {[
            { color: colors.basis, label: 'Basis' },
            { color: colors.plus, label: 'Plus' },
            { color: colors.bonus, label: 'Bonus' },
          ].map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
              <span style={{ color: colors.text }}>{item.label}</span>
            </span>
          ))}
        </div>

        {/* Grid with scroll arrows */}
        {(() => {
          const gridRef = React.useRef<HTMLDivElement>(null);
          const [canScrollLeft, setCanScrollLeft] = React.useState(false);
          const [canScrollRight, setCanScrollRight] = React.useState(false);

          const checkScroll = () => {
            if (gridRef.current) {
              const { scrollLeft, scrollWidth, clientWidth } = gridRef.current;
              setCanScrollLeft(scrollLeft > 5);
              setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
            }
          };

          React.useEffect(() => {
            checkScroll();
            const el = gridRef.current;
            if (el) el.addEventListener('scroll', checkScroll);
            return () => { if (el) el.removeEventListener('scroll', checkScroll); };
          }, [plannerMonths]);

          const scrollGrid = (direction: 'left' | 'right') => {
            if (gridRef.current) {
              const scrollAmount = 200;
              gridRef.current.scrollBy({ 
                left: direction === 'left' ? -scrollAmount : scrollAmount, 
                behavior: 'smooth' 
              });
            }
          };

          return (
            <>
              {/* Grid */}
              <div 
                ref={gridRef}
                className="overflow-x-auto pb-2 -mx-1"
                onScroll={checkScroll}
              >
                <table className="w-max">
                  <thead>
                    <tr>
                      <th className="w-14"></th>
                      {Array.from({ length: plannerMonths }, (_, i) => (
                        <th key={i} className="text-center text-[10px] font-normal pb-1.5 w-8" style={{ color: colors.text }}>
                          {i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="text-xs pr-2 font-semibold" style={{ color: colors.text }}>You</td>
                      {visibleData.map((month, i) => (
                        <td key={i} className="p-0.5">
                          <button
                            onClick={() => cycleType(i, 'you')}
                            className="w-7 h-7 rounded text-[10px] font-bold transition-transform hover:scale-105 active:scale-95"
                            style={{ backgroundColor: typeStyles[month.you].bg, color: typeStyles[month.you].text }}
                          >
                            {typeLabels[month.you]}
                          </button>
                        </td>
                      ))}
                    </tr>
                    {data.applicationType === 'couple' && (
                      <tr>
                        <td className="text-xs pr-2 font-semibold" style={{ color: colors.text }}>Partner</td>
                        {visibleData.map((month, i) => (
                          <td key={i} className="p-0.5">
                            <button
                              onClick={() => cycleType(i, 'partner')}
                              className="w-7 h-7 rounded text-[10px] font-bold transition-transform hover:scale-105 active:scale-95"
                              style={{ backgroundColor: typeStyles[month.partner].bg, color: typeStyles[month.partner].text }}
                            >
                              {typeLabels[month.partner]}
                            </button>
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Scroll arrows - under grid, left and right */}
              {plannerMonths > 14 && (
                <div className="flex justify-between items-center mt-2 px-2">
                  <button
                    onClick={() => scrollGrid('left')}
                    disabled={!canScrollLeft}
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-0"
                    style={{ backgroundColor: colors.tile, color: colors.textDark }}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => scrollGrid('right')}
                    disabled={!canScrollRight}
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-30"
                    style={{ backgroundColor: colors.tile, color: colors.textDark }}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          );
        })()}
        
        {/* Month Controls - Below grid, left aligned */}
        <div className="flex items-center gap-1 mt-3">
          <button
            onClick={() => setPlannerMonths(prev => Math.max(14, prev - 2))}
            disabled={plannerMonths <= 14}
            className="w-8 h-8 rounded-lg text-lg font-bold transition-all disabled:opacity-30 flex items-center justify-center"
            style={{ backgroundColor: colors.tile, color: colors.textDark }}
          >
            −
          </button>
          <button
            onClick={() => setPlannerMonths(prev => Math.min(28, prev + 2))}
            disabled={plannerMonths >= 28}
            className="w-8 h-8 rounded-lg text-lg font-bold transition-all disabled:opacity-30 flex items-center justify-center"
            style={{ backgroundColor: colors.tile, color: colors.textDark }}
          >
            +
          </button>
          <span className="text-sm font-semibold ml-2" style={{ color: colors.textDark }}>{plannerMonths} months</span>
        </div>

        {/* Summary */}
        <div className="pt-4 mt-2" style={{ borderTop: `1px solid ${colors.border}` }}>
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
              <div className="flex items-start gap-2">
                <span className="text-red-500 font-bold text-sm">⚠</span>
                <div className="space-y-1">
                  {validationErrors.map((error, i) => (
                    <p key={i} className="text-xs text-red-700">{error}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <div className="text-sm mb-2" style={{ color: colors.text }}>
            <strong style={{ color: colors.textDark }}>You:</strong> {youBasis} Basis, {youPlus} Plus, {youBonus} Bonus
          </div>
          {data.applicationType === 'couple' && (
            <div className="text-sm mb-3" style={{ color: colors.text }}>
              <strong style={{ color: colors.textDark }}>Partner:</strong> {partnerBasis} Basis, {partnerPlus} Plus, {partnerBonus} Bonus
            </div>
          )}
          <div className="flex justify-end">
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold" style={{ color: colors.text }}>Total</p>
              <p className="text-2xl font-bold" style={{ color: colors.textDark }}>€{totalMoney.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Question Tags */}
        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
          <div className="flex flex-wrap gap-2">
            {['What is Basiselterngeld?', 'What is ElterngeldPlus?', 'Partnerschaftsbonus?'].map((q, i) => (
              <button 
                key={i}
                className="px-3 py-2 text-xs rounded-lg transition-colors font-medium"
                style={{ backgroundColor: '#FFFFFF', color: colors.textDark, border: `1.5px solid ${colors.text}` }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const SummaryCard = () => {
    const visibleData = plannerData.slice(0, plannerMonths);
    const countMonths = (person: 'you' | 'partner', type: string) => 
      visibleData.filter(m => m[person] === type).length;
    
    const youMonths = countMonths('you', 'basis') + countMonths('you', 'plus') + countMonths('you', 'bonus');
    const partnerMonths = countMonths('partner', 'basis') + countMonths('partner', 'plus') + countMonths('partner', 'bonus');
    const totalMoney = (countMonths('you', 'basis') * myCalc.basis) + (countMonths('you', 'plus') * myCalc.plus) + 
                       (countMonths('you', 'bonus') * myCalc.bonus) + (countMonths('partner', 'basis') * partnerCalc.basis) + 
                       (countMonths('partner', 'plus') * partnerCalc.plus) + (countMonths('partner', 'bonus') * partnerCalc.bonus);

    const formatDate = (dateStr: string | undefined) => {
      if (!dateStr) return '-';
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const rows = [
      { label: 'Child expected', value: formatDate(data.dueDate) },
      { label: 'Applying as', value: data.applicationType === 'couple' ? 'Couple' : 'Single parent' },
      { label: 'You', value: `€${myCalc.basis}/mo × ${youMonths} months` },
      ...(data.applicationType === 'couple' ? [{ label: 'Partner', value: `€${partnerCalc.basis}/mo × ${partnerMonths} months` }] : []),
    ];

    return (
      <div className="py-4">
        <div className="rounded-xl p-4" style={{ backgroundColor: colors.tile }}>
          <div className="space-y-3 text-sm">
            {rows.map((row, i) => (
              <div key={i} className="flex justify-between py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
                <span style={{ color: colors.text }}>{row.label}</span>
                <span className="font-semibold" style={{ color: colors.textDark }}>{row.value}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4" style={{ borderTop: `2px solid ${colors.text}` }}>
            <div className="flex justify-between items-baseline">
              <span className="font-semibold" style={{ color: colors.text }}>Estimated total</span>
              <span className="text-2xl font-bold" style={{ color: colors.textDark }}>€{totalMoney.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CTACard = () => (
    <div className="py-4">
      <div className="rounded-xl p-4" style={{ backgroundColor: colors.tile }}>
        <div className="space-y-2 text-sm mb-4">
          {['Eligibility confirmed', 'Income calculation', 'Month planning'].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span className="font-medium" style={{ color: colors.textDark }}>{item}</span>
            </div>
          ))}
        </div>
        
        <p className="text-xs mb-3 font-bold" style={{ color: colors.text }}>Still needed:</p>
        <div className="space-y-2 text-sm mb-4">
          {['Personal details', 'Address', 'Bank details', 'Employment details'].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: colors.text }} />
              <span style={{ color: colors.text }}>{item}</span>
            </div>
          ))}
        </div>
        
        <p className="text-xs mb-4" style={{ color: colors.text }}>About 10 minutes to complete</p>
        
        <button 
          className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ backgroundColor: colors.textDark, color: '#FFFFFF' }}
        >
          Create my application – €49
        </button>
      </div>
    </div>
  );

  // ===========================================
  // INPUT COMPONENTS
  // ===========================================

  const ButtonOptions = ({ options, onSelect }: { options: ButtonOption[], onSelect: (value: string, label: string) => void }) => (
    <div className="space-y-2">
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => onSelect(opt.value, opt.label)}
          className="w-full p-3.5 rounded-xl text-left transition-all flex items-center justify-between hover:border-stone-400"
          style={{ backgroundColor: '#FFFFFF', border: `1.5px solid ${colors.border}` }}
        >
          <div>
            <span className="text-sm font-medium" style={{ color: colors.textDark }}>{opt.label}</span>
            {opt.sub && <p className="text-xs mt-0.5" style={{ color: colors.text }}>{opt.sub}</p>}
          </div>
          {opt.note && (
            <span 
              className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ 
                backgroundColor: opt.accent === 'basis' ? colors.basis : opt.accent === 'bonus' ? colors.bonus : colors.tile,
                color: opt.accent === 'bonus' ? colors.textDark : opt.accent ? '#FFFFFF' : colors.text,
              }}
            >
              {opt.note}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  const DateInput = () => (
    <input 
      type="date" 
      className="w-full px-4 py-3.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-stone-300"
      style={{ backgroundColor: '#FFFFFF', color: colors.textDark, border: `1.5px solid ${colors.border}` }}
      onChange={(e) => {
        if (e.target.value) {
          const formatted = new Date(e.target.value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
          handleInput(e.target.value, formatted);
        }
      }}
    />
  );

  const SliderInput = ({ person }: { person: 'you' | 'partner' }) => {
    const value = person === 'partner' ? partnerSliderValue : sliderValue;
    const setValue = person === 'partner' ? setPartnerSliderValue : setSliderValue;
    const trackRef = useRef<HTMLDivElement>(null);

    const getValueFromPosition = (clientX: number) => {
      if (!trackRef.current) return value;
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round((percent * 8000) / 100) * 100;
    };

    const handlePointerDown = (e: React.PointerEvent) => {
      e.preventDefault();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      setValue(getValueFromPosition(e.clientX));
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      if (e.buttons === 0) return; // Not pressed
      setValue(getValueFromPosition(e.clientX));
    };

    const handlePointerUp = (e: React.PointerEvent) => {
      const target = e.currentTarget;
      target.releasePointerCapture(e.pointerId);
    };

    const percent = (value / 8000) * 100;
    
    return (
      <div className="rounded-xl p-4" style={{ backgroundColor: '#FFFFFF', border: `1.5px solid ${colors.border}` }}>
        <div className="text-center mb-5">
          <span className="text-3xl font-bold" style={{ color: colors.textDark }}>{value.toLocaleString()}</span>
          <span className="text-xl ml-1" style={{ color: colors.text }}>€</span>
        </div>
        
        <div 
          ref={trackRef}
          className="relative h-12 cursor-pointer select-none touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="absolute top-1/2 left-0 right-0 h-2 rounded-full -translate-y-1/2" style={{ backgroundColor: colors.border }} />
          <div className="absolute top-1/2 left-0 h-2 rounded-full -translate-y-1/2 pointer-events-none" style={{ backgroundColor: colors.textDark, width: `${percent}%` }} />
          <div 
            className="absolute top-1/2 w-8 h-8 rounded-full pointer-events-none -translate-y-1/2"
            style={{ 
              backgroundColor: colors.textDark, 
              left: `${percent}%`,
              marginLeft: '-16px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            }}
          />
        </div>
        
        <div className="flex justify-between text-xs mt-1 px-1 font-medium" style={{ color: colors.text }}>
          <span>€0</span>
          <span>€8,000</span>
        </div>
        <button 
          onClick={() => handleInput(value, `€${value.toLocaleString()}`)}
          className="w-full mt-5 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ backgroundColor: colors.textDark, color: '#FFFFFF' }}
        >
          Continue
        </button>
      </div>
    );
  };

  const ChatInput = () => (
    <div className="flex items-center gap-2 rounded-full px-4 py-2" style={{ backgroundColor: '#FFFFFF', border: `1.5px solid ${colors.border}` }}>
      <input
        type="text"
        placeholder="Ask anything about Elterngeld..."
        className="flex-1 bg-transparent focus:outline-none text-sm"
        style={{ color: colors.textDark }}
      />
      <button 
        className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:opacity-90"
        style={{ backgroundColor: colors.textDark }}
      >
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>
    </div>
  );

  // ===========================================
  // RENDER
  // ===========================================

  const progress = Math.min(100, (step / flow.length) * 100);

  const renderMessage = (msg: FlowMessage, i: number) => {
    if (msg.type === 'category') return <CategoryHeader key={i} label={msg.content || ''} />;
    
    if (msg.type === 'user') {
      return (
        <div key={i} data-message-index={i} className="flex justify-end py-2">
          <div className="rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%]" style={{ backgroundColor: colors.userBubble }}>
            <span className="text-sm" style={{ color: colors.textDark }}>{msg.content}</span>
          </div>
        </div>
      );
    }
    
    if (msg.type === 'bot') {
      return (
        <div key={i} data-message-index={i} className="py-2">
          <p className="text-[15px] leading-relaxed" style={{ color: colors.textDark }}>
            {formatText(msg.content, onOpenChat)}
          </p>
          {msg.subtext && (
            <p className="text-sm mt-1.5" style={{ color: colors.text }}>{formatText(msg.subtext, onOpenChat)}</p>
          )}
        </div>
      );
    }
    
    if (msg.type === 'component') {
      switch(msg.component) {
        case 'calculation': return <CalculationCard key={i} />;
        case 'planner': return <PlannerComponent key={i} />;
        case 'summary': return <SummaryCard key={i} />;
        case 'cta': return <CTACard key={i} />;
        default: return null;
      }
    }
    return null;
  };

  const renderInput = () => {
    if (!showInput) return null;
    
    if (showInput.component === 'continue') {
      return (
        <button 
          onClick={handleContinue}
          className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ backgroundColor: colors.textDark, color: '#FFFFFF' }}
        >
          Continue to Summary
        </button>
      );
    }
    
    if (showInput.type === 'end') return <ChatInput />;
    if (showInput.input === 'buttons' && showInput.options) return <ButtonOptions options={showInput.options} onSelect={handleInput} />;
    if (showInput.input === 'date') return <DateInput />;
    if (showInput.input === 'slider') return <SliderInput person={showInput.person || 'you'} />;
    
    return null;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <div className="px-5 py-4 sticky top-0 z-10" style={{ backgroundColor: colors.background, borderBottom: `1px solid ${colors.border}` }}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <span className="font-semibold text-lg" style={{ color: colors.textDark }}>Elterngeld Guide</span>
          <button 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:opacity-80"
            style={{ backgroundColor: colors.tile, color: colors.textDark }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Ask anything</span>
          </button>
        </div>
        
        {/* Progress */}
        <div className="mt-3 h-1 rounded-full max-w-lg mx-auto" style={{ backgroundColor: colors.border }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: colors.progress }} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <div 
          className="h-full overflow-y-auto px-5 py-4" 
          ref={scrollRef}
          onScroll={handleScroll}
        >
          <div className="max-w-lg mx-auto" data-messages-container>
            {messages.map((msg, i) => renderMessage(msg, i))}
            
            {/* Streaming message */}
            {isStreaming && streamingContent && (
              <div className="py-2">
                <p className="text-[15px] leading-relaxed" style={{ color: colors.textDark }}>
                  {formatText(streamingContent, onOpenChat)}
                </p>
              </div>
            )}
            
            {isTyping && !isStreaming && (
              <div className="py-2">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: colors.text }} />
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: colors.text, animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: colors.text, animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            
            {/* Dynamic spacer for scroll anchoring */}
            <div 
              data-spacer 
              style={{ 
                height: bottomSpacerPx,
                transition: 'height 0.1s ease-out'
              }} 
            />
          </div>
        </div>
      </div>

      {/* Input (sticky) with top border */}
      <div className="px-5 pb-6 pt-3 sticky bottom-0" style={{ backgroundColor: colors.background, borderTop: `1px solid ${colors.border}` }}>
        <div className="max-w-lg mx-auto">
          {renderInput()}
        </div>
      </div>

      {/* Floating scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="fixed z-[100] w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{ 
            backgroundColor: colors.textDark, 
            bottom: '85px',
            left: '50%',
            transform: 'translateX(-50%)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default function Guide() {
  return (
    <Sidebar>
      <ElterngeldGuide />
    </Sidebar>
  );
}
