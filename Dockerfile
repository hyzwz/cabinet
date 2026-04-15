FROM node:20-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ git ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

RUN mkdir -p .next/standalone/.next && cp -R .next/static .next/standalone/.next/static

# Remove any data dir created during build (token files, etc.)
# Real data comes from volume mount at runtime
RUN rm -rf data .next/standalone/data

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    CABINET_APP_PORT=3000

EXPOSE 3000

CMD ["node", ".next/standalone/server.js"]
