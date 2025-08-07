import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Blog - StorySlip',
    template: '%s | StorySlip Blog'
  },
  description: 'Learn about content management, web development, and best practices with StorySlip.',
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}