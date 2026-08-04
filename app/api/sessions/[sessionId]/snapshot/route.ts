import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const authSession = await auth();

  if (!authSession?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      snapshots: true,
      board: true,
    },
  });

  if (!boardSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const snapshot = boardSession.snapshots[0];

  return NextResponse.json({
    board: {
      id: boardSession.board.id,
      title: boardSession.board.title,
    },
    session: {
      id: boardSession.id,
      title: boardSession.title,
    },
    snapshot: {
      elements: snapshot?.elements || [],
      files: snapshot?.files || {},
      updatedAt: snapshot?.updatedAt || null,
    },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const authSession = await auth();

  if (!authSession?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const body = await request.json();
  const elements = Array.isArray(body?.elements) ? body.elements : [];
  const files = body?.files && typeof body.files === "object" ? body.files : {};

  const boardSession = await prisma.boardSession.findFirst({
    where: {
      id: sessionId,
      board: {
        ownerId: authSession.user.id,
      },
    },
    select: {
      id: true,
      boardId: true,
    },
  });

  if (!boardSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.boardSnapshot.upsert({
      where: {
        sessionId,
      },
      create: {
        sessionId,
        elements,
        files,
        savedById: authSession.user.id,
      },
      update: {
        elements,
        files,
        savedById: authSession.user.id,
      },
    }),
    prisma.boardEvent.create({
      data: {
        sessionId,
        userId: authSession.user.id,
        type: "scene-update",
        elements,
      },
    }),
    prisma.boardSession.update({
      where: {
        id: sessionId,
      },
      data: {
        updatedAt: new Date(),
      },
    }),
    prisma.board.update({
      where: {
        id: boardSession.boardId,
      },
      data: {
        updatedAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
