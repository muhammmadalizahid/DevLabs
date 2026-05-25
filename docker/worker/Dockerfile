FROM node:18-alpine
WORKDIR /app

# Install only production deps for worker
COPY package.json package-lock.json* ./
RUN npm ci --production

# Copy source
COPY . /app

ENV NODE_ENV=production

CMD ["node", "scripts/worker-redis.js"]
