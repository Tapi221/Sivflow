FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV PORT=8080

# LibreOffice の PPTX→PDF 変換はコンテナ内のフォントに依存して置換・描画する。
# 日本語/CJK・数式フォントが不足すると、欠落（豆腐）や置換により数式記号が崩れる。
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
  fonts-stix \
  fonts-lmodern \
  && fc-cache -f \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 8080
CMD ["npm", "start"]
