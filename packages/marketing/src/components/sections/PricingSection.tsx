'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { urls } from '@/config/app';

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    description: 'Perfect for personal projects and small websites',
    features: [
      'Up to 1,000 page views/month',
      '1 website',
      'Basic analytics',
      'Community support',
      'Standard themes'
    ],
    cta: 'Get Started',
    href: urls.register,
    popular: false
  },
  {
    name: 'Professional',
    price: '$29',
    period: '/month',
    description: 'Ideal for growing businesses and content creators',
    features: [
      'Up to 50,000 page views/month',
      '5 websites',
      'Advanced analytics',
      'Priority support',
      'Custom themes',
      'Team collaboration',
      'API access'
    ],
    cta: 'Start Free Trial',
    href: urls.registerWithPlan('pro'),
    popular: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large organizations with specific needs',
    features: [
      'Unlimited page views',
      'Unlimited websites',
      'White-label solution',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'Advanced security'
    ],
    cta: 'Contact Sales',
    href: urls.contactSales,
    popular: false
  }
];

export function PricingSection() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <section id="pricing" className="section-padding bg-secondary-50 dark:bg-secondary-800">
      <div className="container mx-auto container-padding">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="heading-lg font-lato font-black text-secondary-900 dark:text-white mb-6">
            Simple, transparent pricing
          </h2>
          <p className="text-large text-secondary-600 dark:text-secondary-300 max-w-3xl mx-auto">
            Choose the plan that's right for you. All plans include our core features 
            with no hidden fees or surprise charges.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className={`relative card p-8 ${
                plan.popular 
                  ? 'ring-2 ring-primary-500 scale-105' 
                  : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                    <Star className="h-4 w-4" />
                    <span>Most Popular</span>
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold font-lato text-secondary-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-secondary-900 dark:text-white">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-secondary-600 dark:text-secondary-400">
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className="text-secondary-600 dark:text-secondary-300">
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-secondary-700 dark:text-secondary-300">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                href={plan.href}
                variant={plan.popular ? 'primary' : 'outline'}
                className="w-full"
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}