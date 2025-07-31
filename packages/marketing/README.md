# StorySlip Marketing Website

A modern, responsive marketing website built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- **Modern Design**: Clean, professional design with smooth animations
- **Responsive**: Optimized for all devices and screen sizes
- **Performance**: Built with Next.js 14 for optimal performance
- **SEO Optimized**: Comprehensive SEO setup with meta tags and structured data
- **Dark Mode**: Built-in dark/light theme support
- **Interactive Demos**: Live code examples and widget previews
- **Analytics**: Google Analytics integration for tracking
- **Accessibility**: WCAG compliant with proper ARIA labels

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Code Highlighting**: React Syntax Highlighter
- **Theme**: Next Themes

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

3. Configure environment variables in `.env.local`:
```env
NEXT_PUBLIC_SITE_URL=https://storyslip.com
NEXT_PUBLIC_GA_MEASUREMENT_ID=your-ga-id
GOOGLE_SITE_VERIFICATION=your-verification-code
```

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) to view the website.

### Building for Production

Build the application:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/
│   ├── layout/            # Layout components
│   │   ├── Header.tsx     # Navigation header
│   │   └── Footer.tsx     # Site footer
│   ├── sections/          # Page sections
│   │   ├── HeroSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── DemoSection.tsx
│   │   ├── IntegrationsSection.tsx
│   │   ├── TestimonialsSection.tsx
│   │   ├── PricingSection.tsx
│   │   └── CTASection.tsx
│   ├── ui/                # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Logo.tsx
│   │   ├── CodeDemo.tsx
│   │   └── WidgetPreview.tsx
│   ├── providers/         # Context providers
│   │   └── ThemeProvider.tsx
│   └── Analytics.tsx      # Analytics component
└── lib/                   # Utility functions
```

## Key Components

### HeroSection
- Compelling value proposition
- Interactive code demos
- Live widget preview
- Call-to-action buttons
- Performance statistics

### FeaturesSection
- Feature grid with icons
- Benefit highlights
- Hover animations
- Progressive disclosure

### DemoSection
- Multi-framework code examples
- Interactive widget preview
- Device responsiveness testing
- Integration steps

### PricingSection
- Three-tier pricing structure
- Feature comparison
- Popular plan highlighting
- Clear call-to-actions

## Customization

### Themes
The website supports custom themes through Tailwind CSS. Modify `tailwind.config.js` to customize:

- Colors
- Typography
- Spacing
- Animations

### Content
Update content in the respective component files:

- Hero content: `HeroSection.tsx`
- Features: `FeaturesSection.tsx`
- Pricing: `PricingSection.tsx`

### Styling
Global styles are in `app/globals.css`. Component-specific styles use Tailwind classes.

## Performance Optimizations

- **Image Optimization**: Next.js automatic image optimization
- **Code Splitting**: Automatic code splitting with Next.js
- **Lazy Loading**: Components load on scroll
- **Bundle Analysis**: Built-in bundle analyzer
- **Caching**: Optimized caching headers

## SEO Features

- **Meta Tags**: Comprehensive meta tag setup
- **Open Graph**: Social media sharing optimization
- **Structured Data**: JSON-LD structured data
- **Sitemap**: Automatic sitemap generation
- **Robots.txt**: Search engine crawling instructions

## Analytics

The website includes Google Analytics integration:

1. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` in environment variables
2. Analytics automatically track:
   - Page views
   - Button clicks
   - Form submissions
   - Video plays
   - File downloads

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The website can be deployed to any platform that supports Next.js:

- Netlify
- AWS Amplify
- Railway
- DigitalOcean App Platform

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

- Email: support@storyslip.com
- Documentation: https://docs.storyslip.com
- Community: https://community.storyslip.com