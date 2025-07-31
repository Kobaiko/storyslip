'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  animated?: boolean;
}

export function Logo({ className = 'h-8 w-8', animated = false }: LogoProps) {
  const logoVariants = {
    initial: { scale: 1, rotate: 0 },
    hover: { scale: 1.1, rotate: 2 },
    tap: { scale: 0.95 }
  };

  const LogoImage = () => (
    <Image
      src="/logo.png"
      alt="StorySlip Logo"
      width={32}
      height={32}
      className={className}
      priority
    />
  );

  if (animated) {
    return (
      <motion.div
        variants={logoVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        className="cursor-pointer"
      >
        <LogoImage />
      </motion.div>
    );
  }

  return <LogoImage />;
}

// Alternative text-based logo
export function TextLogo({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`font-bold text-2xl gradient-text-primary ${className}`}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      StorySlip
    </motion.div>
  );
}

// Icon-only version for smaller spaces
export function LogoIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="StorySlip Icon"
      width={24}
      height={24}
      className={className}
    />
  );
}