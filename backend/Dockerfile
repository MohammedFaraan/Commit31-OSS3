FROM node:20-alpine

WORKDIR /app

# Set production mode
ENV NODE_ENV=production

# Copy dependency files first (better caching)
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Use non-root user
USER node

EXPOSE 5000

# Start production server
CMD ["npm", "start"]