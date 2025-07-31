'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  Zap, 
  Code, 
  Shield, 
  BarChart3, 
  Palette, 
  Globe, 
  Smartphone, 
  Users,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast Setup',
    description: 'Get your content management system up and running in under 5 minutes with our simple integration process.',
    benefits: ['One-line integration', 'Auto-configuration', 'Instant deployment'],
    color: 'from-yellow-400 to-orange-500'
  },
  {
    icon: Code,
    title: 'Developer Friendly',
    description: 'Built by developers, for developers. Clean APIs, comprehensive documentation, and flexible customization.',
    benefits: ['RESTful APIs', 'SDK support', 'Webhook integration'],
    color: 'from-blue-400 to-indigo-500'
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-level security with end-to-end encryption, SOC 2 compliance, and advanced access controls.',
    benefits: ['SOC 2 certified', 'GDPR compliant', '99.9% uptime SLA'],
    color: 'from-green-400 to-emerald-500'
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Deep insights into content performance, user engagement, and conversion metrics with real-time reporting.',
    benefits: ['Real-time metrics', 'Custom dashboards', 'Export capabilities'],
    color: 'from-purple-400 to-pink-500'
  },
  {
    icon: Palette,
    title: 'Complete Customization',
    description: 'Match your brand perfectly with unlimited theming options, custom CSS, and white-label solutions.',
    benefits: ['Custom themes', 'Brand matching', 'White-label ready'],
    color: 'from-pink-400 to-rose-500'
  },
  {
    icon: Globe,
    title: 'Global CDN',
    description: 'Lightning-fast content delivery worldwide with our global CDN network and edge caching.',
    benefits: ['Global edge network', 'Smart caching', 'Auto-optimization'],
    color: 'from-cyan-400 to-blue-500'
  },
  {
    icon: Smartphone,
    title: 'Mobile Optimized',
    description: 'Perfect responsive design that works flawlessly across all devices and screen sizes.',
    benefits: ['Responsive design', 'Touch optimized', 'Progressive web app'],
    color: 'from-indigo-400 to-purple-500'
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Powerful team features with role-based permissions, workflow management, and real-time collaboration.',
    benefits: ['Role management', 'Workflow automation', 'Team analytics'],
    color: 'from-emerald-400 to-teal-500'
  }
];

export function FeaturesSection() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <section id="features" className="section-padding bg-secondary-50 dark:bg-secondary-800">
      <div className="container mx-auto container-padding">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center space-x-2 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <CheckCircle className="h-4 w-4" />
            <span>Powerful Features</span>
          </div>
          
          <h2 className="heading-lg font-lato font-black text-secondary-900 dark:text-white mb-6">
            Everything you need to manage content{' '}
            <span className="gradient-text-primary">effortlessly</span>
          </h2>
          
          <p className="text-large text-secondary-600 dark:text-secondary-300 max-w-3xl mx-auto">
            StorySlip combines powerful content management capabilities with developer-friendly tools 
            and enterprise-grade security to deliver the perfect solution for modern websites.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className="group"
            >
              <div className="card-hover p-6 h-full">
                {/* Icon */}
                <div className="relative mb-6">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} p-3 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className={`absolute inset-0 w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} opacity-20 blur-lg group-hover:opacity-40 transition-opacity duration-300`} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-secondary-900 dark:text-white mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300">
                  {feature.title}
                </h3>
                
                <p className="text-secondary-600 dark:text-secondary-300 mb-4 leading-relaxed">
                  {feature.description}
                </p>

                {/* Benefits */}
                <ul className="space-y-2 mb-6">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-center space-x-2 text-sm text-secondary-600 dark:text-secondary-400">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>

                {/* Learn More Link */}
                <div className="flex items-center text-primary-600 dark:text-primary-400 font-medium text-sm group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors duration-300">
                  <span>Learn more</span>
                  <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-center mt-16"
        >
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 bg-white dark:bg-secondary-700 rounded-2xl shadow-lg border border-secondary-200 dark:border-secondary-600">
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-bold font-lato text-secondary-900 dark:text-white mb-2">
                Ready to experience these features?
              </h3>
              <p className="text-secondary-600 dark:text-secondary-300">
                Start your free trial today and see the difference StorySlip can make.
              </p>
            </div>
            <div className="flex-shrink-0">
              <motion.a
                href="/signup"
                className="btn-primary inline-flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>Start Free Trial</span>
                <ArrowRight className="h-4 w-4" />
              </motion.a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}