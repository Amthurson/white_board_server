const { createServer } = require("node:http");
const { Server } = require("socket.io");

const port = Number(process.env.PORT || process.env.SOCKET_PORT || 3006);
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      clients: new Map(),
      files: {},
      scene: null,
    });
  }

  return rooms.get(roomId);
}

function presence(room) {
  return Array.from(room.clients.values()).map((client) => ({
    clientId: client.clientId,
    username: client.username,
    color: client.color,
  }));
}

const server = createServer((request, response) => {
  if (request.url === "/healthz" || request.url === "/") {
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end("ok");
    return;
  }

  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("not found");
});
const io = new Server(server, {
  cors: {
    origin: true,
  },
  maxHttpBufferSize: 100 * 1024 * 1024,
  pingTimeout: 60000,
  path: "/socket.io",
  transports: ["websocket"],
});

io.on("connection", (socket) => {
  let roomId = null;
  let clientId = null;

  socket.on("join-room", (payload, ack) => {
    roomId = String(payload?.roomId || "default");
    clientId = String(payload?.clientId || socket.id);

    const room = getRoom(roomId);
    room.clients.set(clientId, {
      clientId,
      color: payload?.color,
      socketId: socket.id,
      username: String(payload?.username || "Guest"),
    });

    socket.join(roomId);
    console.log(
      `join room=${roomId} client=${clientId} peers=${room.clients.size}`,
    );

    ack?.({
      clients: presence(room),
      files: room.files,
      scene: room.scene,
    });

    socket.to(roomId).emit("presence", {
      clients: presence(room),
    });
  });

  socket.on("scene-update", (payload) => {
    if (!roomId || !clientId) {
      return;
    }

    const room = getRoom(roomId);
    room.scene = payload?.elements || [];
    room.files = payload?.files || {};
    const fileCount = Object.keys(room.files).length;
    console.log(
      `scene-update room=${roomId} client=${clientId} elements=${room.scene.length} files=${fileCount}`,
    );

    socket.to(roomId).emit("scene-update", {
      elements: room.scene,
      files: room.files,
      senderId: clientId,
    });
  });

  socket.on("pointer-update", (payload) => {
    if (!roomId || !clientId) {
      return;
    }

    socket.to(roomId).emit("pointer-update", {
      button: payload?.button,
      color: payload?.color,
      pointer: payload?.pointer,
      senderId: clientId,
      username: payload?.username,
    });
  });

  socket.on("disconnect", (reason) => {
    if (!roomId || !clientId) {
      return;
    }

    const room = getRoom(roomId);
    room.clients.delete(clientId);
    socket.to(roomId).emit("presence", {
      clients: presence(room),
    });
    console.log(`disconnect room=${roomId} client=${clientId} reason=${reason}`);

    if (room.clients.size === 0) {
      rooms.delete(roomId);
    }
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Socket.IO collaboration listening on http://0.0.0.0:${port}/socket.io`);
});
