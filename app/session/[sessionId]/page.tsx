import Link from "next/link";
import Script from "next/script";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import AppHeader from "@/components/AppHeader";
import BoardTitleEditor from "@/components/BoardTitleEditor";
import WhiteboardClient from "@/components/WhiteboardClient";
import { prisma } from "@/lib/prisma";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const authSession = await auth();

  if (!authSession?.user?.id) {
    redirect("/login");
  }

  const { sessionId } = await params;
  const boardSession = await prisma.boardSession.findFirst({
    where: {
      id: sessionId,
      board: {
        ownerId: authSession.user.id,
      },
    },
    include: {
      board: true,
    },
  });

  if (!boardSession) {
    notFound();
  }

  const collabServerUrl =
    process.env.NEXT_PUBLIC_COLLAB_SERVER_URL || "http://localhost:3006";

  return (
    <main className="board-shell">
      <Script id="excalidraw-asset-path" strategy="beforeInteractive">
        {`window.EXCALIDRAW_ASSET_PATH = window.location.origin + "/";`}
      </Script>

      <AppHeader
        leading={
          <Link href="/" className="back-link" aria-label="返回白板列表">
            ←
          </Link>
        }
        user={{
          name: authSession.user.name,
          email: authSession.user.email,
          image: authSession.user.image,
        }}
      >
        <BoardTitleEditor
          boardId={boardSession.board.id}
          initialTitle={boardSession.board.title}
          subtitle={boardSession.title}
        />
        <code>{collabServerUrl}</code>
      </AppHeader>

      <WhiteboardClient
        boardId={boardSession.id}
        collabServerUrl={collabServerUrl}
        snapshotUrl={`/api/sessions/${boardSession.id}/snapshot`}
        user={{
          id: authSession.user.id,
          name: authSession.user.name,
          email: authSession.user.email,
        }}
      />
    </main>
  );
}
