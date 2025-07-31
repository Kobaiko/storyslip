# Multi-stage build for StorySlip Widget CDN
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/widget/package.json ./packages/widget/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS development
COPY . .
EXPOSE 3002
CMD ["pnpm", "--filter", "@storyslip/widget", "dev"]

# Build stage
FROM base AS build

# Copy source code
COPY . .

# Build arguments for environment variables
ARG WIDGET_API_URL=https://api.storyslip.com
ARG WIDGET_CDN_URL=https://widget.storyslip.com
ARG WIDGET_VERSION=1.0.0

# Set environment variables for build
ENV WIDGET_API_URL=$WIDGET_API_URL
ENV WIDGET_CDN_URL=$WIDGET_CDN_URL
ENV WIDGET_VERSION=$WIDGET_VERSION

# Build the widget
RUN pnpm --filter "@storyslip/widget" build

# Production stage with Nginx for CDN
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx configuration for CDN
COPY packages/widget/nginx-cdn.conf /etc/nginx/nginx.conf

# Copy built widget files
COPY --from=build /app/packages/widget/dist /usr/share/nginx/html

# Copy CORS and caching configuration
COPY packages/widget/cors-headers.conf /etc/nginx/conf.d/cors-headers.conf
COPY packages/widget/cache-headers.conf /etc/nginx/conf.d/cache-headers.conf

# Create nginx user and set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/embed.js || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]