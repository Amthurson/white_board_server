"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  BinaryFiles,
  Collaborator,
  ExcalidrawImperativeAPI,
  SocketId,
} from "@excalidraw/excalidraw/types";

type ConnectionState = "connecting" | "connected" | "disconnected";

type LanCollaborationOptions = {
  boardId: string;
};

type PointerPayload = {
  pointer: {
    x: number;
    y: number;
    tool: "pointer" | "laser";
  };
  button: "down" | "up";
};

const remoteSceneBroadcastPauseMs = 1000;
const sceneBroadcastDebounceMs = 500;

const colors = [
  { background: "#d9f99d", stroke: "#3f6212" },
  { background: "#bae6fd", stroke: "#075985" },
  { background: "#fecdd3", stroke: "#9f1239" },
  { background: "#fde68a", stroke: "#92400e" },
  { background: "#ddd6fe", stroke: "#5b21b6" },
];

function createClientId() {
  const existing = window.localStorage.getItem("whiteboard:client-id");
  if (existing) {
    return existing;
  }

  const id =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `client-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2)}`;
  window.localStorage.setItem("whiteboard:client-id", id);
  return id;
}

function createUsername() {
  const existing = window.localStorage.getItem("whiteboard:username");
  if (existing) {
    return existing;
  }

  const name = `局域网用户-${Math.floor(Math.random() * 900 + 100)}`;
  window.localStorage.setItem("whiteboard:username", name);
  return name;
}

function getCollaborationServerUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_COLLAB_SERVER_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  return `${window.location.protocol}//${window.location.hostname}:3006`;
}

function getElementId(element: unknown) {
  const record = typeof element === "object" && element
    ? (element as Record<string, unknown>)
    : null;

  return record && "id" in record
    ? String(record.id)
    : null;
}

function getElementNumber(element: unknown, key: "updated" | "version" | "versionNonce") {
  const record = typeof element === "object" && element
    ? (element as Record<string, unknown>)
    : null;

  return record && key in record
    ? Number(record[key])
    : 0;
}

function isNewerElement(nextElement: unknown, currentElement: unknown) {
  if (!currentElement) {
    return true;
  }

  const nextVersion = getElementNumber(nextElement, "version");
  const currentVersion = getElementNumber(currentElement, "version");

  if (nextVersion !== currentVersion) {
    return nextVersion > currentVersion;
  }

  const nextUpdated = getElementNumber(nextElement, "updated");
  const currentUpdated = getElementNumber(currentElement, "updated");

  if (nextUpdated !== currentUpdated) {
    return nextUpdated > currentUpdated;
  }

  return (
    getElementNumber(nextElement, "versionNonce") >
    getElementNumber(currentElement, "versionNonce")
  );
}

function mergeElements(currentElements: readonly unknown[], incomingElements: unknown) {
  const incoming = Array.isArray(incomingElements) ? incomingElements : [];
  const mergedById = new Map<string, unknown>();
  const order: string[] = [];

  for (const element of currentElements) {
    const id = getElementId(element);
    if (!id) {
      continue;
    }

    mergedById.set(id, element);
    order.push(id);
  }

  for (const element of incoming) {
    const id = getElementId(element);
    if (!id) {
      continue;
    }

    if (!mergedById.has(id)) {
      order.push(id);
    }

    if (isNewerElement(element, mergedById.get(id))) {
      mergedById.set(id, element);
    }
  }

  return order.map((id) => mergedById.get(id)).filter(Boolean);
}

export function useLanCollaboration({ boardId }: LanCollaborationOptions) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [activePeers, setActivePeers] = useState(0);
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const applyingRemoteSceneRef = useRef(false);
  const canBroadcastSceneRef = useRef(false);
  const collaboratorsRef = useRef(new Map<SocketId, Collaborator>());
  const pendingInitialSceneRef = useRef<{
    files: unknown;
    scene: unknown;
  } | null>(null);
  const sceneBroadcastTimerRef = useRef<number | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const identity = useMemo(() => {
    const clientId = createClientId();
    const color =
      colors[
        Array.from(clientId).reduce(
          (sum, char) => sum + char.charCodeAt(0),
          0,
        ) % colors.length
      ];

    return {
      clientId,
      username: createUsername(),
      color,
    };
  }, []);

  const updateCollaborators = useCallback(() => {
    apiRef.current?.updateScene({
      collaborators: new Map(collaboratorsRef.current),
    });
  }, []);

  const markRemoteSceneApplied = useCallback(() => {
    window.setTimeout(() => {
      applyingRemoteSceneRef.current = false;
    }, remoteSceneBroadcastPauseMs);
  }, []);

  const applyRemoteScene = useCallback(
    (scene: unknown, files: unknown) => {
      if (!apiRef.current) {
        pendingInitialSceneRef.current = { scene, files };
        return;
      }

      applyingRemoteSceneRef.current = true;
      const localScene = apiRef.current.getSceneElementsIncludingDeleted();
      const mergedScene = mergeElements(localScene, scene);
      apiRef.current.updateScene({
        elements: mergedScene as Parameters<
          ExcalidrawImperativeAPI["updateScene"]
        >[0]["elements"],
        appState: {
          collaborators: new Map(collaboratorsRef.current),
        },
      });

      if (files) {
        apiRef.current.addFiles(Object.values(files));
      }

      markRemoteSceneApplied();
    },
    [markRemoteSceneApplied],
  );

  useEffect(() => {
    const socket = io(getCollaborationServerUrl(), {
      path: "/socket.io",
      reconnection: true,
      transports: ["websocket"],
    });

    socketRef.current = socket;
    setConnectionState("connecting");

    socket.on("connect", () => {
      socket.emit(
        "join-room",
        {
          roomId: boardId,
          clientId: identity.clientId,
          username: identity.username,
          color: identity.color,
        },
        (message: {
          clients?: unknown[];
          files?: unknown;
          scene?: unknown;
        }) => {
          setActivePeers(Math.max(0, (message.clients?.length || 1) - 1));

          if (message.scene) {
            applyRemoteScene(message.scene, message.files);
          }

          setConnectionState("connected");
          window.setTimeout(() => {
            canBroadcastSceneRef.current = true;
          }, 1000);
        },
      );
    });

    socket.on("disconnect", () => {
      setConnectionState("disconnected");
      setActivePeers(0);
      collaboratorsRef.current = new Map();
      updateCollaborators();
    });

    socket.on("connect_error", () => {
      setConnectionState("disconnected");
    });

    socket.on("presence", (message: { clients?: unknown[] }) => {
      setActivePeers(Math.max(0, (message.clients?.length || 1) - 1));
    });

    socket.on(
      "scene-update",
      (message: { elements: unknown; files: unknown }) => {
        applyRemoteScene(message.elements, message.files);
      },
    );

    socket.on(
      "pointer-update",
      (message: {
        button: "down" | "up";
        color: Collaborator["color"];
        pointer: Collaborator["pointer"];
        senderId: string;
        username: string;
      }) => {
        const socketId = message.senderId as SocketId;
        collaboratorsRef.current.set(socketId, {
          socketId,
          username: message.username,
          color: message.color,
          pointer: message.pointer,
          button: message.button,
        });
        updateCollaborators();
      },
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    applyRemoteScene,
    boardId,
    identity.clientId,
    identity.color,
    identity.username,
    updateCollaborators,
  ]);

  const setApi = useCallback(
    (api: ExcalidrawImperativeAPI | null) => {
      apiRef.current = api;

      if (api && pendingInitialSceneRef.current) {
        const pending = pendingInitialSceneRef.current;
        pendingInitialSceneRef.current = null;
        applyRemoteScene(pending.scene, pending.files);
      }
    },
    [applyRemoteScene],
  );

  const broadcastScene = useCallback(
    (elements: readonly unknown[], files: BinaryFiles) => {
      if (applyingRemoteSceneRef.current || !canBroadcastSceneRef.current) {
        return;
      }

      if (elements.length === 0) {
        return;
      }

      if (sceneBroadcastTimerRef.current) {
        window.clearTimeout(sceneBroadcastTimerRef.current);
      }

      sceneBroadcastTimerRef.current = window.setTimeout(() => {
        const api = apiRef.current;
        const sceneElements = api?.getSceneElementsIncludingDeleted() || elements;

        socketRef.current?.emit("scene-update", {
          roomId: boardId,
          clientId: identity.clientId,
          elements: sceneElements,
          files,
        });
      }, sceneBroadcastDebounceMs);
    },
    [boardId, identity.clientId],
  );

  const broadcastPointer = useCallback(
    (payload: PointerPayload) => {
      socketRef.current?.emit("pointer-update", {
        roomId: boardId,
        clientId: identity.clientId,
        username: identity.username,
        color: identity.color,
        pointer: payload.pointer,
        button: payload.button,
      });
    },
    [boardId, identity],
  );

  return {
    activePeers,
    broadcastPointer,
    broadcastScene,
    connectionState,
    setApi,
  };
}
