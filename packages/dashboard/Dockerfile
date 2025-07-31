# Multi-stage build for StorySlip Dashboard
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/dashboard/package.json ./packages/dashboard/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS development
COPY . .
EXPOSE 3000
CMD ["pnpm", "--filter", "@storyslip/dashboard", "dev"]

# Build stage
FROM base AS build

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL=https://api.storyslip.com
ARG VITE_WIDGET_URL=https://widget.storyslip.com
ARG VITE_APP_NAME=StorySlip
ARG VITE_APP_VERSION=1.0.0

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WIDGET_URL=$VITE_WIDGET_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION

# Build the application
RUN pnpm --filter "@storyslip/dashboard" build

# Production stage with Nginx
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY packages/dashboard/nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=build /app/packages/dashboard/dist /usr/share/nginx/html

# Copy security headers configuration
COPY packages/dashboard/security-headers.conf /etc/nginx/conf.d/security-headers.conf

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
  CMD curl -f http://localhost:8080/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]