"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

function getSafeRedirectPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return "/";
  }

  if (value.startsWith("//")) {
    return "/";
  }

  return value;
}

export async function signInWithGoogle(formData?: FormData) {
  const redirectTo = getSafeRedirectPath(formData?.get("callbackUrl") || null);

  await signIn("google", { redirectTo });
}

export async function signOutCurrentUser() {
  await signOut({ redirectTo: "/login" });
}

export async function createBoardSession() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const now = new Date();
  const board = await prisma.board.create({
    data: {
      ownerId: session.user.id,
      title: `白板 ${now.toLocaleString("zh-CN", { hour12: false })}`,
      sessions: {
        create: {
          createdById: session.user.id,
          title: "默认会话",
          snapshots: {
            create: {
              elements: [],
              files: {},
              savedById: session.user.id,
            },
          },
        },
      },
    },
    include: {
      sessions: {
        select: {
          id: true,
        },
      },
    },
  });

  redirect(`/session/${board.sessions[0].id}`);
}

export async function updateBoardTitle(boardId: string, title: string) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const nextTitle = title.trim();

  if (!nextTitle) {
    return {
      ok: false,
      message: "画布名不能为空",
    };
  }

  if (nextTitle.length > 80) {
    return {
      ok: false,
      message: "画布名不能超过 80 个字符",
    };
  }

  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      ownerId: session.user.id,
    },
    select: {
      sessions: {
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!board) {
    return {
      ok: false,
      message: "没有权限修改这个画布",
    };
  }

  await prisma.board.update({
    where: {
      id: boardId,
    },
    data: {
      title: nextTitle,
    },
  });

  revalidatePath("/");

  for (const boardSession of board.sessions) {
    revalidatePath(`/session/${boardSession.id}`);
  }

  return {
    ok: true,
    title: nextTitle,
  };
}
