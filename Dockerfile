FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY scripts ./scripts

ENV NODE_ENV=production
ENV PORT=3006

EXPOSE 3006

CMD ["npm", "run", "collab"]
