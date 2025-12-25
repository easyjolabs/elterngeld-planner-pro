import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.svg';
export function Navbar() {
  return <nav className="h-16 flex items-center justify-between px-6 bg-white">
      {/* Logo */}
      <img src={logo} alt="Elterngeld Helper" className="h-8" />

      {/* Nav Links */}
      

      {/* CTA Button */}
      <Button className="rounded-full gap-2 gradient-primary hover:opacity-90 transition-opacity" asChild>
        
      </Button>
    </nav>;
}