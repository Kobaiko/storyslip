import type { Metadata } from 'next';
import { Inter, Outfit, JetBrains_Mono, Playfair_Display, Space_Grotesk } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Analytics } from '@/components/Analytics';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter'
});

const outfit = Outfit({ 
  subsets: ['latin'],
  variable: '--font-outfit'
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-jetbrains-mono'
});

const playfairDisplay = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair-display'
});

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space-grotesk'
});

export const metadata: Metadata = {
  title: {
    default: 'StorySlip - Effortless Content Management for Modern Websites',
    template: '%s | StorySlip'
  },
  description: 'Transform your website with StorySlip\'s powerful, lightweight content management system. Easy integration, beautiful widgets, and comprehensive analytics.',
  keywords: [
    'content management',
    'CMS',
    'website widgets',
    'content delivery',
    'web development',
    'JavaScript widgets',
    'content publishing',
    'website integration'
  ],
  authors: [{ name: 'StorySlip Team' }],
  creator: 'StorySlip',
  publisher: 'StorySlip',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://storyslip.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'StorySlip - Effortless Content Management for Modern Websites',
    description: 'Transform your website with StorySlip\'s powerful, lightweight content management system. Easy integration, beautiful widgets, and comprehensive analytics.',
    siteName: 'StorySlip',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'StorySlip - Content Management Made Simple',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StorySlip - Effortless Content Management for Modern Websites',
    description: 'Transform your website with StorySlip\'s powerful, lightweight content management system. Easy integration, beautiful widgets, and comprehensive analytics.',
    images: ['/og-image.png'],
    creator: '@storyslip',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon.png" />
        <link rel="shortcut icon" href="/favicon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#8B5CF6" />
        <meta name="msapplication-TileColor" content="#8B5CF6" />
        <meta name="msapplication-TileImage" content="/favicon.png" />
      </head>
      <body className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable} ${playfairDisplay.variable} ${spaceGrotesk.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}