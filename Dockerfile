FROM node:24-alpine

WORKDIR /app

RUN npm install socket.io@4.8.3

COPY scripts ./scripts

ENV NODE_ENV=production
ENV PORT=3006

EXPOSE 3006

CMD ["node", "scripts/socket-server.js"]
