"use client";

import dynamic from "next/dynamic";

const Whiteboard = dynamic(() => import("@/components/Whiteboard"), {
  ssr: false,
  loading: () => <div className="board-loading">白板加载中...</div>,
});

type WhiteboardClientProps = {
  boardId: string;
  collabServerUrl: string;
  snapshotUrl?: string;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
};

export default function WhiteboardClient(props: WhiteboardClientProps) {
  return <Whiteboard {...props} />;
}
