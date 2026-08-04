"use client";

import { useEffect, useMemo, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useLanCollaboration } from "./useLanCollaboration";

type WhiteboardProps = {
  boardId: string;
  collabServerUrl: string;
  snapshotUrl?: string;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
};

export default function Whiteboard({
  boardId,
  collabServerUrl,
  snapshotUrl,
  user,
}: WhiteboardProps) {
  const storageKey = useMemo(() => `whiteboard:${boardId}:scene`, [boardId]);
  const shareUrl = useMemo(() => window.location.href, []);
  const saveTimer = useMemo<{ current: number | null }>(() => ({ current: null }), []);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const {
    activePeers,
    broadcastPointer,
    broadcastScene,
    connectionState,
    setApi,
  } = useLanCollaboration({
    boardId,
    user,
  });

  useEffect(() => {
    window.localStorage.setItem("whiteboard:last-opened", boardId);
  }, [boardId]);

  useEffect(() => {
    const originalConsoleError = console.error;

    console.error = (...args) => {
      const message = args.map((arg) => String(arg)).join(" ");
      if (
        message.includes("actionPaste TypeError") ||
        message.includes("clipboardItems is not iterable")
      ) {
        return;
      }

      originalConsoleError(...args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, [saveTimer]);

  const initialData = useMemo(
    () => async () => {
      if (!snapshotUrl) {
        const localScene = window.localStorage.getItem(storageKey);
        return localScene ? JSON.parse(localScene) : null;
      }

      const response = await fetch(snapshotUrl);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      return {
        elements: data.snapshot?.elements || [],
        files: data.snapshot?.files || {},
      };
    },
    [snapshotUrl, storageKey],
  );

  const copyShareUrl = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = shareUrl;
        textarea.setAttribute("readonly", "true");
        textarea.style.left = "-9999px";
        textarea.style.position = "fixed";
        document.body.appendChild(textarea);
        textarea.select();

        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (!copied) {
          throw new Error("copy command failed");
        }
      }

      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("failed");
      window.prompt("复制失败，请手动复制链接", shareUrl);
    }
  };

  return (
    <section className="whiteboard-frame">
      <div className="collab-panel">
        <span className={`collab-dot collab-dot-${connectionState}`} />
        <span>{connectionState === "connected" ? "局域网协作" : "协作连接中"}</span>
        <strong>{activePeers} 在线</strong>
        <button
          type="button"
          onClick={copyShareUrl}
        >
          {copyState === "copied"
            ? "已复制"
            : copyState === "failed"
              ? "手动复制"
              : "复制分享链接"}
        </button>
      </div>
      <Excalidraw
        name={boardId}
        initialData={initialData}
        isCollaborating={connectionState === "connected"}
        excalidrawAPI={setApi}
        UIOptions={{
          canvasActions: {
            saveAsImage: true,
            export: { saveFileToDisk: true },
            loadScene: true,
            saveToActiveFile: true,
          },
        }}
        onChange={(elements, appState, files) => {
          window.localStorage.setItem(
            storageKey,
            JSON.stringify({
              elements,
              appState: {
                viewBackgroundColor: appState.viewBackgroundColor,
                gridSize: appState.gridSize,
              },
              files,
              updatedAt: new Date().toISOString(),
            }),
          );
          if (snapshotUrl) {
            if (saveTimer.current) {
              window.clearTimeout(saveTimer.current);
            }

            saveTimer.current = window.setTimeout(() => {
              fetch(snapshotUrl, {
                method: "PUT",
                headers: {
                  "content-type": "application/json",
                },
                body: JSON.stringify({
                  elements,
                  files,
                }),
              }).catch(() => {
                // The realtime room remains usable even if persistence is briefly unavailable.
              });
            }, 1500);
          }
          broadcastScene(elements, files);
        }}
        onPointerUpdate={broadcastPointer}
      />
      <input type="hidden" name="collabServerUrl" value={collabServerUrl} />
    </section>
  );
}
