import { Metadata } from 'next';
import { HeroSection } from '@/components/sections/HeroSection';
import { FeaturesSection } from '@/components/sections/FeaturesSection';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';
import { DemoSection } from '@/components/sections/DemoSection';
import { PricingSection } from '@/components/sections/PricingSection';
import { CTASection } from '@/components/sections/CTASection';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'StorySlip - Effortless Content Management for Modern Websites',
  description: 'Transform your website with StorySlip\'s powerful, lightweight content management system. Easy integration, beautiful widgets, and comprehensive analytics.',
  openGraph: {
    title: 'StorySlip - Effortless Content Management for Modern Websites',
    description: 'Transform your website with StorySlip\'s powerful, lightweight content management system. Easy integration, beautiful widgets, and comprehensive analytics.',
    url: '/',
    images: [
      {
        url: '/og-home.png',
        width: 1200,
        height: 630,
        alt: 'StorySlip Homepage',
      },
    ],
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-secondary-900">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
        <DemoSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}