'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  title: string;
  company: string;
  avatar: string;
  quote: string;
  rating?: number;
  featured?: boolean;
}

interface TestimonialCardProps {
  testimonial: Testimonial;
  featured?: boolean;
  className?: string;
  index?: number;
}

export function TestimonialCard({ 
  testimonial, 
  featured = false, 
  className = '',
  index = 0 
}: TestimonialCardProps) {
  const { name, title, company, avatar, quote, rating = 5 } = testimonial;

  // Generate initials as fallback
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className={`
        group relative bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl 
        border border-gray-200 dark:border-gray-700 transition-all duration-300
        ${featured ? 'ring-2 ring-blue-500 ring-opacity-50 sm:scale-105' : ''}
        ${className}
      `}
    >
      {/* Featured Badge */}
      {featured && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1 rounded-full text-sm font-medium">
            Featured Review
          </div>
        </div>
      )}

      {/* Quote Icon */}
      <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
        <Quote className="h-12 w-12 text-blue-600" />
      </div>

      {/* Rating Stars */}
      <div className="flex items-center space-x-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>

      {/* Quote Text */}
      <blockquote className="text-gray-700 dark:text-gray-300 text-base sm:text-lg leading-relaxed mb-6 font-medium">
        "{quote}"
      </blockquote>

      {/* Author Info */}
      <div className="flex items-center space-x-4">
        {/* Avatar */}
        <div className="relative">
          {avatar ? (
            <img
              src={avatar}
              alt={`${name} avatar`}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-100 dark:ring-blue-900"
              onError={(e) => {
                // Fallback to initials if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          
          {/* Fallback Avatar with Initials */}
          <div 
            className={`w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm ring-2 ring-blue-100 dark:ring-blue-900 ${
              avatar ? 'hidden' : 'flex'
            }`}
            style={{ display: avatar ? 'none' : 'flex' }}
          >
            {initials}
          </div>
        </div>

        {/* Name and Title */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 dark:text-white text-base truncate">
            {name}
          </h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm truncate">
            {title}
          </p>
        </div>


      </div>


    </motion.div>
  );
}

// Compact version for smaller spaces
export function TestimonialCardCompact({ 
  testimonial, 
  className = '',
  index = 0 
}: Omit<TestimonialCardProps, 'featured'>) {
  const { name, title, company, avatar, quote, rating = 5 } = testimonial;

  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`
        bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-lg 
        border border-gray-200 dark:border-gray-700 transition-all duration-300
        ${className}
      `}
    >
      {/* Header with Avatar and Info */}
      <div className="flex items-center space-x-3 mb-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {avatar ? (
            <img
              src={avatar}
              alt={`${name} avatar`}
              className="w-10 h-10 rounded-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          
          <div 
            className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs ${
              avatar ? 'hidden' : 'flex'
            }`}
            style={{ display: avatar ? 'none' : 'flex' }}
          >
            {initials}
          </div>
        </div>

        {/* Name and Company */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
            {name}
          </h4>
          <p className="text-gray-600 dark:text-gray-400 text-xs truncate">
            {title}
          </p>
        </div>

        {/* Rating */}
        <div className="flex items-center space-x-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-3 w-3 ${
                i < rating
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Quote */}
      <blockquote className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        "{quote}"
      </blockquote>
    </motion.div>
  );
}