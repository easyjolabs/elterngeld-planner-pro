import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.svg';

export function Navbar() {
  return (
    <nav className="h-16 bg-[#F5F5F5] flex items-center justify-between px-6">
      {/* Logo */}
      <img src={logo} alt="Elterngeld Helper" className="h-8" />

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
