'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { urls } from '@/config/app';

export function CTASection() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <section className="section-padding bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-hero-pattern opacity-10"></div>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-1/4 left-1/4 w-32 h-32 bg-white rounded-full opacity-5 blur-xl"
        />
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-white rounded-full opacity-5 blur-xl"
        />
      </div>

      <div className="container mx-auto container-padding relative z-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center space-x-2 bg-white bg-opacity-20 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            <span>Ready to get started?</span>
          </div>

          <h2 className="heading-lg font-lato font-black text-white mb-6">
            Transform your website with StorySlip today
          </h2>
          
          <p className="text-large text-white text-opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of websites already using StorySlip to deliver amazing content experiences. 
            Start your free trial today and see the difference in minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              href={urls.register}
              variant="secondary"
              size="lg"
              className="group bg-white text-primary-600 hover:bg-gray-100"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              href={urls.requestDemo}
              variant="ghost"
              size="lg"
              className="text-white border-white hover:bg-white hover:bg-opacity-10"
            >
              Schedule Demo
            </Button>
          </div>

          <div className="mt-8 text-white text-opacity-75 text-sm">
            No credit card required • 14-day free trial • Cancel anytime
          </div>
        </motion.div>
      </div>
    </section>
  );
}