import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollToBottomButtonProps {
  visible: boolean;
  onClick: () => void;
  className?: string;
}

const ScrollToBottomButton = ({ visible, onClick, className }: ScrollToBottomButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full',
        'bg-background border border-border shadow-lg',
        'transition-all duration-300 ease-out',
        'hover:bg-muted hover:shadow-xl hover:scale-105',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none',
        className
      )}
      aria-label="Scroll to bottom"
    >
      <ChevronDown className="h-5 w-5 text-muted-foreground" />
    </button>
  );
};

export default ScrollToBottomButton;
