import Link from "next/link";
import Script from "next/script";
import WhiteboardClient from "@/components/WhiteboardClient";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collabEnabled = process.env.NEXT_PUBLIC_ENABLE_COLLAB === "true";
  const collabServerUrl =
    process.env.NEXT_PUBLIC_COLLAB_SERVER_URL || "http://localhost:3002";

  return (
    <main className="board-shell">
      <Script id="excalidraw-asset-path" strategy="beforeInteractive">
        {`window.EXCALIDRAW_ASSET_PATH = window.location.origin + "/";`}
      </Script>

      <header className="board-topbar">
        <Link href="/" className="back-link" aria-label="返回白板列表">
          ←
        </Link>
        <div className="board-title">
          <strong>{id === "new" ? "未命名白板" : id}</strong>
          <span>{collabEnabled ? "协作已配置" : "本地编辑模式"}</span>
        </div>
        <code>{collabServerUrl}</code>
      </header>

      <WhiteboardClient
        boardId={id}
        collabServerUrl={collabServerUrl}
      />
    </main>
  );
}
