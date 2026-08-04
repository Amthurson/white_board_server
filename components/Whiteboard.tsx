"use client";

import { useEffect, useMemo } from "react";
import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
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
  const saveTimer = useMemo<{ current: number | null }>(() => ({ current: null }), []);
  const {
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

  return (
    <section className="whiteboard-frame">
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
      >
        <MainMenu>
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.DefaultItems.SaveToActiveFile />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.SearchMenu />
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.Separator />
          <MainMenu.DefaultItems.ToggleTheme />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
      </Excalidraw>
      <input type="hidden" name="collabServerUrl" value={collabServerUrl} />
    </section>
  );
}
