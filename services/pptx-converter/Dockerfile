FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  libreoffice-core \
  libreoffice-impress \
  libreoffice-writer \
  libreoffice-calc \
  libreoffice-common \
  poppler-utils \
  fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 8080
CMD ["npm", "start"]
