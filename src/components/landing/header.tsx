import { Link } from "@tanstack/react-router";
import { GitHubIcon } from "../icons/github";
import { Button } from "../ui/button";
import { Logo } from "../icons/logo";
import { useEffect, useState } from "react";
import { ThemeToggle } from "../theme/theme-toggle";

 export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function handleScrollToTopSmooth() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  return (
    <header className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
      scrolled ? 'top-2' : 'top-4'
    }`}>
      <div className={`flex items-center gap-2 px-2 py-2 rounded-full border transition-all duration-300 ${
        scrolled 
          ? 'bg-background/95 backdrop-blur-md shadow-lg border-border' 
          : 'bg-background/80 backdrop-blur-sm border-border/50'
      }`}>
        <Link to="/" className="pl-3" onClick={handleScrollToTopSmooth}>
          <Logo size="md" />
        </Link>
        
        <nav className="hidden md:flex items-center">
          <a 
            href="#features" 
            className="px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </a>
          <a 
            href="#how-it-works" 
            className="px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            How it works
          </a>
        </nav>

        <div className="flex items-center gap-2 pl-2">
          <a 
            href="https://github.com/AlizSaas" 
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="GitHub"
          >
            <GitHubIcon className="h-4 w-4" />
          </a>
          <ThemeToggle />
          <Button size="sm" className="rounded-full px-4 bg-foreground text-background hover:bg-foreground/90" asChild>
            <Link to="/login">Try free</Link>
          </Button>
        </div>
      </div>
      
    </header>
  );
}