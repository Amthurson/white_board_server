# Whiteboard Service

Next.js product shell for an Excalidraw-based LAN whiteboard service.

## Structure

- `app/`: App Router pages for the board list and board editor.
- `components/Whiteboard.tsx`: Client-only Excalidraw integration.
- `components/useLanCollaboration.ts`: Socket.IO room collaboration client.
- `scripts/socket-server.js`: Standalone Socket.IO collaboration relay.
- `docker-compose.room.yml`: Independent `excalidraw-room` service template for future official-room deployment.

## Local Development

Install dependencies from this directory:

```bash
npm install
```

Run the Next.js app:

```bash
npm run dev
```

Open `http://localhost:3005`.

For LAN HTTPS testing, generate and trust a local development certificate:

```bash
npm run cert:local
npm run dev:https
```

Then open `https://<your-lan-ip>:3005`, for example `https://192.168.31.99:3005`.

Start the LAN collaboration WebSocket service in a second terminal:

```bash
npm run collab
```

Devices on the same network can open the same board URL to see each other's cursor and scene updates.

## Collaboration Service

The local collaboration service listens on port `3006` and relays Socket.IO messages between clients in the same board room. For LAN testing, run both commands:

```bash
npm run dev
npm run collab
```

## Vercel Deployment

The Next.js frontend can be deployed to Vercel as a normal app.

The collaboration server in `scripts/socket-server.js` is a long-running Socket.IO process, so deploy it separately on a VPS, Railway, Fly.io, or another always-on Node host. Set the frontend to connect to that host before productionizing the app. Vercel should only host the Next.js frontend unless the collaboration layer is rewritten for Vercel Functions/WebSocket upgrades.

If you want to move to the full official Excalidraw collaboration workflow, deploy or adapt `excalidraw-room`:

```bash
docker compose -f docker-compose.room.yml up -d
```
