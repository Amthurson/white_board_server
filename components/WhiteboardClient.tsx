"use client";

import dynamic from "next/dynamic";

const Whiteboard = dynamic(() => import("@/components/Whiteboard"), {
  ssr: false,
  loading: () => <div className="board-loading">白板加载中...</div>,
});

type WhiteboardClientProps = {
  boardId: string;
  collabServerUrl: string;
};

export default function WhiteboardClient(props: WhiteboardClientProps) {
  return <Whiteboard {...props} />;
}
