'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Github, 
  Twitter, 
  Linkedin, 
  Mail,
  ArrowRight,
  Heart
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

const footerLinks = {
  product: [
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Demo', href: '#demo' },
    { name: 'Integrations', href: '/integrations' },
    { name: 'API', href: '/api' }
  ],
  resources: [
    { name: 'Documentation', href: '/documentation' },
    { name: 'Examples', href: '/examples' },
    { name: 'Blog', href: '/blog' },
    { name: 'Community', href: '/community' },
    { name: 'Support', href: '/support' }
  ],
  company: [
    { name: 'About', href: '/about' },
    { name: 'Careers', href: '/careers' },
    { name: 'Contact', href: '/contact' },
    { name: 'Privacy', href: '/privacy' },
    { name: 'Terms', href: '/terms' }
  ]
};

const socialLinks = [
  { name: 'GitHub', href: 'https://github.com/storyslip', icon: Github },
  { name: 'Twitter', href: 'https://twitter.com/storyslip', icon: Twitter },
  { name: 'LinkedIn', href: 'https://linkedin.com/company/storyslip', icon: Linkedin },
  { name: 'Email', href: 'mailto:hello@storyslip.com', icon: Mail }
];

export function Footer() {
  return (
    <footer className="bg-secondary-900 text-white">
      {/* Newsletter Section */}
      <div className="border-b border-secondary-800">
        <div className="container mx-auto container-padding py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl font-bold font-lato mb-4">
              Stay updated with StorySlip
            </h3>
            <p className="text-secondary-300 mb-6">
              Get the latest updates, tips, and insights delivered to your inbox.
            </p>
            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-secondary-800 border border-secondary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <motion.button
                type="submit"
                className="btn-primary flex items-center justify-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>Subscribe</span>
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto container-padding py-12">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-6">
              <Logo className="h-8 w-8" />
              <span className="text-xl font-bold">StorySlip</span>
            </Link>
            <p className="text-secondary-300 mb-6 max-w-md">
              The modern content management system that makes it easy to create, 
              manage, and deliver amazing content experiences.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-secondary-800 hover:bg-secondary-700 rounded-lg flex items-center justify-center transition-colors duration-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={social.name}
                >
                  <social.icon className="h-5 w-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="font-semibold font-lato mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-secondary-300 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold font-lato mb-4">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-secondary-300 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold font-lato mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-secondary-300 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-secondary-800">
        <div className="container mx-auto container-padding py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-secondary-400 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} StorySlip. All rights reserved.
            </div>
            <div className="flex items-center space-x-1 text-secondary-400 text-sm">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-red-500" />
              <span>for content creators everywhere</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}