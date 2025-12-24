import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const phrases = [
  "Counting tiny toes",
  "Folding onesies",
  "Humming lullabies"
];

export function ThinkingAnimation() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % phrases.length);
        setIsVisible(true);
      }, 300);
      
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-muted-foreground italic flex items-center gap-1.5">
      <span className="text-primary/70">✦</span>
      <span 
        className={cn(
          "transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0"
        )}
      >
        {phrases[currentIndex]}
      </span>
    </span>
  );
}
