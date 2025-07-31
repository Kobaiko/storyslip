'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  Star,
  Users,
  ArrowRight,
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import { TestimonialCard, TestimonialCardCompact } from '@/components/ui/TestimonialCard';

// Sample testimonial data with realistic content
const testimonialsData = [
  {
    id: "1",
    name: "Sarah Chen",
    title: "Lead Developer",
    company: "",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
    quote: "StorySlip transformed how we manage content across our platform. The integration was seamless and our team loves the intuitive interface. We reduced deployment time by 60%.",
    rating: 5,
    featured: true
  },
  {
    id: "2",
    name: "Marcus Rodriguez",
    title: "CTO",
    company: "",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    quote: "We reduced our content management overhead by 70% after switching to StorySlip. The analytics insights are incredibly valuable for our growth strategy.",
    rating: 5
  },
  {
    id: "3",
    name: "Emily Watson",
    title: "Product Manager",
    company: "",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
    quote: "The white-label capabilities allowed us to maintain our brand identity while leveraging StorySlip's powerful features. Our clients love the seamless experience.",
    rating: 5
  },
  {
    id: "4",
    name: "David Kim",
    title: "Frontend Architect",
    company: "",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    quote: "As a developer, I appreciate the clean APIs and comprehensive documentation. Integration took less than an hour and the performance is outstanding.",
    rating: 5
  },
  {
    id: "5",
    name: "Lisa Thompson",
    title: "Marketing Director",
    company: "",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    quote: "The real-time analytics help us understand content performance and optimize our strategy effectively. ROI increased by 40% in just 3 months.",
    rating: 5
  },
  {
    id: "6",
    name: "Alex Rivera",
    title: "DevOps Engineer",
    company: "",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    quote: "The deployment process is incredibly smooth. Auto-scaling and CDN integration work flawlessly. Our uptime improved to 99.9%.",
    rating: 5
  },
  {
    id: "7",
    name: "Jordan Martinez",
    title: "Technical Lead",
    company: "",
    avatar: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&h=150&fit=crop&crop=face",
    quote: "StorySlip's flexibility and robust API ecosystem made it the perfect choice for our multi-platform content strategy. The team support is exceptional.",
    rating: 5
  }
];

const stats = [
  { value: '50K+', label: 'Happy Customers', icon: Users },
  { value: '99.9%', label: 'Uptime SLA', icon: TrendingUp },
  { value: '4.9/5', label: 'Average Rating', icon: Star },
];

export function TestimonialsSection() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const featuredTestimonials = testimonialsData.filter(t => t.featured);
  const regularTestimonials = testimonialsData.filter(t => !t.featured);

  return (
    <section id="testimonials" className="py-16 lg:py-24 bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <CheckCircle className="h-4 w-4" />
            <span>Trusted by Thousands</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight font-lato text-gray-900 dark:text-white mb-6">
            Loved by developers and{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">trusted by enterprises</span>
          </h2>

          <p className="text-lg sm:text-xl leading-relaxed text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-12">
            Join thousands of companies who have transformed their content management
            with StorySlip. Here's what they have to say about their experience.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl mb-3">
                  <stat.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-2xl font-bold font-display text-blue-600 dark:text-blue-400 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Featured Testimonials */}
        {featuredTestimonials.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-16"
          >
            <div className="grid gap-8 max-w-4xl mx-auto">
              {featuredTestimonials.map((testimonial, index) => (
                <TestimonialCard
                  key={testimonial.id}
                  testimonial={testimonial}
                  featured={true}
                  index={index}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Regular Testimonials Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
        >
          {regularTestimonials.map((testimonial, index) => (
            <TestimonialCard
              key={testimonial.id}
              testimonial={testimonial}
              index={index}
            />
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-center"
        >
          <div className="inline-flex flex-col sm:flex-row items-center gap-6 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-4xl mx-auto">
            <div className="text-center sm:text-left flex-1">
              <h3 className="text-xl font-bold font-lato text-gray-900 dark:text-white mb-3">
                Ready to join these success stories?
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Start your free trial today and see why thousands of companies trust StorySlip
                for their content management needs.
              </p>
              <div className="flex items-center justify-center sm:justify-start space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>14-day free trial</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <motion.a
                href="/signup"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>Start Free Trial</span>
                <ArrowRight className="h-4 w-4" />
              </motion.a>
              <motion.a
                href="/case-studies"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>View Case Studies</span>
              </motion.a>
            </div>
          </div>
        </motion.div>


      </div>
    </section>
  );
}