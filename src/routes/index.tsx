
import { Header } from '@/components/landing/header'
import { CTASection, DifferentiatorsSection, FeaturesSection, Footer, Hero, HowItWorksSection, ProblemSection } from '@/components/landing/hero'
import { VideoModal } from '@/components/video/video-model';
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react';

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
    const [isVideoOpen, setIsVideoOpen] = useState(false);
  return ( <div className='min-h-screen bg-background'>
    <Header />
    <main>
      <Hero onViewDemo={() => setIsVideoOpen(true)}/>
        <ProblemSection/>
            <DifferentiatorsSection />
            <FeaturesSection/>
             <HowItWorksSection />
              <CTASection onViewDemo={() => setIsVideoOpen(true)} />
    </main>
    <Footer />



      <VideoModal isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />

  </div>
  )
}
