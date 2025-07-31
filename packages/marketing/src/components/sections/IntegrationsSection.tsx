'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

export function IntegrationsSection() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <section id="integrations" className="section-padding bg-secondary-50 dark:bg-secondary-800">
      <div className="container mx-auto container-padding">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h2 className="heading-lg text-secondary-900 dark:text-white mb-6">
            Integrations Coming Soon
          </h2>
          <p className="text-large text-secondary-600 dark:text-secondary-300">
            We're working on integrations with popular platforms.
          </p>
        </motion.div>
      </div>
    </section>
  );
}