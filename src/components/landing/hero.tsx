import { ArrowRight, Bell, Check, CheckCircle, CreditCard, FileText, Globe, LayoutDashboard, Play, Target, User, Users, Zap } from "lucide-react";
import { Button } from "../ui/button";
import { Link } from "@tanstack/react-router";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { GitHubIcon } from "../icons/github";
import { Logo } from "../icons/logo";

function InvoiceMockup() {
    return (
        <div className="relative">
             
               <div className="absolute inset-0 translate-x-3 translate-y-3 bg-foreground/5 rounded-2xl" />
          

            <div className="relative w-[320px] bg-card rounded-2xl shadow-card-hover border overflow-hidden animate-float">
                <div className="h-0.5 bg-primary" />
            

                {/* Header */}
                <div className="p-6 border-b border-border/50">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                            Service Invoice
                        </span>
                        <span className="text-sm font-semibold font-mono">
                            #MOTO-742
                        </span>
                    </div>
                    <div className="space-y-1">
                        <p className="font-semibold">Iron Street Motorcycles</p>
                        <p className="text-sm text-muted-foreground">
                            Due: Feb 10, 2026
                        </p>
                    </div>
                </div>

                {/* Line items */}
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                            Full Service & Inspection
                        </span>
                        <span className="font-medium font-mono">$420.00</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                            Chain & Sprocket Replacement
                        </span>
                        <span className="font-medium font-mono">$280.00</span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex items-center justify-between">
                        <span className="font-semibold">Total Due</span>
                        <span className="text-xl font-bold font-mono">
                            $700.00
                        </span>
                    </div>
                </div>

                {/* Status */}
                <div className="px-6 pb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse-subtle" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                            Sent to Customer
                        </span>
                    </div>
                </div>
            </div>
            

            {/* Notification toast */}
            <div className="absolute -right-4 top-12 animate-notification hidden sm:block">
                <div className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl shadow-kivo-xl">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                        Payment received from rider
                    </span>
                </div>
            </div>
        </div>
    );
}

export function Hero({ onViewDemo }: { onViewDemo: () => void }) {
    return (
        <section className="relative min-h-screen flex items-center pt-24 pb-20 px-6 overflow-hidden">
            <div className="absolute inset-0 grid-pattern opacity-30" />

            <div className="relative z-10 max-w-6xl mx-auto w-full">
                <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
                    {/* Left */}
                    <div className="text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-secondary/50 text-sm mb-8">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-subtle" />
                            <span className="text-muted-foreground">
                                Built for motorcycle shops
                            </span>
                            <span className="text-muted-foreground/50">·</span>
                            <span className="text-muted-foreground">
                                No setup fees
                            </span>
                        </div>

                        <h1 className="font-serif text-4xl md:text-5xl tracking-tight mb-6 leading-[1.1]">
                            Invoicing made for{' '}
                            <span className="relative inline-block">
                                <span className="relative z-10">
                                    motorcycle businesses.
                                </span>
                                <span className="absolute bottom-2 left-0 right-0 h-3 bg-primary/15 z-0" />
                            </span>
                        </h1>

                        <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                            Simple invoicing for motorcycle shops, dealers, and
                            independent mechanics. Send service invoices, track
                            payments, and get paid faster — without paperwork.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                            <Button size="lg" className="rounded-full px-8" asChild>
                                <Link to="/dashboard">
                                    Start your shop
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="rounded-full px-6"
                                onClick={onViewDemo}
                            >
                                <Play className="mr-2 h-4 w-4" />
                                See how it works
                            </Button>
                        </div>
                    </div>

                    {/* Right */}
                    <div className="flex justify-center lg:justify-end">
                        <InvoiceMockup />
                    </div>
                </div>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/50">
                <span className="text-xs uppercase tracking-widest">
                    Scroll
                </span>
                <div className="w-px h-8 bg-linear-to-b from-muted-foreground/30 to-transparent" />
            </div>
        </section>
    );
}

export function ProblemSection() {
  const ref = useScrollAnimation();

  return (
    <section ref={ref} className="py-20 px-6 relative">
      <div className="max-w-4xl mx-auto text-center">
        <div className="animate-on-scroll">
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl tracking-tight mb-8 leading-tight">
            Shop invoices should not slow{' '}
            <span className="italic text-muted-foreground">your day down.</span>
          </h2>
          
          <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
            Most invoicing tools are{' '}
            <span className="relative inline-block px-1">
              <span className="relative z-10">overbuilt</span>
              <span className="absolute top-1/2 left-0 right-0 h-0.5 bg-muted-foreground/40" />
            </span>,{' '}
            <span className="relative inline-block px-1">
              <span className="relative z-10">confusing</span>
              <span className="absolute top-1/2 left-0 right-0 h-0.5 bg-muted-foreground/40" />
            </span>,{' '}
            or designed for offices — not motorcycle shops. You just finished the job, the rider wants to pay, and you need to send the invoice fast.
          </p>

          <div className="inline-flex items-center px-6 py-3 bg-secondary rounded-full">
            <span className="text-lg font-medium">
              Built for riders, mechanics, and dealerships.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
function DifferentiatorCard({ 
  icon: Icon,
  title, 
  description,
  delay 
}: { 
  icon: React.ComponentType<{ className?: string }>;
  title: string; 
  description: string;
  delay: string;
}) {
  return (
    <div className={`animate-on-scroll ${delay} group relative p-8 rounded-2xl border bg-card card-hover-border transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1`}>
      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-4">
        <Icon className="h-5 w-5 text-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

 export function DifferentiatorsSection() {
  const ref = useScrollAnimation();
  
  const differentiators = [
    {
      icon: Target,
      title: 'Built for service work',
      description:
        'Each invoice is focused on parts, labor, and totals. No accounting noise. Just clear motorcycle service billing.',
    },
    {
      icon: User,
      title: 'Made for motorcycle shops',
      description:
        'Independent mechanics, dealers, and custom shops do not need corporate software. This stays shop-friendly.',
    },
    {
      icon: Bell,
      title: 'Automatic customer follow-ups',
      description:
        'Payment reminders are sent automatically so you can stay in the shop instead of chasing riders.',
    },
    {
      icon: Zap,
      title: 'Fast and dependable',
      description:
        'Runs fast, stays secure, and works wherever your shop does — front desk, garage, or mobile.',
    },
  ];

  return (
    <section ref={ref} className="py-16 px-6 bg-secondary/30 relative overflow-hidden">
      <div className="absolute inset-0 dot-pattern opacity-20" />
      
      <div className="relative max-w-5xl mx-auto">
        <div className="animate-on-scroll text-center mb-12">
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl tracking-tight">
            Why motorcycle businesses choose us
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {differentiators.map((item, index) => (
            <DifferentiatorCard 
              key={item.title} 
              {...item} 
              delay={`animation-delay-${(index + 1) * 100}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}


function FeatureCard({ 
  icon: Icon, 
  title, 
  description,
  delay = ''
}: { 
  icon: React.ComponentType<{ className?: string }>;
  title: string; 
  description: string;
  delay?: string;
}) {
  return (
    <div className={`animate-on-scroll ${delay} group relative p-6 rounded-2xl border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover`}>
      {/* Hover accent line */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
      
      <div className="relative">
        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-5 transition-colors duration-300 group-hover:bg-foreground/5">
          <Icon className="h-6 w-6 text-foreground" />
        </div>
        <h3 className="font-semibold mb-2 text-lg">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

 

export function FeaturesSection() {
  const ref = useScrollAnimation();

  const features = [
    {
      icon: Users,
      title: 'Clients',
      description: 'Keep client details organized in one place.',
    },
    {
      icon: FileText,
      title: 'Invoices',
      description: 'Create invoices with line items, taxes, and discounts.',
    },
    {
      icon: Globe,
      title: 'Public invoice links',
      description: 'Clients view and pay invoices without logging in.',
    },
    {
      icon: CreditCard,
      title: 'Payments',
      description: 'Accept card payments with Stripe. Auto-mark as settled.',
    },
    {
      icon: Bell,
      title: 'Reminders',
      description: 'Automatic reminders before and after due dates.',
    },
    {
      icon: LayoutDashboard,
      title: 'Dashboard',
      description: 'See outstanding, overdue, and settled invoices at a glance.',
    },
  ];

  return (
    <section id="features" ref={ref} className="py-16 px-6 scroll-mt-20">
      <div className="max-w-5xl mx-auto">
        <div className="animate-on-scroll text-center mb-4">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4 block">
            Features
          </span>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl tracking-tight">
            Core features
          </h2>
        </div>

        <p className="animate-on-scroll animation-delay-100 text-muted-foreground text-center mb-12 max-w-xl mx-auto text-lg">
          Everything you need to handle service invoices — without extra complexity.
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard 
              key={feature.title} 
              {...feature}
              delay={`animation-delay-${((index % 3) + 1) * 100}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}


 export function HowItWorksSection() {
  const ref = useScrollAnimation();

  const steps = [
    { 
      number: 1, 
      title: 'Add a customer',
      description: 'Save rider or customer details once and reuse them for future service invoices.',
      icon: Users,
    },
    { 
      number: 2, 
      title: 'Create a service invoice',
      description: 'Add parts, labor, and notes. Build a clear motorcycle service invoice in seconds.',
      icon: FileText,
    },
    { 
      number: 3, 
      title: 'Customer pays',
      description: 'Send a link by text or email. Customers view the invoice and pay online.',
      icon: CreditCard,
    },
    { 
      number: 4, 
      title: 'Job settled',
      description: 'Payment confirmed and the service invoice is marked as completed.',
      icon: Check,
      isLast: true,
    },
  ];

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="py-16 px-6 bg-secondary/30 scroll-mt-20 relative overflow-hidden"
    >
      <div className="absolute inset-0 grid-pattern opacity-50" />
      
      <div className="relative max-w-5xl mx-auto">
        <div className="animate-on-scroll text-center mb-12">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4 block">
            Process
          </span>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl tracking-tight">
            How it works
          </h2>
        </div>
        
        <div className="animate-on-scroll animation-delay-200">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative">
                  <div
                    className={`relative p-6 rounded-2xl border h-full transition-all duration-300 ${
                      step.isLast 
                        ? 'bg-primary border-primary text-primary-foreground hover:shadow-kivo-xl' 
                        : 'bg-card border-border hover:shadow-card-hover hover:-translate-y-1'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                        step.isLast ? 'bg-primary-foreground/20' : 'bg-secondary'
                      }`}
                    >
                      <Icon
                        className={`h-6 w-6 ${
                          step.isLast ? 'text-primary-foreground' : 'text-foreground'
                        }`}
                      />
                    </div>
                    
                    <h3
                      className={`font-semibold mb-2 ${
                        step.isLast ? 'text-primary-foreground' : 'text-foreground'
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p
                      className={`text-sm leading-relaxed ${
                        step.isLast ? 'text-primary-foreground/90' : 'text-muted-foreground'
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

 export function CTASection({ onViewDemo }: { onViewDemo: () => void }) {
  const ref = useScrollAnimation();

  return (
    <section ref={ref} className="py-16 px-6 relative overflow-hidden">
      <div className="relative max-w-4xl mx-auto">
        <div className="animate-on-scroll">
          <div className="relative bg-card rounded-3xl border shadow-card-hover p-12 md:p-16 text-center overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-foreground" />
            
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-6 block">
              Get started
            </span>
            
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl tracking-tight mb-6">
              Start invoicing your motorcycle jobs today.
            </h2>
            
            <p className="text-muted-foreground mb-10 text-lg max-w-lg mx-auto">
              Create service invoices for parts and labor, send them to customers,
              and get paid without chasing anyone.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Button
                size="lg"
                className="rounded-full px-8 bg-foreground text-background hover:bg-foreground/90"
                asChild
              >
                <Link to="/signup">
                  Start free for your shop
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-6 border-foreground text-foreground hover:bg-foreground hover:text-background"
                onClick={onViewDemo}
              >
                <Play className="mr-2 h-5 w-5" />
                See a demo
              </Button>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                No credit card required
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Free plan for small shops
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Cancel anytime
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

 export function Footer() {
  return (
    <footer className="py-12 px-6 border-t">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Logo />
            <div className="h-4 w-px bg-border hidden md:block" />
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} MotoInvoice. All rights reserved.
            </p>
          </div>
          
          <nav className="flex flex-wrap items-center justify-center gap-8">
            <Link 
              to="/" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link 
              to="/" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <a 
              href="https://github.com/AlizSaas" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
            >
              <GitHubIcon className="h-4 w-4" />
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

