'use client';


import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Code, 
  Zap, 
  Shield, 
  BarChart3,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { urls } from '@/config/app';



const features = [
  { icon: Zap, text: 'Lightning fast setup' },
  { icon: Code, text: 'Developer friendly' },
  { icon: Shield, text: 'Enterprise secure' },
  { icon: BarChart3, text: 'Advanced analytics' }
];

const stats = [
  { value: '50K+', label: 'Websites powered' },
  { value: '99.9%', label: 'Uptime guarantee' },
  { value: '<2s', label: 'Average load time' },
  { value: '24/7', label: 'Expert support' }
];

export function HeroSection() {
  return (
    <section className="relative pt-20 lg:pt-32 pb-0 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-hero-pattern opacity-5"></div>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-200 dark:bg-blue-900 rounded-full opacity-20 blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -150, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200 dark:bg-purple-900 rounded-full opacity-20 blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Centered Content Layout */}
        <div className="text-center max-w-6xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-6"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Trusted by 50,000+ websites</span>
          </motion.div>

          {/* Main Headline - Single header without subheader */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black font-lato leading-tight text-gray-900 dark:text-white mb-16 max-w-5xl mx-auto"
          >
            The CMS for the<br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Vibe-Coding Era</span>
          </motion.h1>



          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mb-20"
          >
            <Button
              href={urls.register}
              variant="primary"
              size="lg"
              className="group px-8 py-4 text-lg"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          {/* Large Tilted Demo Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1 }}
            className="relative max-w-5xl mx-auto mb-0"
          >
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-3xl blur-3xl opacity-20 transform scale-105"></div>
            
            {/* Floating Feature Icons */}
            {features.map((feature, index) => {
              const positions = [
                { top: '10%', left: '-8%', rotate: '-12deg' }, // Lightning fast setup - top left, off image
                { top: '25%', right: '-10%', rotate: '8deg' }, // Developer friendly - top right, off image  
                { bottom: '30%', left: '-6%', rotate: '15deg' }, // Enterprise secure - bottom left, off image
                { bottom: '15%', right: '-8%', rotate: '-8deg' } // Advanced analytics - bottom right, off image
              ];

              // Different animation types for each icon
              const animationVariants = [
                // Lightning fast - Zoom in with electric effect
                {
                  initial: { opacity: 0, scale: 0, rotate: -180, x: -100 },
                  animate: { opacity: 1, scale: 1, rotate: -12, x: 0 },
                  transition: { 
                    duration: 1.2, 
                    delay: 1.2,
                    type: "spring",
                    stiffness: 200,
                    damping: 15
                  }
                },
                // Developer friendly - Slide in from right with bounce
                {
                  initial: { opacity: 0, x: 200, y: -50, rotate: 180, scale: 0.3 },
                  animate: { opacity: 1, x: 0, y: 0, rotate: 8, scale: 1 },
                  transition: { 
                    duration: 1.5, 
                    delay: 1.4,
                    type: "spring",
                    stiffness: 120,
                    damping: 12
                  }
                },
                // Enterprise secure - Drop down with shield effect
                {
                  initial: { opacity: 0, y: -200, scale: 0.2, rotate: -90 },
                  animate: { opacity: 1, y: 0, scale: 1, rotate: 15 },
                  transition: { 
                    duration: 1.8, 
                    delay: 1.6,
                    type: "spring",
                    stiffness: 100,
                    damping: 10
                  }
                },
                // Advanced analytics - Spiral in with data effect
                {
                  initial: { opacity: 0, scale: 0, rotate: 360, x: 100, y: 100 },
                  animate: { opacity: 1, scale: 1, rotate: -8, x: 0, y: 0 },
                  transition: { 
                    duration: 2, 
                    delay: 1.8,
                    type: "spring",
                    stiffness: 150,
                    damping: 8
                  }
                }
              ];
              
              return (
                <motion.div
                  key={index}
                  initial={animationVariants[index].initial}
                  animate={animationVariants[index].animate}
                  transition={animationVariants[index].transition}
                  className="absolute z-20 hidden lg:flex flex-col items-center text-center"
                  style={positions[index]}
                >
                  <motion.div
                    whileHover={{ 
                      scale: 1.15, 
                      rotate: 0,
                      boxShadow: "0 20px 40px rgba(59, 130, 246, 0.3)"
                    }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                      boxShadow: [
                        "0 10px 20px rgba(59, 130, 246, 0.1)",
                        "0 15px 30px rgba(59, 130, 246, 0.2)",
                        "0 10px 20px rgba(59, 130, 246, 0.1)"
                      ]
                    }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 300,
                      boxShadow: {
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }
                    }}
                    className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-blue-100 dark:border-blue-800 flex items-center justify-center mb-3 backdrop-blur-sm cursor-pointer"
                  >
                    <motion.div
                      animate={{
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: index * 0.5
                      }}
                    >
                      <feature.icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </motion.div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                      delay: animationVariants[index].transition.delay + 0.3,
                      duration: 0.6,
                      type: "spring",
                      stiffness: 200
                    }}
                    whileHover={{ 
                      scale: 1.05,
                      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)"
                    }}
                    className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm whitespace-nowrap">
                      {feature.text}
                    </h3>
                  </motion.div>
                </motion.div>
              );
            })}
            
            {/* Tilted Dashboard Container */}
            <div 
              className="demo-tilt relative bg-white dark:bg-gray-800 rounded-3xl shadow-3d border border-gray-200 dark:border-gray-700 overflow-hidden"
              style={{
                minHeight: '500px'
              }}
            >
              {/* Browser Chrome */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex space-x-2">
                      <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                      <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                      <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="bg-white/20 rounded-lg px-4 py-2 text-sm text-white font-mono">
                      https://demo.storyslip.com
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-4 h-4 bg-white/30 rounded-full"></div>
                    <div className="w-4 h-4 bg-white/30 rounded-full"></div>
                    <div className="w-4 h-4 bg-white/30 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="p-8 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
                  {[
                    { label: 'Total Posts', value: '1,247', color: 'from-blue-500 to-blue-600', icon: '📝' },
                    { label: 'Page Views', value: '45.2K', color: 'from-green-500 to-green-600', icon: '👁️' },
                    { label: 'Active Users', value: '892', color: 'from-purple-500 to-purple-600', icon: '👥' }
                  ].map((stat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 1.2 + index * 0.1 }}
                      className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 text-center"
                    >
                      <div className="text-2xl mb-2">{stat.icon}</div>
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                        className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-1`}
                      >
                        {stat.value}
                      </motion.div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Content List */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Content</h4>
                  {[
                    { title: 'Getting Started with StorySlip', status: 'published', time: '2 hours ago' },
                    { title: 'Advanced Widget Customization', status: 'draft', time: '1 day ago' },
                    { title: 'API Integration Guide', status: 'scheduled', time: '3 days ago' }
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 1.5 + index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <motion.div
                          animate={{ 
                            backgroundColor: item.status === 'published' ? '#10b981' : 
                                           item.status === 'draft' ? '#f59e0b' : '#3b82f6'
                          }}
                          className="w-3 h-3 rounded-full"
                        />
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">{item.title}</h5>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{item.time}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        item.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        item.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {item.status}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>


          </motion.div>
        </div>
      </div>



      {/* Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-gray-400 dark:text-gray-600"
      >
        <div className="flex flex-col items-center space-y-2">
          <span className="text-sm">Scroll to explore</span>
          <div className="w-6 h-10 border-2 border-current rounded-full flex justify-center">
            <div className="w-1 h-3 bg-current rounded-full mt-2 animate-pulse" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}