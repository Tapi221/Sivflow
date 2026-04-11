FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV PORT=8080

# LibreOffice の描画品質はコンテナ内のフォントに強く依存する。
# 日本語/CJK フォントが無いとグリフ欠落（いわゆる豆腐: □）や置換でレイアウト崩れが起きるため、
# CJK を広くカバーするフォントを同梱する。
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  libreoffice-core \
  libreoffice-impress \
  libreoffice-writer \
  libreoffice-calc \
  libreoffice-common \
  poppler-utils \
  fontconfig \
  fonts-dejavu-core \
  fonts-noto-cjk \
  && fc-cache -f \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 8080
CMD ["npm", "start"]
