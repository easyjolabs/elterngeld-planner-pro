import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Navbar() {
  return (
    <nav className="h-16 border-b border-border bg-background flex items-center justify-between px-6">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">E</span>
        </div>
        <span className="font-semibold text-foreground">Elterngeld Helper</span>
      </div>

      {/* Nav Links */}
      <div className="hidden md:flex items-center gap-8">
        <a 
          href="https://grey-directions-040861.framer.app/#service" 
          className="text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          Service
        </a>
        <a 
          href="#" 
          className="text-foreground font-medium text-sm"
        >
          Tool
        </a>
        <a 
          href="https://grey-directions-040861.framer.app/#blog" 
          className="text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          Blog
        </a>
      </div>

      {/* CTA Button */}
      <Button 
        className="rounded-full gap-2 gradient-primary hover:opacity-90 transition-opacity"
        asChild
      >
        <a href="https://grey-directions-040861.framer.app/" target="_blank" rel="noopener noreferrer">
          Get Elterngeld
          <ArrowRight className="h-4 w-4" />
        </a>
      </Button>
    </nav>
  );
}
